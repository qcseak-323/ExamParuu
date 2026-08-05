import type { Question, QuizAttempt } from "./types";
import { getExamContent, getQuestionsByDomain } from "./content";
import { weightedSample } from "./shuffle";

/**
 * Spaced repetition over questions.
 *
 * The whole system is DERIVED from `QuizAttempt.results`, which has always
 * carried `questionId` — every existing consumer just aggregated it away. So
 * this needs no schema change and works retroactively on history users
 * already have.
 *
 * Nothing here is stored. Boxes and due dates are recomputed from the attempt
 * log on demand, which means they can never drift out of sync with reality
 * and there is no scheduling state to migrate, merge, or reset.
 */

const DAY_MS = 86_400_000;

/** Leitner intervals per box, in days. Box 0 is "due immediately". */
const INTERVAL_DAYS = [0, 1, 3, 7, 16, 35];
const MAX_BOX = INTERVAL_DAYS.length - 1;

/** Don't re-serve something answered in the last half hour. */
const RECENCY_WINDOW_MS = 30 * 60 * 1000;

export type QuestionHistory = {
  questionId: string;
  seen: number;
  misses: number;
  lastSeenAt: number;
  box: number;
  dueAt: number;
};

/**
 * Folds the attempt log into per-question history.
 *
 * The box moves asymmetrically on purpose: +1 for a correct answer, -2 for a
 * wrong one. A lucky guess shouldn't retire a question you don't actually
 * know, but a genuine miss should pull it firmly back into rotation.
 */
export function buildHistory(
  attempts: QuizAttempt[],
  examCode: string,
): Map<string, QuestionHistory> {
  const history = new Map<string, QuestionHistory>();

  const ordered = [...attempts]
    .filter((a) => a.examCode === examCode)
    .sort((a, b) => a.timestamp - b.timestamp);

  for (const attempt of ordered) {
    for (const result of attempt.results) {
      // Per-answer timestamps only exist on attempts recorded after they were
      // added; fall back to the attempt's own time for older rows.
      const at = result.at ?? attempt.timestamp;

      const existing = history.get(result.questionId);
      const prevBox = existing?.box ?? 0;
      const box = result.correct
        ? Math.min(MAX_BOX, prevBox + 1)
        : Math.max(0, prevBox - 2);

      history.set(result.questionId, {
        questionId: result.questionId,
        seen: (existing?.seen ?? 0) + 1,
        misses: (existing?.misses ?? 0) + (result.correct ? 0 : 1),
        lastSeenAt: at,
        box,
        dueAt: at + INTERVAL_DAYS[box] * DAY_MS,
      });
    }
  }

  return history;
}

/**
 * Parses a blueprint weight like "40-45%" into a fraction (0.425).
 *
 * `Domain.weight` has been authored in every outline file since the start and
 * used for nothing but display. This is what finally makes it do work: a
 * review deck should over-sample the domains that dominate the real exam.
 */
export function parseWeight(weight: string): number | null {
  const numbers = weight.match(/\d+(\.\d+)?/g);
  if (!numbers || numbers.length === 0) return null;
  const values = numbers.map(Number);
  const midpoint =
    values.reduce((sum, v) => sum + v, 0) / values.length;
  return midpoint / 100;
}

/** Blueprint multiplier per domain, normalised so an even split scores 1.0. */
function blueprintWeights(examCode: string): Map<string, number> {
  const domains = getExamContent(examCode)?.outline.domains ?? [];
  const result = new Map<string, number>();
  if (domains.length === 0) return result;

  const even = 1 / domains.length;
  for (const domain of domains) {
    const fraction = parseWeight(domain.weight);
    result.set(domain.id, fraction === null ? 1 : fraction / even);
  }
  return result;
}

/**
 * How badly a question wants to be asked right now. All factors derived, all
 * multiplicative.
 */
export function scoreQuestion(
  question: Question,
  history: Map<string, QuestionHistory>,
  blueprint: Map<string, number>,
  now: number,
): number {
  const blueprintWeight = blueprint.get(question.domain) ?? 1;
  const record = history.get(question.id);

  // Never seen: a flat, healthy weight so new material keeps flowing rather
  // than the deck collapsing onto old mistakes.
  if (!record) return 1 * blueprintWeight;

  const difficulty = 1 + 2 * (record.misses / record.seen);
  const boxDamp = Math.pow(0.5, record.box);

  const intervalMs = Math.max(INTERVAL_DAYS[record.box], 1) * DAY_MS;
  const overdueMs = now - record.dueAt;
  const urgency =
    overdueMs >= 0 ? 1 + Math.min(2, overdueMs / intervalMs) : 0.15;

  const recencyPenalty =
    now - record.lastSeenAt < RECENCY_WINDOW_MS ? 0.1 : 1;

  return difficulty * urgency * boxDamp * blueprintWeight * recencyPenalty;
}

/** Questions currently due for review, hardest-first. */
export function getDueQuestions(
  examCode: string,
  attempts: QuizAttempt[],
  now = Date.now(),
): Question[] {
  const history = buildHistory(attempts, examCode);
  const questions = getQuestionsByDomain(examCode, "all");

  return questions
    .filter((q) => {
      const record = history.get(q.id);
      // Unseen questions aren't "due" — they've never been learned, so calling
      // them review would inflate the count into meaninglessness.
      return record !== undefined && record.dueAt <= now;
    })
    .sort((a, b) => {
      const ra = history.get(a.id)!;
      const rb = history.get(b.id)!;
      return rb.misses / rb.seen - ra.misses / ra.seen;
    });
}

/** Builds a review deck, weighted toward what needs the work. */
export function selectReviewQuestions(
  examCode: string,
  attempts: QuizAttempt[],
  count: number,
  now = Date.now(),
): Question[] {
  const history = buildHistory(attempts, examCode);
  const blueprint = blueprintWeights(examCode);
  const questions = getQuestionsByDomain(examCode, "all");

  return weightedSample(
    questions,
    (q) => scoreQuestion(q, history, blueprint, now),
    count,
  );
}

/**
 * Builds a mock-exam paper weighted to the published blueprint.
 *
 * Allocates a per-domain quota by exam weight using largest-remainder, so the
 * totals land on exactly `count` rather than drifting from repeated rounding.
 * Within a domain it prefers questions the trainer has not seen, which is what
 * keeps a mock feeling like an exam rather than a recap of last week's battle.
 */
export function buildExamPaper(
  examCode: string,
  attempts: QuizAttempt[],
  count: number,
): Question[] {
  const domains = getExamContent(examCode)?.outline.domains ?? [];
  if (domains.length === 0) return [];

  const history = buildHistory(attempts, examCode);

  const fractions = domains.map((d) => parseWeight(d.weight) ?? 1 / domains.length);
  const total = fractions.reduce((sum, f) => sum + f, 0) || 1;
  const exact = fractions.map((f) => (f / total) * count);

  const quota = exact.map(Math.floor);
  let remaining = count - quota.reduce((sum, q) => sum + q, 0);
  // Largest remainder: hand the leftovers to whichever domains were rounded
  // down hardest, so the paper is exactly `count` questions long.
  const order = exact
    .map((value, i) => ({ i, rem: value - Math.floor(value) }))
    .sort((a, b) => b.rem - a.rem);
  for (const { i } of order) {
    if (remaining <= 0) break;
    quota[i] += 1;
    remaining -= 1;
  }

  const paper: Question[] = [];
  domains.forEach((domain, i) => {
    const pool = getQuestionsByDomain(examCode, domain.id);
    const unseen = pool.filter((q) => !history.has(q.id));
    const seen = pool.filter((q) => history.has(q.id));
    // Unseen first, then previously-seen to top up a thin domain.
    const ordered = [...shuffleLocal(unseen), ...shuffleLocal(seen)];
    paper.push(...ordered.slice(0, quota[i]));
  });

  return shuffleLocal(paper);
}

// Local copy so review.ts doesn't need to re-export shuffle semantics.
function shuffleLocal<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Per-domain breakdown of a finished paper, against exam weight. */
export function scoreByDomain(
  examCode: string,
  results: { domain: string; correct: boolean }[],
): { id: string; name: string; weight: string; correct: number; total: number }[] {
  const domains = getExamContent(examCode)?.outline.domains ?? [];
  return domains.map((d) => {
    const forDomain = results.filter((r) => r.domain === d.id);
    return {
      id: d.id,
      name: d.name,
      weight: d.weight,
      correct: forDomain.filter((r) => r.correct).length,
      total: forDomain.length,
    };
  });
}

export type ReviewSummary = {
  dueCount: number;
  /** Domains carrying the most misses, worst first. */
  weakTopics: { id: string; name: string; misses: number }[];
};

/** Feeds the "3 topics need review" callout. */
export function getReviewSummary(
  examCode: string,
  attempts: QuizAttempt[],
  now = Date.now(),
): ReviewSummary {
  const history = buildHistory(attempts, examCode);
  const domains = getExamContent(examCode)?.outline.domains ?? [];
  const questions = getQuestionsByDomain(examCode, "all");

  const missesByDomain = new Map<string, number>();
  for (const question of questions) {
    const record = history.get(question.id);
    if (!record || record.misses === 0) continue;
    missesByDomain.set(
      question.domain,
      (missesByDomain.get(question.domain) ?? 0) + record.misses,
    );
  }

  const weakTopics = domains
    .map((d) => ({
      id: d.id,
      name: d.name,
      misses: missesByDomain.get(d.id) ?? 0,
    }))
    .filter((t) => t.misses > 0)
    .sort((a, b) => b.misses - a.misses);

  return {
    dueCount: getDueQuestions(examCode, attempts, now).length,
    weakTopics,
  };
}
