"use client";

import { GLITCHLING, GLITCHLING_PALETTE, PAL_SPECIES } from "@/lib/pals";
import { usePreferences } from "@/lib/preferences";
import PixelSprite from "@/components/PixelSprite";
import PalSprite from "@/components/PalSprite";

/**
 * The landing-page scene: a starter facing a wild Glitchling across the
 * estuary. The backdrop is pure CSS gradients (`.hero-scene`) — sky,
 * mangrove stands, brine, mud bank — so there is no image to load and the
 * scene follows the theme: Low Tide daylight on bright, rain on Storm Watch.
 *
 * The Glitchling is deliberately still matrix-rendered: it is the one
 * creature that *should* look like the old renderer. It's a glitch.
 */
export default function HeroScene() {
  const prefs = usePreferences();
  const still = prefs.reducedMotion;
  const starter = PAL_SPECIES.wood.stages[0];

  return (
    <div className="hero-scene" aria-hidden="true">
      {/* The wild one, on the far shore. */}
      <div
        className="hero-combatant"
        style={{ right: "12%", bottom: "112px" }}
      >
        <PixelSprite
          sprite={GLITCHLING}
          palette={GLITCHLING_PALETTE}
          size={64}
        />
      </div>

      {/* Your side of the bank. */}
      <div className="hero-combatant" style={{ left: "10%", bottom: "16px" }}>
        <div className={still ? "" : "pal-idle"}>
          <PalSprite sheet={starter.image} size={96} flip />
        </div>
      </div>
    </div>
  );
}
