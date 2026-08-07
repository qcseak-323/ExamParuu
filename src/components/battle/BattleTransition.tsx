"use client";

import { useCallback, useRef, useState } from "react";
import { useSfx } from "@/components/AudioProvider";

/**
 * The stage-change beat: the screen darkens, the whoosh plays, and the next
 * stage is revealed as the dark lifts. `run(action)` fires the sound and the
 * overlay, performs `action` while the screen is fully dark, and clears the
 * overlay once the keyframe finishes.
 *
 * Timings follow .screen-fade in globals.css (700ms total, fully dark by
 * 30%). Under reduced motion the global animation kill collapses the overlay
 * instantly, and the action still runs on its timer.
 */
export function useBattleTransition() {
  const playSfx = useSfx();
  const [active, setActive] = useState(false);
  const pendingRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const run = useCallback(
    (action: () => void) => {
      playSfx("transition");
      setActive(true);
      pendingRef.current.forEach(clearTimeout);
      pendingRef.current = [
        setTimeout(action, 240),
        setTimeout(() => setActive(false), 720),
      ];
    },
    [playSfx],
  );

  const overlay = active ? (
    <div className="screen-fade" aria-hidden="true" />
  ) : null;

  return { run, overlay };
}
