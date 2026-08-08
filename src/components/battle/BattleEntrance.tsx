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
 * The trainer strides in from the left, the wild Paruu answers from the
 * right, and once both have landed the banner names the thing you are about
 * to fight. Then it gets out of the way and the battle scene is underneath.
 *
 * The slide is delayed rather than immediate: this mounts while the screen is
 * still black (the caller starts it at BLACKOUT_DARK_MS) and the entrance is
 * worth nothing if it happens behind the dark. The delays live in CSS as
 * animation-delay, not as timers here, so there is one clock for the
 * choreography and one for the dismissal.
 *
 * At five seconds the skip stops being a courtesy and becomes a requirement,
 * so it is a real button in the top right rather than a click-anywhere
 * affordance — discoverable, reachable from the keyboard, and impossible to
 * trigger by accident while watching.
 *
 * `onDone` is what advances the battle, so it must fire whatever happens: the
 * timer below is the guarantee, the button is the escape.
 */

/** Must match the choreography in globals.css. */
const ENTRANCE_MS = 5000;
/**
 * Reduced motion kills the slide and the bob, so nothing unfolds and there is
 * nothing to watch — holding the full five seconds would be five seconds of a
 * still image. The banner is already readable in a fraction of that.
 */
const ENTRANCE_REDUCED_MS = 2000;

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
  /**
   * The opponent as a sentence fragment — this goes after "A wild", so pass
   * "DP-600", never the HP bar's "WILD DP-600" nameplate.
   */
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
    <div className="battle-entrance">
      <button
        type="button"
        onClick={onDone}
        className="entrance-skip text-caption uppercase tracking-[0.08em]"
      >
        Skip ▶▶
      </button>

      <div className="entrance-cast">
        <span className="entrance-side entrance-side--left">
          <span className="entrance-idle">
            {/* The trainer if they have a sprite, otherwise the Paruu they
                are sending out — a profile from before the avatar step still
                gets someone walking on from the left. */}
            {avatarSheet ? (
              <PalSprite sheet={avatarSheet} size={96} />
            ) : (
              <FighterSprite fighter={fighter} size={96} />
            )}
          </span>
        </span>

        <span className="entrance-side entrance-side--right">
          <span className="entrance-idle">
            <PixelSprite
              sprite={GLITCHLING}
              palette={GLITCHLING_PALETTE}
              size={96}
            />
          </span>
        </span>
      </div>

      <p className="entrance-banner dialogue-text px-4 text-center text-[var(--foreground)]">
        {trainerName ? `${trainerName}! ` : ""}A wild {foeName} appeared!
      </p>
    </div>
  );
}
