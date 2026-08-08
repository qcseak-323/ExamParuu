"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { PAL_SPECIES, stageForLevel } from "@/lib/pals";
import { trainerAvatarSheet } from "@/lib/profile";
import { computeXp, computeLevel } from "@/lib/gamification";
import { useQuizAttempts, useFlashcardProgress } from "@/lib/storage";
import { usePreferences } from "@/lib/preferences";
import type { SheetId } from "@/lib/assets";
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
  sheet: SheetId;
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

export type TierSummary = {
  label: string;
  /** The first few exam codes in the tier, playable ones first. */
  codes: string[];
  /** How many exams the tier holds in total. */
  total: number;
};

export default function HomeHero({ tiers }: { tiers: TierSummary[] }) {
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
        {/* Sky props sit over the gradient and under the copy. Suppressed
            entirely under reduced motion rather than merely frozen: a still
            cloud earns nothing, and not rendering it means the PNG is never
            fetched. Same call HomeHero already makes for the runners. */}
        {!still && (
          <div className="sky-layer" aria-hidden="true">
            <span className="sky-prop sky-celestial" />
            <span className="sky-prop sky-cloud sky-cloud-1" />
            <span className="sky-prop sky-cloud--b sky-cloud-2" />
            <span className="sky-prop sky-cloud--far sky-cloud-3" />
          </div>
        )}

        {/* The treeline. Unlike the sky it is NOT suppressed under reduced
            motion — it does not move, and the mangroves are the setting
            rather than an effect. Rendered after the sky so the near rank
            occludes the clouds. Positions are hand-placed rather than
            random: React Compiler's purity rule forbids Math.random() in
            render, and a horizon that reshuffles every render would be
            worse than one that does not. */}
        <div className="tree-line" aria-hidden="true">
          <span className="tree tree--far tree--c" style={{ left: "6%" }} />
          <span className="tree tree--far tree--b" style={{ left: "17%" }} />
          <span className="tree tree--near tree--a" style={{ left: "2%" }} />
          <span className="tree tree--far tree--a" style={{ left: "31%" }} />
          <span className="tree tree--near tree--c" style={{ left: "22%" }} />
          <span className="tree tree--far tree--c" style={{ left: "45%" }} />
          <span className="tree tree--near tree--b" style={{ left: "38%" }} />
          <span className="tree tree--far tree--b" style={{ left: "58%" }} />
          <span className="tree tree--near tree--c" style={{ left: "52%" }} />
          <span className="tree tree--far tree--a" style={{ left: "71%" }} />
          <span className="tree tree--near tree--a" style={{ left: "66%" }} />
          <span className="tree tree--far tree--c" style={{ left: "84%" }} />
          <span className="tree tree--near tree--b" style={{ left: "80%" }} />
          <span className="tree tree--far tree--b" style={{ left: "94%" }} />
        </div>
        <div className="hero-content mx-auto grid max-w-5xl items-center gap-10 px-4 pb-20 pt-8 sm:pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div>
            <p className="text-label font-semibold uppercase tracking-[0.14em] text-[var(--foreground-soft)]">
              Free Microsoft cert prep
            </p>

            {signedIn ? (
              <>
                <h1 className="font-pixel mt-3 text-hero lg:text-[3.25rem] lg:leading-none">
                  Welcome back, trainer.
                </h1>
                <p className="prose-measure mt-4 text-body-lg text-[var(--foreground-muted)]">
                  {palName} is waiting on the flats.
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
                  Every battle is a real practice question. Correct answers
                  level your companion.
                </p>
              </>
            )}

            {/* One action, as wide as the column, with the secondary way in
                stacked under it rather than competing beside it. */}
            <div className="mt-6">
              <StartPrompt label={signedIn ? "Continue" : "Play"} />
              <div className="mt-3">
                <Link
                  href="/catalog"
                  className="tap-target text-body font-semibold underline hover:text-[var(--accent-ink)]"
                >
                  Browse exams →
                </Link>
              </div>
            </div>

            {/* The catalog's real depth: three tiers, a few codes each, and
                the count of what else is in there. */}
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {tiers.map((tier) => (
                <div key={tier.label} className="pixel-panel p-4">
                  <p className="font-pixel text-title">{tier.label}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tier.codes.map((code) => (
                      <span
                        key={code}
                        className="rounded border-2 border-[var(--border)] bg-[var(--panel-raised)] px-1.5 py-0.5 text-caption font-semibold"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                  {tier.total > tier.codes.length && (
                    <p className="mt-2 text-caption text-[var(--foreground-muted)]">
                      +{tier.total - tier.codes.length} more
                    </p>
                  )}
                </div>
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
          <span className="text-[var(--verdant-3)]">Correct = hit + XP</span>
          <span aria-hidden="true" className="opacity-40">
            ◆
          </span>
          <span className="text-[var(--ember-4)]">
            Wrong = a lesson you must read
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
