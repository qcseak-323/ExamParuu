"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { catalog } from "@/lib/content";
import {
  useQuizAttempts,
  useFlashcardProgress,
  useActivityDates,
  useLearningEvents,
  resetAllProgress,
} from "@/lib/storage";
import { clearProgressInDb } from "@/lib/actions";
import {
  computeXp,
  computeLevel,
  computeStreak,
  computeRedemptionXp,
} from "@/lib/gamification";
import { PAL_SPECIES, stageForLevel, nextStage } from "@/lib/pals";
import type { PalType } from "@/lib/pals";
import PixelSprite from "@/components/PixelSprite";
import StorageNotice from "@/components/StorageNotice";

export default function ProgressClient({
  palType,
  palNickname,
}: {
  palType: PalType;
  palNickname: string | null;
}) {
  const [resetting, setResetting] = useState(false);
  const attempts = useQuizAttempts();
  const flashcardProgress = useFlashcardProgress();
  const activityDates = useActivityDates();
  const events = useLearningEvents();

  const xp = computeXp(attempts, flashcardProgress, events, activityDates);
  const { level, xpIntoLevel, xpForNextLevel } = computeLevel(xp);
  const streak = computeStreak(activityDates);
  // Worth showing on its own: it's the number that says "you closed a gap",
  // which is the thing the whole review loop is trying to produce.
  const redeemed = computeRedemptionXp(attempts) / 25;

  const species = PAL_SPECIES[palType];
  const stage = stageForLevel(palType, level);
  const upcoming = nextStage(palType, level);
  const displayName = palNickname ?? stage.name;

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
                  (examAttempts.reduce(
                    (s, a) => s + a.correctCount / a.numQuestions,
                    0,
                  ) /
                    examAttempts.length) *
                    100,
                );
          return { exam, attemptCount: examAttempts.length, avg };
        }),
    [attempts],
  );

  async function handleReset() {
    const scope =
      "This will permanently delete your battle history, flashcard mastery, and streak data from your account and every device. Your ExamPal stays with you. Continue?";

    if (typeof window === "undefined" || !window.confirm(scope)) return;

    // Order matters: clear the account copy first, otherwise the next sync
    // pulls everything straight back and the reset looks like it failed.
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
    resetAllProgress();
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-pixel text-display">Trainer card</h1>
        <StorageNotice />
      </div>

      <section className="pixel-panel flex flex-wrap items-center gap-6 p-6">
        <div className="flex flex-col items-center gap-1">
          <div className="pal-idle">
            <PixelSprite
              sprite={stage.sprite}
              palette={species.palette}
              size={80}
              title={`${displayName}, your ${species.label}-type ExamPal`}
            />
          </div>
          <p className="font-pixel text-label">{displayName}</p>
          <p className="text-caption text-[var(--foreground-muted)]">
            {species.label} · {stage.name}
          </p>
        </div>

        <div className="min-w-[200px] flex-1">
          <div className="flex justify-between text-caption text-[var(--foreground-muted)]">
            <span>Lv.{level} · {xp} XP total</span>
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
          <p className="mt-2 text-caption text-[var(--foreground-muted)]">
            {upcoming
              ? `${upcoming.levelsAway} more level${upcoming.levelsAway === 1 ? "" : "s"} until ${displayName} evolves into ${upcoming.stage.name}.`
              : `${displayName} has reached its final form.`}
          </p>
        </div>

        <div className="text-center">
          <p className="font-pixel text-title">{streak}</p>
          <p className="text-caption text-[var(--foreground-muted)]">day streak</p>
        </div>

        <div className="text-center">
          <p className="font-pixel text-title">{redeemed}</p>
          <p className="text-caption text-[var(--foreground-muted)]">
            gaps closed
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-pixel text-title">Your routes</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {examStats.map(({ exam, attemptCount, avg }) => (
            <Link
              key={exam.code}
              href={`/exams/${exam.code}/progress`}
              className="pixel-panel flex flex-col gap-2 p-5 hover:-translate-y-0.5 transition-transform"
            >
              <span className="font-pixel text-label text-[var(--accent)]">
                {exam.code.toUpperCase()}
              </span>
              <p className="text-body font-medium">{exam.title}</p>
              <p className="text-caption text-[var(--foreground-muted)]">
                {attemptCount === 0
                  ? "No battles yet"
                  : `${attemptCount} battle${attemptCount === 1 ? "" : "s"} · ${avg}% average`}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <button
        onClick={handleReset}
        disabled={resetting}
        className="w-fit rounded-md border border-[var(--danger)] px-4 py-2 text-body font-medium text-[var(--danger)] hover:bg-[var(--danger)]/10 disabled:opacity-50"
      >
        {resetting ? "Resetting…" : "Reset all progress"}
      </button>
    </div>
  );
}
