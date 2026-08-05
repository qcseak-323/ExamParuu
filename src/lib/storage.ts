import { useSyncExternalStore } from "react";
import type { QuizAttempt, FlashcardStatus, LearningEvent } from "./types";

const QUIZ_KEY = "examready-quiz-attempts";
const FLASHCARD_KEY = "examready-flashcard-progress";
const ACTIVITY_KEY = "examready-activity-dates";
const LEARNING_KEY = "examready-learning-events";

type FlashcardProgress = Record<string, FlashcardStatus>;

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing and quota-exceeded both throw here. Progress for this
    // session stays in the in-memory cache; losing persistence is far better
    // than throwing out of the click handler that finishes a quiz.
  }
}

// Local calendar date, not UTC. toISOString() would roll the day over at
// 08:00 for a UTC+8 user, splitting a single evening of study across two
// "days" and corrupting the streak count.
function todayIso(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

const listeners = new Set<() => void>();
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function emitChange(): void {
  for (const listener of listeners) listener();
}

const EMPTY_ATTEMPTS: QuizAttempt[] = [];
const EMPTY_FLASHCARD_PROGRESS: FlashcardProgress = {};
const EMPTY_ACTIVITY_DATES: string[] = [];

let quizAttemptsCache: QuizAttempt[] | null = null;
function getQuizAttemptsSnapshot(): QuizAttempt[] {
  quizAttemptsCache ??= readJSON<QuizAttempt[]>(QUIZ_KEY, EMPTY_ATTEMPTS);
  return quizAttemptsCache;
}
function getQuizAttemptsServerSnapshot(): QuizAttempt[] {
  return EMPTY_ATTEMPTS;
}

let flashcardProgressCache: FlashcardProgress | null = null;
function getFlashcardProgressSnapshot(): FlashcardProgress {
  flashcardProgressCache ??= readJSON<FlashcardProgress>(
    FLASHCARD_KEY,
    EMPTY_FLASHCARD_PROGRESS,
  );
  return flashcardProgressCache;
}
function getFlashcardProgressServerSnapshot(): FlashcardProgress {
  return EMPTY_FLASHCARD_PROGRESS;
}

let activityDatesCache: string[] | null = null;
function getActivityDatesSnapshot(): string[] {
  activityDatesCache ??= readJSON<string[]>(ACTIVITY_KEY, EMPTY_ACTIVITY_DATES);
  return activityDatesCache;
}
function getActivityDatesServerSnapshot(): string[] {
  return EMPTY_ACTIVITY_DATES;
}

const EMPTY_LEARNING_EVENTS: LearningEvent[] = [];
let learningEventsCache: LearningEvent[] | null = null;
function getLearningEventsSnapshot(): LearningEvent[] {
  learningEventsCache ??= readJSON<LearningEvent[]>(
    LEARNING_KEY,
    EMPTY_LEARNING_EVENTS,
  );
  return learningEventsCache;
}
function getLearningEventsServerSnapshot(): LearningEvent[] {
  return EMPTY_LEARNING_EVENTS;
}

export function useQuizAttempts(): QuizAttempt[] {
  return useSyncExternalStore(
    subscribe,
    getQuizAttemptsSnapshot,
    getQuizAttemptsServerSnapshot,
  );
}

export function useFlashcardProgress(): FlashcardProgress {
  return useSyncExternalStore(
    subscribe,
    getFlashcardProgressSnapshot,
    getFlashcardProgressServerSnapshot,
  );
}

export function useActivityDates(): string[] {
  return useSyncExternalStore(
    subscribe,
    getActivityDatesSnapshot,
    getActivityDatesServerSnapshot,
  );
}

export function useLearningEvents(): LearningEvent[] {
  return useSyncExternalStore(
    subscribe,
    getLearningEventsSnapshot,
    getLearningEventsServerSnapshot,
  );
}

// Non-reactive snapshot readers, for use inside computations (e.g. useMemo)
// and one-off sync calls that should not re-run every time progress changes.
export function getFlashcardProgress(): FlashcardProgress {
  return getFlashcardProgressSnapshot();
}

export function getLearningEventsForSync(): LearningEvent[] {
  return getLearningEventsSnapshot();
}

/**
 * Appends a learning event, ignoring one whose id has already been seen.
 *
 * Ids are deterministic and day-scoped, so this is both the idempotency guard
 * and the anti-farm rule: finishing the same lesson twice in one day records
 * once. Returns whether anything was actually written, so callers can decide
 * whether to also fire a server sync.
 */
export function recordLearningEvent(event: LearningEvent): boolean {
  const existing = getLearningEventsSnapshot();
  if (existing.some((e) => e.id === event.id)) return false;

  const updated = [...existing, event];
  learningEventsCache = updated;
  writeJSON(LEARNING_KEY, updated);
  recordActivity();
  emitChange();
  return true;
}

export function getQuizAttemptsForSync(): QuizAttempt[] {
  return getQuizAttemptsSnapshot();
}

export function recordActivity(): void {
  const today = todayIso();
  const dates = getActivityDatesSnapshot();
  if (dates.includes(today)) return;
  const updated = [...dates, today];
  activityDatesCache = updated;
  writeJSON(ACTIVITY_KEY, updated);
  emitChange();
}

export function saveQuizAttempt(attempt: QuizAttempt): void {
  const attempts = [...getQuizAttemptsSnapshot(), attempt];
  quizAttemptsCache = attempts;
  writeJSON(QUIZ_KEY, attempts);
  recordActivity();
  emitChange();
}

export function setFlashcardStatus(id: string, status: FlashcardStatus): void {
  const progress = { ...getFlashcardProgressSnapshot(), [id]: status };
  flashcardProgressCache = progress;
  writeJSON(FLASHCARD_KEY, progress);
  recordActivity();
  emitChange();
}

/**
 * Folds account-backed progress into the local store, so every existing view
 * keeps reading from one place regardless of whether the user is signed in.
 * Attempts dedupe on id; flashcards resolve conflicts in favour of "known"
 * so syncing can never take away mastery earned on another device.
 */
export function mergeRemoteProgress(remote: {
  attempts: QuizAttempt[];
  flashcards: FlashcardProgress;
  events?: LearningEvent[];
}): void {
  const byId = new Map<string, QuizAttempt>();
  for (const a of getQuizAttemptsSnapshot()) byId.set(a.id, a);
  for (const a of remote.attempts) byId.set(a.id, a);
  const mergedAttempts = [...byId.values()].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  const mergedCards: FlashcardProgress = { ...getFlashcardProgressSnapshot() };
  for (const [cardId, status] of Object.entries(remote.flashcards)) {
    if (mergedCards[cardId] === "known") continue;
    mergedCards[cardId] = status;
  }

  const mergedDates = new Set(getActivityDatesSnapshot());
  for (const a of remote.attempts) {
    const d = new Date(a.timestamp);
    const month = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    mergedDates.add(`${d.getFullYear()}-${month}-${day}`);
  }

  // Learning events dedupe on their deterministic id, exactly like attempts.
  // `remote.events` is optional so a stale server payload can't crash the
  // merge for a client that has already shipped this field.
  const byEventId = new Map<string, LearningEvent>();
  for (const e of getLearningEventsSnapshot()) byEventId.set(e.id, e);
  for (const e of remote.events ?? []) byEventId.set(e.id, e);
  const mergedEvents = [...byEventId.values()].sort((a, b) => a.at - b.at);

  for (const e of mergedEvents) {
    const d = new Date(e.at);
    const month = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    mergedDates.add(`${d.getFullYear()}-${month}-${day}`);
  }

  quizAttemptsCache = mergedAttempts;
  flashcardProgressCache = mergedCards;
  activityDatesCache = [...mergedDates].sort();
  learningEventsCache = mergedEvents;

  writeJSON(QUIZ_KEY, quizAttemptsCache);
  writeJSON(FLASHCARD_KEY, flashcardProgressCache);
  writeJSON(ACTIVITY_KEY, activityDatesCache);
  writeJSON(LEARNING_KEY, learningEventsCache);
  emitChange();
}

export function resetAllProgress(): void {
  quizAttemptsCache = [];
  flashcardProgressCache = {};
  activityDatesCache = [];
  // Miss this one and "reset" leaves lesson history behind, which the next
  // sync then pushes back up — the reset silently undoes itself.
  learningEventsCache = [];
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(QUIZ_KEY);
    window.localStorage.removeItem(FLASHCARD_KEY);
    window.localStorage.removeItem(ACTIVITY_KEY);
    window.localStorage.removeItem(LEARNING_KEY);
  }
  emitChange();
}
