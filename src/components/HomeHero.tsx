"use client";

import { useSession } from "next-auth/react";
import { usePreferences } from "@/lib/preferences";
import { PAL_SPECIES, stageForLevel } from "@/lib/pals";
import { trainerMapSheet } from "@/lib/profile";
import { computeXp, computeLevel } from "@/lib/gamification";
import { useQuizAttempts, useFlashcardProgress } from "@/lib/storage";
import PalSprite from "@/components/PalSprite";
import StartPrompt from "@/components/StartPrompt";

/**
 * Landing v4 — the title screen.
 *
 * Sky, the game's name, one thing to press, and the two characters the whole
 * app is about standing underneath it. Nothing else.
 *
 * ── What the fold used to carry ──
 *
 * A packed horizon: three ranks of mangroves, four route towers, and the full
 * cast lined up as a group photo. It was a lot of world, and it buried the
 * thing a visitor is actually being asked to look at — the trainer and the
 * creature they are about to be given. Six figures reading left to right is a
 * cast list; two standing under the button is a proposition.
 *
 * The scenery is gone rather than shrunk, and the sky now fades out at its
 * foot instead of stopping on a hard line, so the fold ends by running out
 * rather than by hitting an edge.
 *
 * ── Who stands there ──
 *
 * A signed-in trainer sees their own avatar beside their own Paruu at its
 * current stage, and the button reads Continue. A visitor sees the default
 * pair. The personalisation is the point of putting them here at all.
 */
export default function HomeHero() {
  const { data: session, status } = useSession();
  const attempts = useQuizAttempts();
  const flashcardProgress = useFlashcardProgress();
  const { level } = computeLevel(computeXp(attempts, flashcardProgress));

  // The sky props drift on a loop. Under reduced motion they are suppressed
  // entirely rather than frozen: a still cloud earns nothing, and not
  // rendering it means the PNG is never fetched.
  const still = usePreferences().reducedMotion;

  const palType =
    status === "authenticated" ? (session?.user?.examPal ?? null) : null;
  const signedIn = palType !== null;
  const stage = palType ? stageForLevel(palType, level) : null;

  /**
   * The trainer, facing the reader.
   *
   * `trainerMapSheet`, not `trainerAvatarSheet`. The avatar sheets draw the
   * cast in profile — right for the battle arena, where two fighters face each
   * other, and wrong here, where the trainer is being introduced to the person
   * looking at the page and a figure in profile is looking past them at
   * nothing. The map sheets are the same two trainers generated Low Top-Down
   * and imported from the south rotation, which is the only front-facing pose
   * in the cast.
   *
   * Both this and the Paruu below are the trainer's own choices — the avatar
   * picked at setup, and their starter at whatever stage its level has reached.
   * A signed-out visitor gets the defaults.
   */
  const trainerSheet =
    (signedIn ? trainerMapSheet(session?.user?.trainerAvatar ?? null) : null) ??
    "map-boy";
  const palSheet = stage?.image ?? PAL_SPECIES.fire.stages[0].image;

  return (
    <section className="hero-canvas title-screen full-bleed">
      {!still && (
        <div className="sky-layer" aria-hidden="true">
          {/* One cloud shape, five instances. They differ by size, height,
              speed and — for the far one — opacity, never by art. Two shapes
              alternating across five clouds read as a repeating pair; one
              shape at five sizes reads as sky. */}
          <span className="sky-prop sky-celestial" />
          <span className="sky-prop sky-cloud sky-cloud-1" />
          <span className="sky-prop sky-cloud sky-cloud-2" />
          <span className="sky-prop sky-cloud--far sky-cloud-3" />
          <span className="sky-prop sky-cloud sky-cloud-4" />
          <span className="sky-prop sky-cloud sky-cloud-5" />
        </div>
      )}

      <div className="hero-content grid justify-items-center gap-5">
        <h1 className="font-pixel title-wordmark">ExamParuu</h1>

        <p className="title-tagline text-body-lg text-[var(--foreground-muted)]">
          The most fun you&rsquo;ll have preparing for a Microsoft cert.
        </p>

        <StartPrompt label={signedIn ? "Continue" : "Play"} />

        {/* The pair, directly under the button. Decorative: the trainer and
            the creature are the subject of the copy above rather than new
            information, and naming them here would make a screen reader
            announce two sprite labels between the action and its small
            print. */}
        <div className="title-cast" aria-hidden="true">
          <PalSprite sheet={trainerSheet} size={112} />
          <PalSprite sheet={palSheet} size={96} />
        </div>

        <p className="text-caption text-[var(--foreground-soft)]">
          Free · no paywall · 30 certifications · try one below without an
          account
        </p>
      </div>
    </section>
  );
}
