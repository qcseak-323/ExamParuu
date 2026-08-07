"use client";

import Link from "next/link";
import { useMemo } from "react";
import { catalog } from "@/lib/content";
import {
  useQuizAttempts,
  useFlashcardProgress,
  useActivityDates,
  useLearningEvents,
} from "@/lib/storage";
import {
  computeXp,
  computeLevel,
  computeStreak,
  computeRedemptionXp,
} from "@/lib/gamification";
import { PAL_SPECIES, stageForLevel, nextStage } from "@/lib/pals";
import type { PalType } from "@/lib/pals";
import PalSprite from "@/components/PalSprite";
import ProfileDangerZone from "@/components/ProfileDangerZone";
import StorageNotice from "@/components/StorageNotice";

export default function ProgressClient({
  palType,
  palNickname,
  email,
}: {
  palType: PalType;
  palNickname: string | null;
  email: string | null;
}) {
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

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-pixel text-display">Trainer card</h1>
        <StorageNotice />
      </div>

      <section className="pixel-panel flex flex-wrap items-center gap-6 p-6">
        <div className="flex flex-col items-center gap-1">
          <div className="pal-idle">
            <PalSprite
              sheet={stage.image}
              size={96}
              title={`${displayName}, your ${species.label}-line ExamPal`}
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
          <div className="hp-track mt-1">
            <div
              className="hp-fill hp-fill--xp"
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
              <span className="font-pixel text-label text-[var(--accent-ink)]">
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

      {/* Replaces the old bare "Reset all progress" button. That reset kept
          the ExamPal; the restart in here releases it too, and the delete is
          the full account-removal contract shared with Preferences. */}
      <ProfileDangerZone email={email} />
    </div>
  );
}
