import { getDomainName, getExamContent, getFlashcardsByDomain } from "./content";
import { isSingleAnswer } from "./review";
import { shuffle } from "./shuffle";
import type {
  Challenge,
  Flashcard,
  LearningModule,
  LearningPath,
  SingleAnswerQuestion,
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
/** Wrong-answer count for reverse recall — same shape as a bank question. */
const REVERSE_DISTRACTORS = 3;
/** Cards per sort bucket, capped so two buckets still fit one screen. */
const SORT_PER_BUCKET = 3;
/** Swipe deck size — enough for a rhythm, short enough to stay a checkpoint. */
const SWIPE_SIZE = 5;

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
  path: LearningPath | undefined,
  mod: LearningModule,
  seenIds: Set<string>,
): Challenge | null {
  const content = getExamContent(examCode);
  if (!content) return null;

  // Single-answer only. A checkpoint renders through the `recall` challenge,
  // whose shape is options plus one correct index, so a matching or ordering
  // question from the bank has nothing to map onto. The other formats reach
  // the trainer through the Proving and practice instead.
  const bank = content.questions.filter(isSingleAnswer);

  const inModule = bank.filter(
    (q) => q.teaches && mod.sectionIds.includes(q.teaches),
  );
  const inDomain = bank.filter((q) => q.domain === (path?.domainId ?? ""));

  const pool = (inModule.length ? inModule : inDomain).filter(
    (q) => !seenIds.has(q.id),
  );
  const q: SingleAnswerQuestion | undefined = shuffle(pool)[0];
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
 * Recall flipped: definition shown, term asked. Needs exactly one module card
 * plus borrowed fronts, which makes it the format that reaches the modules
 * match and multi structurally cannot — the one-card ones.
 *
 * Emits `kind: "recall"` on purpose: the answer shape is identical, so the
 * component, scoring and XP paths all serve it with zero changes. Only the
 * `reverse-` id records which builder produced it.
 */
function buildReverse(
  examCode: string,
  path: LearningPath | undefined,
  cards: Flashcard[],
  nonce: number,
): Challenge | null {
  const card = shuffle(cards)[0];
  if (!card) return null;

  // Same-domain fronts make the wrong answers near-misses; the exam-wide
  // fallback only exists for a domain too small to supply three.
  const inDomain = getFlashcardsByDomain(examCode, path?.domainId ?? "");
  const examWide = getExamContent(examCode)?.flashcards ?? [];
  const fronts: string[] = [];
  for (const c of [...shuffle(inDomain), ...shuffle(examWide)]) {
    if (c.front === card.front || fronts.includes(c.front)) continue;
    fronts.push(c.front);
    if (fronts.length === REVERSE_DISTRACTORS) break;
  }
  if (fronts.length < REVERSE_DISTRACTORS) return null;

  const options = shuffle([card.front, ...fronts]);
  return {
    kind: "recall",
    id: `reverse-${card.id}-${nonce}`,
    prompt: `Which term does this describe? “${card.back}”`,
    options,
    correctIndex: options.indexOf(card.front),
    explanation: `${card.front} — ${card.back}`,
  };
}

/**
 * Match each term to its definition. Built from the module's own cards, which
 * is why it needs no authoring: a flashcard IS a term/definition pair. Small
 * modules top the grid up from their domain, so the just-read cards are still
 * among the pairs but no longer have to fill the grid alone.
 */
function buildMatch(
  examCode: string,
  path: LearningPath | undefined,
  cards: Flashcard[],
  nonce: number,
): Challenge | null {
  let picked = shuffle(cards).slice(0, MATCH_SIZE);
  if (picked.length < MATCH_SIZE) {
    const pickedIds = new Set(picked.map((c) => c.id));
    const topUp = shuffle(
      getFlashcardsByDomain(examCode, path?.domainId ?? "").filter(
        (c) => !pickedIds.has(c.id),
      ),
    );
    picked = [...picked, ...topUp].slice(0, MATCH_SIZE);
  }
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
  path: LearningPath | undefined,
  mod: LearningModule,
  cards: Flashcard[],
  nonce: number,
  moduleTitle: string,
): Challenge | null {
  const all = getExamContent(examCode)?.flashcards ?? [];
  const mine = shuffle(cards).slice(0, 3);
  if (mine.length < 2) return null;

  // Distractors must exclude EVERY module card, not just the picked ones —
  // the prompt asserts module membership, and an unpicked module card shown
  // as `correct: false` would mark a true answer wrong. Same-domain cards
  // from *other* modules are the ideal distractors: near-misses rather than
  // obvious throwaways, and still genuinely outside the module.
  const moduleIds = new Set(mod.cardIds);
  const inDomain = getFlashcardsByDomain(examCode, path?.domainId ?? "").filter(
    (c) => !moduleIds.has(c.id),
  );
  const pool =
    inDomain.length > 0 ? inDomain : all.filter((c) => !moduleIds.has(c.id));
  const others = shuffle(pool).slice(0, Math.max(2, MULTI_SIZE - mine.length));
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
 * Which of these is from another skills area? Correctness is guaranteed by
 * the authored `Flashcard.domain` field rather than any heuristic, and three
 * same-domain fronts are all it needs — so it reaches any module.
 */
function buildOddOne(
  examCode: string,
  path: LearningPath | undefined,
  cards: Flashcard[],
  nonce: number,
): Challenge | null {
  const domainId = path?.domainId;
  if (!domainId) return null;

  // Module cards first so the just-read terms anchor the trio, topped up
  // from the domain when the module alone cannot supply three.
  const inDomain: Flashcard[] = [];
  const seenFronts = new Set<string>();
  for (const c of [
    ...shuffle(cards),
    ...shuffle(getFlashcardsByDomain(examCode, domainId)),
  ]) {
    if (seenFronts.has(c.front)) continue;
    seenFronts.add(c.front);
    inDomain.push(c);
    if (inDomain.length === 3) break;
  }
  if (inDomain.length < 3) return null;

  const odd = shuffle(
    (getExamContent(examCode)?.flashcards ?? []).filter(
      (c) => c.domain !== domainId,
    ),
  )[0];
  if (!odd) return null;

  const domainName = getDomainName(examCode, domainId);
  const options = shuffle([...inDomain.map((c) => c.front), odd.front]);
  return {
    kind: "oddOne",
    id: `oddone-${odd.id}-${nonce}`,
    prompt: `Three of these belong to “${domainName}”. Which one does not?`,
    options,
    correctIndex: options.indexOf(odd.front),
    explanation: `${odd.front} belongs to “${getDomainName(examCode, odd.domain)}” — the rest are “${domainName}”.`,
  };
}

/**
 * Sort terms into their skills areas. Drawn from the whole exam because the
 * point is telling domains apart; the module's own domain is always one of
 * the buckets so the checkpoint still touches what was just read.
 */
function buildSort(
  examCode: string,
  path: LearningPath | undefined,
  nonce: number,
): Challenge | null {
  const all = getExamContent(examCode)?.flashcards ?? [];
  const byDomain = new Map<string, Flashcard[]>();
  for (const c of all) {
    byDomain.set(c.domain, [...(byDomain.get(c.domain) ?? []), c]);
  }

  // A bucket with one card is a giveaway, so a domain must bring two.
  const eligible = [...byDomain.keys()].filter(
    (d) => (byDomain.get(d)?.length ?? 0) >= 2,
  );
  if (eligible.length < 2) return null;

  const own = path?.domainId;
  const first =
    own && eligible.includes(own) ? own : shuffle(eligible)[0];
  const second = shuffle(eligible.filter((d) => d !== first))[0];

  const items = [first, second].flatMap((d) =>
    shuffle(byDomain.get(d) ?? [])
      .slice(0, SORT_PER_BUCKET)
      .map((c) => ({ id: c.id, label: c.front, bucketId: d })),
  );

  return {
    kind: "sort",
    id: `sort-${first}-${second}-${nonce}`,
    prompt: "Sort each term into the skills area it belongs to.",
    buckets: [first, second].map((d) => ({
      id: d,
      label: getDomainName(examCode, d),
    })),
    items: shuffle(items),
  };
}

/**
 * A deck of term/definition pairings, each judged true or false. Wrong
 * definitions come from the same domain — that is what makes each card a
 * judgement rather than a giveaway — and correctness is pure data: the
 * definition either is the card's own or it is not.
 */
function buildSwipe(
  examCode: string,
  path: LearningPath | undefined,
  cards: Flashcard[],
  nonce: number,
): Challenge | null {
  const inDomain = getFlashcardsByDomain(examCode, path?.domainId ?? "");
  const deck: Flashcard[] = [];
  const seen = new Set<string>();
  for (const c of [...shuffle(cards), ...shuffle(inDomain)]) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    deck.push(c);
    if (deck.length === SWIPE_SIZE) break;
  }
  if (deck.length < 2) return null;

  // Donors of wrong definitions. Domain-local when it can be; a domain too
  // small to lend one falls back to the whole exam rather than bailing.
  const donors =
    inDomain.length >= 2 ? inDomain : (getExamContent(examCode)?.flashcards ?? []);

  // Half the deck lies, decided up front and shuffled — per-card coin flips
  // could deal an all-true deck, which teaches nothing.
  const lies = shuffle(deck.map((_, i) => i % 2 === 1));
  return {
    kind: "swipe",
    id: `swipe-${deck[0].id}-${nonce}`,
    prompt: "Does the definition match the term?",
    cards: deck.map((c, i) => {
      const wrong = lies[i]
        ? shuffle(donors.filter((d) => d.id !== c.id && d.back !== c.back))[0]
        : undefined;
      return wrong
        ? { id: c.id, term: c.front, definition: wrong.back, matches: false }
        : { id: c.id, term: c.front, definition: c.back, matches: true };
    }),
  };
}

/**
 * Which builder produces a checkpoint — distinct from `Challenge["kind"]`
 * because reverse recall deliberately emits a plain `recall` challenge.
 */
type BuilderKind =
  | "recall"
  | "reverse"
  | "match"
  | "multi"
  | "oddOne"
  | "sort"
  | "swipe";

const BUILDER_ORDER: BuilderKind[] = [
  "recall",
  "reverse",
  "match",
  "multi",
  "oddOne",
  "sort",
  "swipe",
];

/**
 * The checkpoint after a bite of cards. Rotates format by position so a module
 * never asks the same shape twice in a row — variety is doing real work here,
 * because the interruption only holds attention while it is still a surprise.
 *
 * Seeded by the module's ordinal as well as the checkpoint: most modules are
 * short enough to fire only one or two checkpoints, so a fixed starting
 * format meant a whole exam of first-checkpoints all landing on recall.
 * Offsetting by position in the path walks the rotation across modules.
 */
export function buildChallenge(
  examCode: string,
  mod: LearningModule,
  cards: Flashcard[],
  checkpointIndex: number,
  seenIds: Set<string>,
): Challenge | null {
  const path = getExamContent(examCode)?.learningPath.paths.find((p) =>
    p.modules.some((m) => m.id === mod.id),
  );
  const moduleOrdinal = Math.max(
    0,
    path?.modules.findIndex((m) => m.id === mod.id) ?? 0,
  );

  const rotation =
    BUILDER_ORDER[(moduleOrdinal + checkpointIndex) % BUILDER_ORDER.length];
  const attempts: BuilderKind[] = [
    rotation,
    ...BUILDER_ORDER.filter((k) => k !== rotation),
  ];

  for (const kind of attempts) {
    const built =
      kind === "recall"
        ? buildRecall(examCode, path, mod, seenIds)
        : kind === "reverse"
          ? buildReverse(examCode, path, cards, checkpointIndex)
          : kind === "match"
            ? buildMatch(examCode, path, cards, checkpointIndex)
            : kind === "multi"
              ? buildMulti(examCode, path, mod, cards, checkpointIndex, mod.title)
              : kind === "oddOne"
                ? buildOddOne(examCode, path, cards, checkpointIndex)
                : kind === "sort"
                  ? buildSort(examCode, path, checkpointIndex)
                  : buildSwipe(examCode, path, cards, checkpointIndex);
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
