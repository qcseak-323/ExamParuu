"use client";

import { useEffect, useState } from "react";
import { RUNNER_FRAMES, RUNNER_PALETTE } from "@/lib/heroSprites";
import { usePreferences } from "@/lib/preferences";
import PixelSprite from "@/components/PixelSprite";

const FRAME_MS = 140;

/**
 * The landing-page backdrop: a trainer running a road under a blue sky.
 *
 * Everything is drawn — flat colour bands, CSS-gradient clouds, and a road
 * whose markings are a repeating gradient that scrolls. There is no image
 * file, which keeps it consistent with the sprite system and means the whole
 * scene costs nothing to load.
 *
 * The runner stays put and the world moves past, which is how side-scrollers
 * of this era faked travel.
 */
export default function HeroScene() {
  const prefs = usePreferences();
  const still = prefs.reducedMotion;
  const [frame, setFrame] = useState(0);

  // The run cycle is driven from JS rather than CSS because the two frames
  // are separate SVGs, not offsets into one sprite sheet.
  useEffect(() => {
    if (still) return;
    const id = setInterval(
      () => setFrame((f) => (f + 1) % RUNNER_FRAMES.length),
      FRAME_MS,
    );
    return () => clearInterval(id);
  }, [still]);

  return (
    <div className="hero-scene" aria-hidden="true">
      <div className="hero-sun" />

      <div className={`hero-clouds ${still ? "" : "hero-clouds-drift"}`} />

      <div className="hero-hills" />

      <div className="hero-road">
        <div className={`hero-road-line ${still ? "" : "hero-road-scroll"}`} />
      </div>

      <div className={`hero-runner ${still ? "" : "hero-runner-bob"}`}>
        <PixelSprite
          sprite={RUNNER_FRAMES[frame]}
          palette={RUNNER_PALETTE}
          size={112}
        />
      </div>
    </div>
  );
}
