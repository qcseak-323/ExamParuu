import { useSyncExternalStore } from "react";
import type { QuizAttempt, FlashcardStatus } from "./types";

const QUIZ_KEY = "dp600-quiz-attempts";
const FLASHCARD_KEY = "dp600-flashcard-progress";

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

const listeners = new Set<() => void>();
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function emitChange(): void {
  for (const listener of listeners) listener();
}

let quizAttemptsCache: QuizAttempt[] | null = null;
function getQuizAttemptsSnapshot(): QuizAttempt[] {
  quizAttemptsCache ??= readJSON<QuizAttempt[]>(QUIZ_KEY, []);
  return quizAttemptsCache;
}
function getQuizAttemptsServerSnapshot(): QuizAttempt[] {
  return [];
}

let flashcardProgressCache: FlashcardProgress | null = null;
function getFlashcardProgressSnapshot(): FlashcardProgress {
  flashcardProgressCache ??= readJSON<FlashcardProgress>(FLASHCARD_KEY, {});
  return flashcardProgressCache;
}
function getFlashcardProgressServerSnapshot(): FlashcardProgress {
  return {};
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

// Non-reactive snapshot reader, for use inside computations (e.g. useMemo)
// that should not re-run every time progress changes elsewhere.
export function getFlashcardProgress(): FlashcardProgress {
  return getFlashcardProgressSnapshot();
}

export function saveQuizAttempt(attempt: QuizAttempt): void {
  const attempts = [...getQuizAttemptsSnapshot(), attempt];
  quizAttemptsCache = attempts;
  writeJSON(QUIZ_KEY, attempts);
  emitChange();
}

export function setFlashcardStatus(id: string, status: FlashcardStatus): void {
  const progress = { ...getFlashcardProgressSnapshot(), [id]: status };
  flashcardProgressCache = progress;
  writeJSON(FLASHCARD_KEY, progress);
  emitChange();
}

export function resetAllProgress(): void {
  quizAttemptsCache = [];
  flashcardProgressCache = {};
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(QUIZ_KEY);
    window.localStorage.removeItem(FLASHCARD_KEY);
  }
  emitChange();
}
