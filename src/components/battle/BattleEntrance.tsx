"use client";

import { useEffect, useRef } from "react";
import { GLITCHLING, GLITCHLING_PALETTE } from "@/lib/pals";
import { usePreferences } from "@/lib/preferences";
import { trainerAvatarSheet } from "@/lib/profile";
import PalSprite from "@/components/PalSprite";
import PixelSprite from "@/components/PixelSprite";
import FighterSprite from "@/components/battle/FighterSprite";
import type { Fighter } from "@/lib/guardians";

/**
 * What the blackout lifts on.
 *
 * The trainer strides in from the left, the wild Paruu from the right, and
 * once both have landed the banner names the thing you are about to fight.
 * Then it gets out of the way and the battle scene is underneath.
 *
 * The slide is delayed rather than immediate: this mounts while the screen is
 * still black (the caller starts it at BLACKOUT_DARK_MS) and the entrance is
 * worth nothing if it happens behind the dark. ENTRANCE_DELAY_MS holds the
 * cast off-screen until the blackout has essentially cleared, which is why it
 * is expressed in CSS as an animation-delay and not as another timer here —
 * one clock for the animation, one for the dismissal.
 *
 * `onDone` is what advances the battle, so it must fire whatever happens:
 * the timer below is the guarantee, and the skip button is the courtesy.
 */

/** Must match .entrance-side / .entrance-banner in globals.css. */
const ENTRANCE_MS = 1750;
/** Reduced motion kills the slide, so there is nothing to wait for. */
const ENTRANCE_REDUCED_MS = 650;

export default function BattleEntrance({
  fighter,
  trainerAvatar,
  trainerName,
  foeName,
  onDone,
}: {
  /** Fallback for the left side on profiles predating the avatar step. */
  fighter: Fighter;
  trainerAvatar: string | null;
  trainerName: string | null;
  /** The wild opponent, named the way the battle scene names it. */
  foeName: string;
  onDone: () => void;
}) {
  const prefs = usePreferences();
  const avatarSheet = trainerAvatarSheet(trainerAvatar);

  // The dismissal timer must survive a re-render. Callers pass `onDone` as an
  // inline arrow, so depending on it directly would restart the countdown
  // every render — and a battle that never starts is the worst possible bug
  // to ship here. The ref is written from an effect, never during render,
  // which is what `react-hooks/refs` requires.
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  useEffect(() => {
    const id = setTimeout(
      () => doneRef.current(),
      prefs.reducedMotion ? ENTRANCE_REDUCED_MS : ENTRANCE_MS,
    );
    return () => clearTimeout(id);
  }, [prefs.reducedMotion]);

  return (
    <button
      type="button"
      onClick={onDone}
      aria-label="Skip the encounter introduction"
      className="battle-entrance"
    >
      {/* Spans, not a div and a p: a button only takes phrasing content, and
          this whole overlay is a button so it can be skipped from the
          keyboard. Both are given their block/flex display in CSS. */}
      <span className="entrance-cast">
        <span className="entrance-side entrance-side--left">
          {/* The trainer if they have a sprite, otherwise the Paruu they are
              sending out — a profile from before the avatar step still gets
              someone walking on from the left. */}
          {avatarSheet ? (
            <PalSprite sheet={avatarSheet} size={96} />
          ) : (
            <FighterSprite fighter={fighter} size={96} />
          )}
        </span>

        <span className="entrance-side entrance-side--right">
          <PixelSprite
            sprite={GLITCHLING}
            palette={GLITCHLING_PALETTE}
            size={96}
          />
        </span>
      </span>

      <span className="entrance-banner dialogue-text px-4 text-center text-[var(--foreground)]">
        {trainerName ? `${trainerName}! ` : ""}A wild {foeName} appeared!
      </span>
    </button>
  );
}
