import type { QuizAttempt, FlashcardStatus, Domain } from "./types";

const XP_PER_CORRECT_ANSWER = 10;
const XP_PER_QUIZ_COMPLETE = 50;
const XP_PER_FLASHCARD_REVIEWED = 2;
const XP_PER_LEVEL = 200;
const BADGE_MIN_ANSWERED = 8;
const BADGE_MIN_ACCURACY = 0.85;

export function computeXp(
  attempts: QuizAttempt[],
  flashcardProgress: Record<string, FlashcardStatus>,
): number {
  const quizXp = attempts.reduce(
    (sum, a) => sum + a.correctCount * XP_PER_CORRECT_ANSWER + XP_PER_QUIZ_COMPLETE,
    0,
  );
  const flashcardXp =
    Object.keys(flashcardProgress).length * XP_PER_FLASHCARD_REVIEWED;
  return quizXp + flashcardXp;
}

export function computeLevel(xp: number): {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
} {
  const level = 1 + Math.floor(xp / XP_PER_LEVEL);
  const xpIntoLevel = xp % XP_PER_LEVEL;
  return { level, xpIntoLevel, xpForNextLevel: XP_PER_LEVEL };
}

export function computeStreak(activityDates: string[]): number {
  if (activityDates.length === 0) return 0;
  const dateSet = new Set(activityDates);
  const today = new Date();
  const cursor = new Date(today);

  // If there's no activity today, the streak can still count as "current"
  // through yesterday; otherwise it's broken.
  const todayIso = cursor.toISOString().slice(0, 10);
  if (!dateSet.has(todayIso)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (dateSet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export type DomainBadge = {
  domainId: string;
  domainName: string;
  answered: number;
  correct: number;
  accuracy: number;
  earned: boolean;
};

export function computeBadges(
  examCode: string,
  domains: Domain[],
  attempts: QuizAttempt[],
): DomainBadge[] {
  const examAttempts = attempts.filter((a) => a.examCode === examCode);
  return domains.map((domain) => {
    let answered = 0;
    let correct = 0;
    for (const attempt of examAttempts) {
      for (const r of attempt.results) {
        if (r.domain !== domain.id) continue;
        answered += 1;
        if (r.correct) correct += 1;
      }
    }
    const accuracy = answered === 0 ? 0 : correct / answered;
    return {
      domainId: domain.id,
      domainName: domain.name,
      answered,
      correct,
      accuracy,
      earned: answered >= BADGE_MIN_ANSWERED && accuracy >= BADGE_MIN_ACCURACY,
    };
  });
}
