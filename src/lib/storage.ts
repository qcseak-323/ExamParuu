import { useSyncExternalStore } from "react";
import type { QuizAttempt, FlashcardStatus } from "./types";

const QUIZ_KEY = "examready-quiz-attempts";
const FLASHCARD_KEY = "examready-flashcard-progress";
const ACTIVITY_KEY = "examready-activity-dates";

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

// Non-reactive snapshot readers, for use inside computations (e.g. useMemo)
// and one-off sync calls that should not re-run every time progress changes.
export function getFlashcardProgress(): FlashcardProgress {
  return getFlashcardProgressSnapshot();
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

  quizAttemptsCache = mergedAttempts;
  flashcardProgressCache = mergedCards;
  activityDatesCache = [...mergedDates].sort();

  writeJSON(QUIZ_KEY, quizAttemptsCache);
  writeJSON(FLASHCARD_KEY, flashcardProgressCache);
  writeJSON(ACTIVITY_KEY, activityDatesCache);
  emitChange();
}

export function resetAllProgress(): void {
  quizAttemptsCache = [];
  flashcardProgressCache = {};
  activityDatesCache = [];
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(QUIZ_KEY);
    window.localStorage.removeItem(FLASHCARD_KEY);
    window.localStorage.removeItem(ACTIVITY_KEY);
  }
  emitChange();
}
