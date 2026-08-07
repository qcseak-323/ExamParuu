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
import { computeRegionBadges, deriveTrainerTitle } from "@/lib/regions";
import { isProvingPassed } from "@/lib/gamification";
import {
  allGuardians,
  guardianFighter,
  isGuardianOwned,
  GUARDIAN_SILHOUETTE,
} from "@/lib/guardians";
import { trainerAvatarSheet, type TrainerAvatar } from "@/lib/profile";
import type { PalType } from "@/lib/pals";
import PalSprite from "@/components/PalSprite";
import PixelSprite from "@/components/PixelSprite";
import FighterSprite from "@/components/battle/FighterSprite";
import ProfileDangerZone from "@/components/ProfileDangerZone";
import StorageNotice from "@/components/StorageNotice";

export default function ProgressClient({
  palType,
  palNickname,
  trainerAvatar,
  email,
}: {
  palType: PalType;
  palNickname: string | null;
  trainerAvatar: TrainerAvatar | null;
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
        {/* Standing in the Belt, derived from clears/badges/seals. */}
        <p className="mt-1 text-label font-semibold uppercase tracking-[0.1em] text-[var(--accent-ink)]">
          {deriveTrainerTitle(attempts)}
        </p>
        <StorageNotice />
      </div>

      <section className="pixel-panel flex flex-wrap items-center gap-6 p-6">
        {trainerAvatar && (
          <div className="flex flex-col items-center gap-1">
            <PalSprite
              sheet={trainerAvatarSheet(trainerAvatar) ?? "trainer-boy"}
              size={96}
              title="Your trainer"
            />
            <p className="font-pixel text-label">You</p>
          </div>
        )}

        <div className="flex flex-col items-center gap-1">
          <div className="pal-idle">
            <PalSprite
              sheet={stage.image}
              size={96}
              title={`${displayName}, your ${species.label}-line Paruu`}
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

        <div className="text-center">
          <p className="font-pixel text-title">
            {
              catalog.filter(
                (e) => e.hasContent && isProvingPassed(e.code, attempts),
              ).length
            }
          </p>
          <p className="text-caption text-[var(--foreground-muted)]">
            Proving seals
          </p>
        </div>
      </section>

      {/* The full team: the starter line as it evolves, then one slot per
          dungeon guardian. Everything derived — evolution from level,
          guardians from cleared dungeons — nothing stored. */}
      <section>
        <h2 className="mb-4 font-pixel text-title">Your Paruu</h2>
        <div className="pixel-panel grid grid-cols-2 gap-5 p-5 sm:grid-cols-3 lg:grid-cols-5">
          {species.stages.map((s) => {
            const reached = level >= s.minLevel;
            return (
              <div
                key={s.name}
                className="flex flex-col items-center gap-1 text-center"
              >
                <PalSprite
                  sheet={s.image}
                  size={64}
                  title={reached ? s.name : `Unevolved form`}
                  className={reached ? "" : "opacity-30 grayscale"}
                />
                <p className="text-caption font-semibold">
                  {reached ? s.name : "???"}
                </p>
                <p className="text-caption text-[var(--foreground-muted)]">
                  {reached
                    ? s.name === stage.name
                      ? `${species.label} line · with you now`
                      : `${species.label} line`
                    : `Evolves at Lv.${s.minLevel}`}
                </p>
              </div>
            );
          })}

          {allGuardians().map((guardian) => {
            const owned = isGuardianOwned(guardian.examCode, attempts);
            return (
              <div
                key={guardian.examCode}
                className="flex flex-col items-center gap-1 text-center"
              >
                {owned ? (
                  <FighterSprite
                    fighter={guardianFighter(guardian)}
                    size={64}
                    title={`${guardian.name}, guardian of the ${guardian.examCode.toUpperCase()} dungeon`}
                  />
                ) : (
                  <PixelSprite
                    sprite={guardian.sprite}
                    palette={GUARDIAN_SILHOUETTE}
                    size={64}
                    title="An uncaught guardian"
                    className="opacity-50"
                  />
                )}
                <p className="text-caption font-semibold">
                  {owned ? guardian.name : "???"}
                </p>
                <p className="text-caption text-[var(--foreground-muted)]">
                  {owned
                    ? `Guardian · ${guardian.examCode.toUpperCase()}`
                    : `Clear the ${guardian.examCode.toUpperCase()} dungeon`}
                </p>
              </div>
            );
          })}
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

      {/* The badge case: one slot per regional gym. Earned by clearing the
          timed mock of every playable exam in the region — derived from
          attempts, nothing stored. */}
      <section>
        <h2 className="mb-4 font-pixel text-title">Badge case</h2>
        <div className="pixel-panel grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-6">
          {computeRegionBadges(attempts).map(({ region, earned, playable }) => (
            <div
              key={region.id}
              className={`flex flex-col items-center gap-2 text-center ${
                earned ? "" : "opacity-45"
              }`}
            >
              <div
                aria-hidden="true"
                className={`h-8 w-8 border-2 border-[var(--outline)] ${
                  earned ? region.glyphClass : "rounded-[3px] bg-[var(--well)]"
                }`}
              />
              <p className="text-caption font-semibold">{region.worldName}</p>
              <p className="text-caption text-[var(--foreground-muted)]">
                {earned
                  ? "Badge earned"
                  : playable > 0
                    ? "Clear every dungeon here"
                    : "Uncharted"}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Replaces the old bare "Reset all progress" button. That reset kept
          the Paruu; the restart in here releases it too, and the delete is
          the full account-removal contract shared with Preferences. */}
      <ProfileDangerZone email={email} />
    </div>
  );
}
