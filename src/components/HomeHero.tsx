"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { PAL_SPECIES, stageForLevel } from "@/lib/pals";
import { trainerAvatarSheet } from "@/lib/profile";
import { computeXp, computeLevel } from "@/lib/gamification";
import { useQuizAttempts, useFlashcardProgress } from "@/lib/storage";
import { usePreferences } from "@/lib/preferences";
import PalSprite from "@/components/PalSprite";
import StartPrompt from "@/components/StartPrompt";
import BattleDemo from "@/components/BattleDemo";

/**
 * Landing v2: the hero is a playable pitch. Copy and one brass action on the
 * left, a real answerable question (BattleDemo) on the right, mangrove
 * mounds rising into the fold behind both. Below the fold line: the brine
 * strip, the sand the cast strolls along, and the equation strip stating
 * the rules of the game.
 *
 * Two casts, one scene. A visitor sees both trainers and the starters
 * strolling the sand; a signed-in trainer sees their own avatar walking
 * beside their own Paruu, and the button reads Continue instead of Start.
 */
/** One character sprinting the sand strip, trailed by speed lines. */
function Runner({
  sheet,
  size,
  duration,
  delay,
}: {
  sheet: string;
  size: number;
  duration: string;
  delay: string;
}) {
  return (
    <div
      className="runner"
      style={
        {
          "--runner-duration": duration,
          "--runner-delay": delay,
        } as React.CSSProperties
      }
    >
      <span className="speed-lines" aria-hidden="true" />
      <span className="runner-sprite">
        <PalSprite sheet={sheet} size={size} flip />
      </span>
    </div>
  );
}

export default function HomeHero({ examCodes }: { examCodes: string[] }) {
  const { data: session, status } = useSession();
  const attempts = useQuizAttempts();
  const flashcardProgress = useFlashcardProgress();
  const { level } = computeLevel(computeXp(attempts, flashcardProgress));
  // Runners traverse the viewport on an infinite loop — under reduced motion
  // that loop would strobe at the killed duration, so the cast simply stands.
  const still = usePreferences().reducedMotion;

  const palType =
    status === "authenticated" ? (session?.user?.examPal ?? null) : null;
  const signedIn = palType !== null;
  const stage = palType ? stageForLevel(palType, level) : null;
  const palName =
    session?.user?.examPalName ??
    (palType ? PAL_SPECIES[palType].stages[0].name : null);
  const avatarSheet = signedIn
    ? trainerAvatarSheet(session?.user?.trainerAvatar ?? null)
    : null;

  return (
    <div>
      <section className="hero-canvas full-bleed">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 pb-20 pt-8 sm:pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div>
            <p className="text-label font-semibold uppercase tracking-[0.14em] text-[var(--foreground-soft)]">
              Free Microsoft cert prep · no paywall
            </p>

            {signedIn ? (
              <>
                <h1 className="font-pixel mt-3 text-hero lg:text-[3.25rem] lg:leading-none">
                  Welcome back, trainer.
                </h1>
                <p className="prose-measure mt-4 text-body-lg text-[var(--foreground-muted)]">
                  {palName} is waiting on the flats. Pick up your route where
                  you left it — every battle is still a real practice
                  question.
                </p>
              </>
            ) : (
              <>
                <h1 className="font-pixel mt-3 text-hero lg:text-[3.25rem] lg:leading-none">
                  Play the game.
                  <br />
                  Pass the exam.
                </h1>
                <p className="prose-measure mt-4 text-body-lg text-[var(--foreground-muted)]">
                  A creature-raising game where every battle is a real
                  practice question. Correct answers land hits and level your
                  companion — playing is revising.
                </p>
              </>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-5">
              <StartPrompt label={signedIn ? "CONTINUE" : "START"} />
              <Link
                href="/catalog"
                className="tap-target text-body font-semibold underline hover:text-[var(--accent-ink)]"
              >
                Browse exams →
              </Link>
            </div>

            <p className="mt-3 text-caption text-[var(--foreground-soft)]">
              No paywall · Email sign-in · {examCodes.length} exams covered
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {examCodes.map((code) => (
                <span
                  key={code}
                  className="rounded-md border-2 border-[var(--border)] bg-[var(--panel)] px-2 py-1 text-caption font-semibold"
                >
                  {code.toUpperCase()}
                </span>
              ))}
            </div>
          </div>

          <BattleDemo />
        </div>
      </section>

      <div className="hero-water-strip full-bleed" aria-hidden="true" />

      {/* The cast sprints along the sand, speed lines trailing, wind gusting
          across the strip. Under reduced motion they stand instead. */}
      <div
        className={`hero-sand-strip full-bleed ${still ? "" : "wind-gusts"}`}
        aria-hidden="true"
      >
        {signedIn && stage ? (
          still ? (
            <>
              {avatarSheet && (
                <div
                  className="hero-combatant"
                  style={{ left: "14%", bottom: "26px" }}
                >
                  <PalSprite sheet={avatarSheet} size={64} flip />
                </div>
              )}
              <div
                className="hero-combatant"
                style={{ left: avatarSheet ? "30%" : "16%", bottom: "26px" }}
              >
                <PalSprite sheet={stage.image} size={64} />
              </div>
            </>
          ) : (
            <>
              {avatarSheet && (
                <Runner sheet={avatarSheet} size={64} duration="16s" delay="0s" />
              )}
              <Runner sheet={stage.image} size={64} duration="16s" delay="0.9s" />
            </>
          )
        ) : still ? (
          <>
            <div
              className="hero-combatant"
              style={{ left: "12%", bottom: "26px" }}
            >
              <PalSprite sheet="trainer-boy" size={64} flip />
            </div>
            <div
              className="hero-combatant"
              style={{ left: "88%", bottom: "26px" }}
            >
              <PalSprite sheet={PAL_SPECIES.fire.stages[0].image} size={48} />
            </div>
          </>
        ) : (
          <>
            <Runner sheet="trainer-boy" size={64} duration="16s" delay="0s" />
            <Runner
              sheet={PAL_SPECIES.fire.stages[0].image}
              size={48}
              duration="12.5s"
              delay="1.4s"
            />
            {/* `hidden` on wrappers: .runner's display is unlayered CSS. */}
            <div className="hidden sm:block">
              <Runner sheet="trainer-girl" size={64} duration="18s" delay="4s" />
            </div>
            <div className="hidden sm:block">
              <Runner
                sheet={PAL_SPECIES.wood.stages[0].image}
                size={48}
                duration="13.5s"
                delay="7s"
              />
            </div>
            <div className="hidden sm:block">
              <Runner
                sheet={PAL_SPECIES.water.stages[0].image}
                size={48}
                duration="14.5s"
                delay="10s"
              />
            </div>
          </>
        )}
      </div>

      {/* The rules of the game, in one line. Locked creature palette steps
          on the constant dark ink — ≥4.5:1 in both themes. */}
      <section className="equation-strip full-bleed">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-8 gap-y-1 px-4 py-4 text-center text-caption font-semibold uppercase tracking-[0.1em]">
          <span className="text-[var(--verdant-3)]">
            Correct answer = hit + XP
          </span>
          <span aria-hidden="true" className="opacity-40">
            ◆
          </span>
          <span className="text-[var(--ember-4)]">
            Wrong answer = a lesson you must read
          </span>
          <span aria-hidden="true" className="opacity-40">
            ◆
          </span>
          <span className="text-[var(--tide-4)]">
            Every session = closer to a pass
          </span>
        </div>
      </section>
    </div>
  );
}
