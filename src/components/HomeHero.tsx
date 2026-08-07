"use client";

import { useSession } from "next-auth/react";
import { PAL_SPECIES, stageForLevel } from "@/lib/pals";
import { trainerAvatarSheet } from "@/lib/profile";
import { computeXp, computeLevel } from "@/lib/gamification";
import { useQuizAttempts, useFlashcardProgress } from "@/lib/storage";
import PalSprite from "@/components/PalSprite";
import StartPrompt from "@/components/StartPrompt";

/**
 * The home page's dominating canvas: the estuary drawn edge-to-edge
 * (`.hero-canvas`), the cast standing on the mud bank, and one brass start
 * button in the sky.
 *
 * Two casts, one scene. A visitor sees both trainers and the three starters —
 * the invitation is "pick a side". A signed-in trainer sees *their* avatar
 * standing beside *their* Paruu at its current stage, and the button reads
 * Continue instead of Start. Sprite positions are percentages of the canvas
 * so the lineup breathes with the viewport; the outer pair hides on phones
 * rather than overlapping.
 */
export default function HomeHero() {
  const { data: session, status } = useSession();
  const attempts = useQuizAttempts();
  const flashcardProgress = useFlashcardProgress();
  const { level } = computeLevel(computeXp(attempts, flashcardProgress));

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
    <section className="hero-canvas">
      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 sm:pt-12">
        <p className="text-label font-semibold uppercase tracking-[0.12em] text-[var(--foreground-soft)]">
          Free Microsoft cert prep
        </p>
        {signedIn ? (
          <>
            <h1 className="font-pixel mt-2 text-hero lg:text-[3.5rem] lg:leading-none">
              Welcome back, trainer.
            </h1>
            <p className="prose-measure mt-3 hidden text-body-lg text-[var(--foreground-muted)] sm:block">
              {palName} is waiting on the flats. Pick up your route where you
              left it.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-pixel mt-2 text-hero lg:text-[3.5rem] lg:leading-none">
              Revision is a battle.
              <br />
              Bring a companion.
            </h1>
            <p className="prose-measure mt-3 hidden text-body-lg text-[var(--foreground-muted)] sm:block">
              Battle real practice questions, earn XP, and raise a creature
              from the Monsoon Belt while you learn.
            </p>
          </>
        )}
        <div className="mt-5">
          <StartPrompt label={signedIn ? "Continue your journey" : "Start your journey"} />
        </div>
      </div>

      {/* The cast on the bank. Decorative — the headline says everything. */}
      <div aria-hidden="true">
        {signedIn && stage ? (
          <>
            {avatarSheet && (
              <div
                className="hero-combatant"
                style={{ left: "14%", bottom: "20px" }}
              >
                <PalSprite sheet={avatarSheet} size={96} flip />
              </div>
            )}
            <div
              className="hero-combatant"
              style={{ left: avatarSheet ? "32%" : "16%", bottom: "16px" }}
            >
              <div className="pal-idle">
                <PalSprite sheet={stage.image} size={96} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div
              className="hero-combatant"
              style={{ left: "6%", bottom: "18px" }}
            >
              <PalSprite sheet="trainer-boy" size={96} flip />
            </div>
            {/* `hidden` lives on a wrapper: .hero-combatant's own display
                rule is unlayered CSS, which beats the layered utility. */}
            <div className="hidden sm:block">
              <div
                className="hero-combatant"
                style={{ left: "18%", bottom: "24px" }}
              >
                <PalSprite sheet="trainer-girl" size={96} flip />
              </div>
            </div>
            {(
              [
                { type: "fire", right: "8%", bottom: "16px", size: 96, always: true },
                { type: "water", right: "24%", bottom: "26px", size: 64, always: false },
                { type: "wood", right: "34%", bottom: "14px", size: 64, always: false },
              ] as const
            ).map(({ type, right, bottom, size, always }) => {
              const [starter] = PAL_SPECIES[type].stages;
              const combatant = (
                <div className="hero-combatant" style={{ right, bottom }}>
                  <div className="pal-idle">
                    <PalSprite sheet={starter.image} size={size} />
                  </div>
                </div>
              );
              return always ? (
                <span key={type}>{combatant}</span>
              ) : (
                <span key={type} className="hidden sm:block">
                  {combatant}
                </span>
              );
            })}
          </>
        )}
      </div>
    </section>
  );
}
