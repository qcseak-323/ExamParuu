import type {
  QuizAttempt,
  FlashcardStatus,
  Domain,
  LearningEvent,
} from "./types";
import { getCatalogEntry, getExamContent } from "./content";
import { countLessonsCompleted, countRepeatEngagements } from "./learning";

const XP_PER_CORRECT_ANSWER = 10;
const XP_PER_QUIZ_COMPLETE = 50;
const XP_PER_FLASHCARD_REVIEWED = 2;
const XP_PER_LEVEL = 200;
const BADGE_MIN_ANSWERED = 8;
const BADGE_MIN_ACCURACY = 0.85;

/** Turning a question you once got wrong into one you get right. */
const XP_PER_REDEEMED_QUESTION = 25;
const XP_PER_EARNED_BADGE = 100;
const XP_PER_LESSON = 15;
/** Repeat review used to be worth nothing, which discouraged the one thing
 *  flashcards exist for. */
const XP_PER_REPEAT_REVIEW = 3;
const XP_PER_STREAK_MILESTONE = 20;
const STREAK_MILESTONES = [3, 7, 14, 30];

/**
 * THE INVARIANT — read before touching this function.
 *
 * `computeLevel` is monotone in xp, and level drives Paruu evolution. So XP
 * terms may only ever be APPENDED, never modified or removed. Leave the three
 * original terms exactly as they are and keep every new term non-negative, and
 * `xp_new >= xp_old` holds for every existing user — meaning nobody's pal can
 * ever de-evolve. That property is the entire reason no XP versioning or
 * stored high-water mark is needed.
 *
 * The corollary trap: NEVER multiply XP by the streak. `computeStreak` can go
 * down when someone misses a day, so a streak multiplier would demote pals
 * overnight. Reward streaks with milestone terms ("has ever reached 7 days"),
 * which only ratchet upward.
 */
export function computeXp(
  attempts: QuizAttempt[],
  flashcardProgress: Record<string, FlashcardStatus>,
  // Defaulted so every existing call site keeps compiling and keeps returning
  // the same answer until it opts in.
  events: LearningEvent[] = [],
  activityDates: string[] = [],
): number {
  const quizXp = attempts.reduce(
    (sum, a) => sum + a.correctCount * XP_PER_CORRECT_ANSWER + XP_PER_QUIZ_COMPLETE,
    0,
  );
  const flashcardXp =
    Object.keys(flashcardProgress).length * XP_PER_FLASHCARD_REVIEWED;

  return (
    quizXp +
    flashcardXp +
    computeRedemptionXp(attempts) +
    computeBadgeXp(attempts) +
    countLessonsCompleted(events) * XP_PER_LESSON +
    countRepeatEngagements(events) * XP_PER_REPEAT_REVIEW +
    computeStreakMilestoneXp(activityDates) +
    computeWildXp(events)
  );
}

/**
 * XP for wild-question wins, scaled by the exam's Microsoft tier. Appended
 * term, non-negative, derived from the append-only event log (day-scoped
 * deterministic ids stop the same question paying twice in a day) — so the
 * XP invariant above holds untouched.
 */
export function wildXpFor(examCode: string): number {
  const level = getCatalogEntry(examCode)?.msLevel;
  if (level === "Fundamentals") return 10;
  if (level === "Associate") return 20;
  return 30;
}

export function computeWildXp(events: LearningEvent[]): number {
  return events
    .filter((e) => e.kind === "wildWin")
    .reduce((sum, e) => sum + wildXpFor(e.examCode), 0);
}

/**
 * Streaks reward via milestones "ever reached", never via a multiplier.
 *
 * A multiplier would be catastrophic: `computeStreak` drops the moment someone
 * misses a day, so multiplying would shrink total XP and de-evolve their pal
 * overnight. Milestones only ever ratchet upward, because they are computed
 * over the full activity history rather than the current run.
 */
export function computeStreakMilestoneXp(activityDates: string[]): number {
  if (activityDates.length === 0) return 0;

  const days = [...new Set(activityDates)].sort();
  let longest = 0;
  let run = 0;
  let previous: number | null = null;

  for (const day of days) {
    const time = new Date(`${day}T00:00:00`).getTime();
    if (previous !== null && time - previous === 86_400_000) {
      run += 1;
    } else {
      run = 1;
    }
    previous = time;
    longest = Math.max(longest, run);
  }

  return (
    STREAK_MILESTONES.filter((m) => longest >= m).length *
    XP_PER_STREAK_MILESTONE
  );
}

/**
 * A question is "redeemed" once it has been answered wrong in one attempt and
 * correctly in a strictly later one. Paid once per question, ever.
 *
 * This is the mechanical reward for the review loop: without it, getting a
 * question right is worth the same 10 XP whether it was always easy for you or
 * whether you just closed a gap you had been failing.
 *
 * Derived from `attempts` alone, which already carry `questionId` — so this
 * needed no schema change and works retroactively on history users already have.
 */
export function computeRedemptionXp(attempts: QuizAttempt[]): number {
  const missedSoFar = new Set<string>();
  const redeemed = new Set<string>();

  // Chronological, so "later" genuinely means later. Attempts arrive sorted by
  // mergeRemoteProgress, but sorting here keeps this correct in isolation.
  const ordered = [...attempts].sort((a, b) => a.timestamp - b.timestamp);

  for (const attempt of ordered) {
    // Two passes per attempt: a question answered wrong and then right within
    // the *same* run isn't a redemption, it's a retry of the same sitting.
    for (const r of attempt.results) {
      if (r.correct && missedSoFar.has(r.questionId)) redeemed.add(r.questionId);
    }
    for (const r of attempt.results) {
      if (!r.correct) missedSoFar.add(r.questionId);
    }
  }

  return redeemed.size * XP_PER_REDEEMED_QUESTION;
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

/**
 * Badges were purely cosmetic — earned, displayed, and worth nothing. This
 * makes them load-bearing for zero data work.
 *
 * Safe against the invariant because `computeBadges` is all-time cumulative
 * and never decays: once earned, a badge cannot be revoked, so this term only
 * ratchets upward.
 *
 * Walks the exam registry itself rather than taking `domains` as a parameter,
 * so `computeXp`'s signature (and its three call sites) stay untouched.
 */
export function computeBadgeXp(attempts: QuizAttempt[]): number {
  const examCodes = new Set(attempts.map((a) => a.examCode));
  let earned = 0;

  for (const examCode of examCodes) {
    const domains = getExamContent(examCode)?.outline.domains ?? [];
    earned += computeBadges(examCode, domains, attempts).filter(
      (b) => b.earned,
    ).length;
  }

  return earned * XP_PER_EARNED_BADGE;
}

// Local calendar date, matching how activity dates are recorded in storage.ts.
// Using toISOString() here would compare UTC days against locally-recorded
// ones and under-count the streak for any timezone east of UTC.
function localIso(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function computeStreak(activityDates: string[]): number {
  if (activityDates.length === 0) return 0;
  const dateSet = new Set(activityDates);
  const cursor = new Date();

  // If there's no activity today, the streak can still count as "current"
  // through yesterday; otherwise it's broken.
  if (!dateSet.has(localIso(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (dateSet.has(localIso(cursor))) {
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

/**
 * "Gym cleared" for one exam: a timed mock (the `"mock"` sentinel in
 * `domainFilter`) that reached the pass mark. Derived, never stored — this is
 * the single home for the predicate that used to live inline in the catalog.
 * Display-only: it feeds badges, not XP, so the §10 XP invariant is untouched.
 */
export function isGymCleared(
  examCode: string,
  attempts: QuizAttempt[],
): boolean {
  return attempts.some(
    (a) =>
      a.examCode === examCode &&
      a.domainFilter === "mock" &&
      a.numQuestions > 0 &&
      a.correctCount / a.numQuestions >= 0.7,
  );
}

/**
 * The Proving seal: a full-format exam simulation (the `"exam"` sentinel)
 * passed at the real 700/1000 mark. The Proving scores against the whole
 * bank — unanswered counts as wrong — so the predicate compares the raw
 * correct count with 70% of the bank rather than trusting `numQuestions`,
 * which only records what was answered. Display-only, like the badges.
 */
export function isProvingPassed(
  examCode: string,
  attempts: QuizAttempt[],
): boolean {
  const bank = getExamContent(examCode)?.questions.length ?? 0;
  if (bank === 0) return false;
  const needed = Math.ceil(bank * 0.7);
  return attempts.some(
    (a) =>
      a.examCode === examCode &&
      a.domainFilter === "exam" &&
      a.correctCount >= needed,
  );
}
