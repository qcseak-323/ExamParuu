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
  window.localStorage.setItem(key, JSON.stringify(value));
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
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

// Non-reactive snapshot reader, for use inside computations (e.g. useMemo)
// that should not re-run every time progress changes elsewhere.
export function getFlashcardProgress(): FlashcardProgress {
  return getFlashcardProgressSnapshot();
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
