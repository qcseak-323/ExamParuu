"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { catalog } from "@/lib/content";
import {
  useQuizAttempts,
  useFlashcardProgress,
  useActivityDates,
  resetAllProgress,
} from "@/lib/storage";
import { clearProgressInDb } from "@/lib/actions";
import { computeXp, computeLevel, computeStreak } from "@/lib/gamification";
import StorageNotice from "@/components/StorageNotice";

export default function ProgressPage() {
  const { status } = useSession();
  const [resetting, setResetting] = useState(false);
  const attempts = useQuizAttempts();
  const flashcardProgress = useFlashcardProgress();
  const activityDates = useActivityDates();

  const xp = computeXp(attempts, flashcardProgress);
  const { level, xpIntoLevel, xpForNextLevel } = computeLevel(xp);
  const streak = computeStreak(activityDates);

  const examStats = useMemo(
    () =>
      catalog
        .filter((exam) => exam.hasContent)
        .map((exam) => {
          const examAttempts = attempts.filter((a) => a.examCode === exam.code);
          const avg =
            examAttempts.length === 0
              ? null
              : Math.round(
                  (examAttempts.reduce((s, a) => s + a.correctCount / a.numQuestions, 0) /
                    examAttempts.length) *
                    100,
                );
          return { exam, attemptCount: examAttempts.length, avg };
        }),
    [attempts],
  );

  async function handleReset() {
    const signedIn = status === "authenticated";
    const scope = signedIn
      ? "This will permanently delete your quiz history, flashcard mastery, and streak data from your account and every device. Continue?"
      : "This will clear all saved quiz history, flashcard mastery, and streak data in this browser. Continue?";

    if (typeof window === "undefined" || !window.confirm(scope)) return;

    // Order matters: clear the account copy first, otherwise the next sync
    // pulls everything straight back and the reset looks like it failed.
    if (signedIn) {
      setResetting(true);
      try {
        await clearProgressInDb();
      } catch (err) {
        setResetting(false);
        console.error("Could not clear account progress", err);
        window.alert(
          "Couldn't reach your account to delete the saved copy, so nothing was reset. Check your connection and try again.",
        );
        return;
      }
      setResetting(false);
    }
    resetAllProgress();
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-pixel text-xl">Trainer card</h1>
        <StorageNotice />
      </div>

      <section className="pixel-panel flex flex-wrap items-center gap-6 p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-[var(--border)] bg-[var(--accent)] font-pixel text-sm text-[var(--accent-foreground)]">
          Lv{level}
        </div>
        <div className="min-w-[200px] flex-1">
          <div className="flex justify-between text-xs text-[var(--foreground-muted)]">
            <span>{xp} XP total</span>
            <span>
              {xpIntoLevel}/{xpForNextLevel} to next level
            </span>
          </div>
          <div className="mt-1 h-3 w-full overflow-hidden rounded-full border-2 border-[var(--border)] bg-black/10 dark:bg-white/10">
            <div
              className="h-full bg-[var(--accent)]"
              style={{ width: `${(xpIntoLevel / xpForNextLevel) * 100}%` }}
            />
          </div>
        </div>
        <div className="text-center">
          <p className="font-pixel text-lg">{streak}</p>
          <p className="text-xs text-[var(--foreground-muted)]">day streak</p>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-pixel text-sm">Your routes</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {examStats.map(({ exam, attemptCount, avg }) => (
            <Link
              key={exam.code}
              href={`/exams/${exam.code}/progress`}
              className="pixel-panel flex flex-col gap-2 p-5 hover:-translate-y-0.5 transition-transform"
            >
              <span className="font-pixel text-xs text-[var(--accent)]">
                {exam.code.toUpperCase()}
              </span>
              <p className="text-sm font-medium">{exam.title}</p>
              <p className="text-xs text-[var(--foreground-muted)]">
                {attemptCount === 0
                  ? "No attempts yet"
                  : `${attemptCount} quiz${attemptCount === 1 ? "" : "zes"} · ${avg}% average`}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <button
        onClick={handleReset}
        disabled={resetting}
        className="w-fit rounded-md border border-red-600 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-600/10 disabled:opacity-50"
      >
        {resetting ? "Resetting…" : "Reset all progress"}
      </button>
    </div>
  );
}
