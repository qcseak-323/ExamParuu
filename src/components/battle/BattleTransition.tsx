"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audio } from "@/lib/audio/engine";
import { usePreferences } from "@/lib/preferences";
import { useSfx } from "@/components/AudioProvider";

/**
 * The blackout: the screen goes to black under an intensifying cue, the next
 * stage is swapped in behind the dark, and the dark lifts on it.
 *
 * `run(action)` fires the sound and the overlay, performs `action` while the
 * screen is fully black, and clears the overlay when the keyframe finishes.
 * Every way into a battle or a lesson goes through this — the practice and
 * dungeon battle starts, the setup wizard's last step, and the navigation
 * links in TransitionLink.
 *
 * There are three variants and one is drawn at random per transition, so the
 * beat that plays a dozen times an hour doesn't wear a groove. Each pairs a
 * shape of dark with a build that intensifies the same way: blinds/ladder,
 * iris/flutter, stagger/toll. The draw happens inside `run` — a click handler,
 * never render, because `react-hooks/purity` forbids Math.random during a
 * render and would fail the build.
 *
 * The cue is BGM (it ducks the running loop and hands back to whatever is
 * playing on the other side); the whoosh is an effect. Firing both means the
 * transition still lands for someone who has turned one of the two off.
 */

/** Must match the .blackout keyframes in globals.css. */
export const BLACKOUT_MS = 1200;
/**
 * When the stage is swapped. Sits inside the fully-black window (32%–64%,
 * i.e. 384ms–768ms) with room either side, so nothing of the swap is ever
 * on screen.
 */
export const BLACKOUT_DARK_MS = 460;

const VARIANTS = [
  { name: "blinds", cue: "ladder" },
  { name: "iris", cue: "flutter" },
  { name: "stagger", cue: "toll" },
] as const;

type Variant = (typeof VARIANTS)[number];

export function useBattleTransition() {
  const playSfx = useSfx();
  const prefs = usePreferences();
  const [variant, setVariant] = useState<Variant | null>(null);
  const pendingRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // A transition whose component unmounts mid-flight (the setup wizard
  // navigating away is exactly that) would otherwise leave its timers to fire
  // against a dead component.
  useEffect(() => {
    const pending = pendingRef.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const run = useCallback(
    (action: () => void) => {
      const drawn = VARIANTS[Math.floor(Math.random() * VARIANTS.length)];

      playSfx("transition");
      audio.playCue(drawn.cue);
      setVariant(drawn);

      // Reduced motion kills the keyframes outright, so holding the stage
      // change back for half a second would just be half a second of nothing
      // happening. The cue still plays — it's sound, not motion.
      const swapAt = prefs.reducedMotion ? 0 : BLACKOUT_DARK_MS;
      const clearAt = prefs.reducedMotion ? 60 : BLACKOUT_MS + 20;

      pendingRef.current.forEach(clearTimeout);
      pendingRef.current = [
        setTimeout(action, swapAt),
        setTimeout(() => setVariant(null), clearAt),
      ];
    },
    [playSfx, prefs.reducedMotion],
  );

  const overlay = variant ? (
    <div className={`blackout blackout--${variant.name}`} aria-hidden="true">
      {variant.name === "blinds" && (
        <>
          <i className="blackout-band blackout-band--top" />
          <i className="blackout-band blackout-band--bottom" />
        </>
      )}
      {variant.name === "iris" && <i className="blackout-iris" />}
      {variant.name === "stagger" && <i className="blackout-stagger" />}
    </div>
  ) : null;

  return { run, overlay };
}
