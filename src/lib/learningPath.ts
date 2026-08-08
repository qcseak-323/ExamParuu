import { getExamContent } from "./content";
import { shuffle } from "./shuffle";
import type {
  Challenge,
  Flashcard,
  LearningModule,
  LearningPath,
  Question,
} from "./types";

/**
 * The learning path: Microsoft Learn's structure, this project's content, and
 * a checkpoint every few cards.
 *
 * The pacing rule is the whole point. A module is not "read twelve cards" —
 * it is read CARDS_PER_BITE, prove it, read the next few, prove that. Nobody
 * bounces off three cards, and a challenge landing every ninety seconds is
 * what keeps a twenty-minute module from becoming a wall of text that gets
 * abandoned at card four.
 *
 * Every challenge is derived from content the exam already ships. See the
 * `Challenge` docstring in types.ts for why that mattered enough to shape the
 * formats around it.
 */

/** How many cards a trainer reads before a checkpoint interrupts. */
export const CARDS_PER_BITE = 3;

/** Distractor count for the match-up grid, capped so it stays draggable. */
const MATCH_SIZE = 4;
const MULTI_SIZE = 5;

export function getLearningPaths(examCode: string): LearningPath[] {
  return getExamContent(examCode)?.learningPath.paths ?? [];
}

export function getLearningPath(
  examCode: string,
  pathId: string,
): LearningPath | undefined {
  return getLearningPaths(examCode).find((p) => p.id === pathId);
}

export function getModule(
  examCode: string,
  pathId: string,
  moduleId: string,
): LearningModule | undefined {
  return getLearningPath(examCode, pathId)?.modules.find(
    (m) => m.id === moduleId,
  );
}

/** The cards a module teaches, in authored order. */
export function moduleCards(examCode: string, mod: LearningModule): Flashcard[] {
  const all = getExamContent(examCode)?.flashcards ?? [];
  const byId = new Map(all.map((c) => [c.id, c]));
  return mod.cardIds.map((id) => byId.get(id)).filter((c): c is Flashcard => !!c);
}

/** Every module in the path, flattened — used for "what's next". */
export function pathModules(path: LearningPath): LearningModule[] {
  return path.modules;
}

// --- Challenge derivation ---------------------------------------------------

/**
 * A recall question straight from the bank, preferring one whose `teaches`
 * points inside this module so the checkpoint tests what was just read.
 */
function buildRecall(
  examCode: string,
  mod: LearningModule,
  seenIds: Set<string>,
): Challenge | null {
  const content = getExamContent(examCode);
  if (!content) return null;

  const path = content.learningPath.paths.find((p) =>
    p.modules.some((m) => m.id === mod.id),
  );
  const inModule = content.questions.filter(
    (q) => q.teaches && mod.sectionIds.includes(q.teaches),
  );
  const inDomain = content.questions.filter(
    (q) => q.domain === (path?.domainId ?? ""),
  );

  const pool = (inModule.length ? inModule : inDomain).filter(
    (q) => !seenIds.has(q.id),
  );
  const q: Question | undefined = shuffle(pool)[0];
  if (!q) return null;

  seenIds.add(q.id);
  return {
    kind: "recall",
    id: `recall-${q.id}`,
    prompt: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
  };
}

/**
 * Match each term to its definition. Built from the module's own cards, which
 * is why it needs no authoring: a flashcard IS a term/definition pair.
 */
function buildMatch(cards: Flashcard[], nonce: number): Challenge | null {
  const picked = shuffle(cards).slice(0, MATCH_SIZE);
  if (picked.length < 2) return null;

  return {
    kind: "match",
    id: `match-${picked[0].id}-${nonce}`,
    prompt: "Drag each definition onto the term it belongs to.",
    pairs: picked.map((c) => ({
      termId: c.id,
      term: c.front,
      definition: c.back,
    })),
  };
}

/**
 * "Which of these belong to this module?" — the module's own terms mixed with
 * terms from elsewhere in the exam. Tests recognition of scope, which is
 * exactly the thing a fundamentals paper keeps asking and a single-answer
 * question cannot check.
 */
function buildMulti(
  examCode: string,
  cards: Flashcard[],
  nonce: number,
  moduleTitle: string,
): Challenge | null {
  const all = getExamContent(examCode)?.flashcards ?? [];
  const mine = shuffle(cards).slice(0, 3);
  if (mine.length < 2) return null;

  const mineIds = new Set(mine.map((c) => c.id));
  const others = shuffle(all.filter((c) => !mineIds.has(c.id))).slice(
    0,
    Math.max(2, MULTI_SIZE - mine.length),
  );
  if (others.length === 0) return null;

  return {
    kind: "multi",
    id: `multi-${mine[0].id}-${nonce}`,
    prompt: `Select every term that belongs to “${moduleTitle}”.`,
    options: shuffle([
      ...mine.map((c) => ({ id: c.id, label: c.front, correct: true })),
      ...others.map((c) => ({ id: c.id, label: c.front, correct: false })),
    ]),
  };
}

/**
 * The checkpoint after a bite of cards. Rotates format by position so a module
 * never asks the same shape twice in a row — variety is doing real work here,
 * because the interruption only holds attention while it is still a surprise.
 */
export function buildChallenge(
  examCode: string,
  mod: LearningModule,
  cards: Flashcard[],
  checkpointIndex: number,
  seenIds: Set<string>,
): Challenge | null {
  const order: Challenge["kind"][] = ["recall", "match", "multi"];
  const rotation = order[checkpointIndex % order.length];

  const attempts: Challenge["kind"][] = [
    rotation,
    ...order.filter((k) => k !== rotation),
  ];

  for (const kind of attempts) {
    const built =
      kind === "recall"
        ? buildRecall(examCode, mod, seenIds)
        : kind === "match"
          ? buildMatch(cards, checkpointIndex)
          : buildMulti(examCode, cards, checkpointIndex, mod.title);
    if (built) return built;
  }
  return null;
}

/**
 * Reward for a checkpoint, in "shards" — the learning path's own currency,
 * shown immediately so effort has a visible result before any XP lands.
 *
 * Scaled by accuracy rather than paid flat: a challenge you can fail for the
 * same reward as passing is a button, not a challenge. Perfect answers pay a
 * bonus so precision is worth more than persistence.
 */
export function shardsFor(correct: number, total: number): number {
  if (total === 0) return 0;
  const base = Math.round((correct / total) * 10);
  return correct === total ? base + 5 : base;
}
