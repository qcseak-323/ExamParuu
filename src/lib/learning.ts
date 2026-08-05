import type { LearningEvent, LearningEventKind } from "./types";

/**
 * Semantics for the learning event log. Persistence lives in storage.ts; this
 * file only interprets what was recorded.
 */

const DAY_MS = 86_400_000;

/** Local calendar day, matching how activity dates are built in storage.ts. */
export function dayIso(at: number): string {
  const d = new Date(at);
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * Deterministic id — the whole idempotency story.
 *
 * Same lesson, same day, same trainer collapses to one row however many times
 * it is recorded, on however many devices. That is what lets the log merge
 * safely without a server round-trip to check for duplicates, and what stops
 * re-reading a page from being an XP faucet.
 */
export function makeEventId(
  kind: LearningEventKind,
  examCode: string,
  refId: string,
  at: number,
): string {
  return `${kind}:${examCode}:${refId}:${dayIso(at)}`;
}

export function buildEvent(
  kind: LearningEventKind,
  examCode: string,
  refId: string,
  at = Date.now(),
): LearningEvent {
  return { id: makeEventId(kind, examCode, refId, at), examCode, kind, refId, at };
}

/** Distinct lessons ever completed, across all exams. */
export function countLessonsCompleted(events: LearningEvent[]): number {
  const seen = new Set<string>();
  for (const e of events) {
    if (e.kind === "lesson") seen.add(`${e.examCode}:${e.refId}`);
  }
  return seen.size;
}

/** Has this specific lesson ever been finished? */
export function hasCompletedLesson(
  events: LearningEvent[],
  examCode: string,
  sectionId: string,
): boolean {
  return events.some(
    (e) =>
      e.kind === "lesson" && e.examCode === examCode && e.refId === sectionId,
  );
}

/**
 * Repeat engagement beyond the first time — the part the old model actively
 * discouraged, since a re-reviewed flashcard was worth exactly zero.
 *
 * Capped per day so a long session can't be farmed.
 */
const REPEAT_CAP_PER_DAY = 5;
export function countRepeatEngagements(events: LearningEvent[]): number {
  const firstSeen = new Set<string>();
  const perDay = new Map<string, number>();

  for (const e of [...events].sort((a, b) => a.at - b.at)) {
    const key = `${e.kind}:${e.examCode}:${e.refId}`;
    if (!firstSeen.has(key)) {
      firstSeen.add(key);
      continue;
    }
    const day = dayIso(e.at);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }

  let total = 0;
  for (const count of perDay.values()) {
    total += Math.min(count, REPEAT_CAP_PER_DAY);
  }
  return total;
}

/**
 * Splits a paragraph into dialogue-sized beats.
 *
 * Study paragraphs run 250–500 characters. At the DialogueBox's ~26ms per
 * character that is 7–13 seconds of typewriter for a single line — which
 * reads as a wall arriving slowly rather than as someone talking. Breaking on
 * sentence boundaries keeps each beat to roughly a spoken breath.
 *
 * Splitting on ". " rather than a lookbehind regex on purpose: abbreviations
 * like "e.g." and version numbers would each become their own beat otherwise.
 */
const MAX_BEAT_CHARS = 180;

export function splitIntoBeats(paragraph: string): string[] {
  const sentences = paragraph
    .split(/(?<=[.!?])\s+(?=[A-Z(])/)
    .map((s) => s.trim())
    .filter(Boolean);

  const beats: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current === "") {
      current = sentence;
    } else if (current.length + sentence.length + 1 <= MAX_BEAT_CHARS) {
      current = `${current} ${sentence}`;
    } else {
      beats.push(current);
      current = sentence;
    }
  }
  if (current) beats.push(current);

  return beats.length > 0 ? beats : [paragraph];
}

/** Every beat of a lesson, in order. */
export function lessonBeats(paragraphs: string[]): string[] {
  return paragraphs.flatMap(splitIntoBeats);
}

/** Rough reading time, for the lesson index. */
export function estimateMinutes(paragraphs: string[]): number {
  const words = paragraphs.join(" ").split(/\s+/).length;
  return Math.max(1, Math.round(words / 180));
}

// --- Flashcard scheduling --------------------------------------------------

/**
 * Spaced repetition for flashcards, derived from review events rather than
 * from the status map.
 *
 * This detour is deliberate. The obvious design — a third `FlashcardStatus`
 * like "relearning" — is a trap: `mergeRemoteProgress` and its mirror in
 * actions.ts both resolve conflicts as "known wins", so a demotion would be
 * silently discarded on the next sync and the trainer would watch their own
 * review disappear. Deriving from an append-only log sidesteps that rule
 * entirely instead of fighting it.
 */
const CARD_INTERVAL_DAYS = [0, 1, 3, 7, 16, 35];
const MAX_CARD_BOX = CARD_INTERVAL_DAYS.length - 1;

export type CardSchedule = {
  cardId: string;
  reviews: number;
  lastReviewedAt: number;
  box: number;
  dueAt: number;
};

/**
 * `known` counts as a successful recall and advances the box; `learning`
 * knocks it back. Status comes from the map (latest state), cadence comes
 * from the log (history) — each source doing what it is actually good at.
 */
export function buildCardSchedules(
  events: LearningEvent[],
  status: Record<string, string>,
  examCode: string,
): Map<string, CardSchedule> {
  const schedules = new Map<string, CardSchedule>();

  const reviews = events
    .filter((e) => e.kind === "cardReview" && e.examCode === examCode)
    .sort((a, b) => a.at - b.at);

  for (const review of reviews) {
    const existing = schedules.get(review.refId);
    const prevBox = existing?.box ?? 0;
    // The log records that a review happened; the map records how it went.
    const wentWell = status[review.refId] === "known";
    const box = wentWell
      ? Math.min(MAX_CARD_BOX, prevBox + 1)
      : Math.max(0, prevBox - 1);

    schedules.set(review.refId, {
      cardId: review.refId,
      reviews: (existing?.reviews ?? 0) + 1,
      lastReviewedAt: review.at,
      box,
      dueAt: review.at + CARD_INTERVAL_DAYS[box] * DAY_MS,
    });
  }

  return schedules;
}

/**
 * Orders a deck so due cards come first, then never-reviewed ones, then the
 * rest. Cards that aren't due yet stay in the deck rather than being removed —
 * running out of cards entirely is a worse experience than an easy review.
 */
export function orderDeckBySchedule<T extends { id: string }>(
  cards: T[],
  schedules: Map<string, CardSchedule>,
  now = Date.now(),
): T[] {
  const rank = (card: T): number => {
    const schedule = schedules.get(card.id);
    if (!schedule) return 1; // unseen: right after anything overdue
    if (schedule.dueAt <= now) return 0; // due
    return 2; // resting
  };

  return [...cards].sort((a, b) => {
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    const sa = schedules.get(a.id);
    const sb = schedules.get(b.id);
    // Within the due group, the most overdue first.
    return (sa?.dueAt ?? 0) - (sb?.dueAt ?? 0);
  });
}

export function countDueCards(
  cards: { id: string }[],
  schedules: Map<string, CardSchedule>,
  now = Date.now(),
): number {
  return cards.filter((c) => {
    const schedule = schedules.get(c.id);
    return schedule !== undefined && schedule.dueAt <= now;
  }).length;
}
