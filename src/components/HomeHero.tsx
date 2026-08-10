"use client";

import { useSession } from "next-auth/react";
import { usePreferences } from "@/lib/preferences";
import { PAL_SPECIES } from "@/lib/pals";
import { trainerAvatarSheet } from "@/lib/profile";
import type { SheetId } from "@/lib/assets";
import PalSprite from "@/components/PalSprite";
import StartPrompt from "@/components/StartPrompt";

/**
 * Landing v4 — the title screen, as a group photo.
 *
 * One screenful: the game's name, one thing to press, and the whole cast
 * standing together in front of a packed horizon of mangroves and towers.
 *
 * ── What the scene is made of, and what it is not ──
 *
 * It is NOT painted. Three radial gradients used to lay green banks along the
 * bottom for the trees to stand on, and they read as flat blobby shapes behind
 * the art rather than as ground. The horizon is now drawn entirely by the art:
 * two ranks of trees packed shoulder to shoulder with the seven route towers
 * standing among them. Density is what makes it a landscape — a sparse row of
 * trees on a painted hill is a diagram of a landscape.
 *
 * The cast stands in the middle facing out, overlapping, feet on one line.
 * They used to sprint across a separate strip of sand on an infinite loop,
 * which put two or three figures in a lot of empty ground; standing them
 * together is the answer that strip was reaching for.
 *
 * ── Positions are hand-placed ──
 *
 * React Compiler's purity rule forbids Math.random() in render, and a horizon
 * that reshuffles on every render would be worse than one that does not. The
 * far rank is laid on an even spacing and the near rank offset against it, so
 * the two never line up into visible columns.
 */

/** Distant rank: 32px, highest up the frame, most faded. */
const DISTANT_TREES: { left: number; kind: "a" | "b" | "c" }[] = [
  { left: 2, kind: "c" }, { left: 8, kind: "a" }, { left: 13, kind: "b" },
  { left: 18, kind: "c" }, { left: 24, kind: "a" }, { left: 29, kind: "b" },
  { left: 34, kind: "c" }, { left: 39, kind: "a" }, { left: 45, kind: "b" },
  { left: 50, kind: "c" }, { left: 55, kind: "a" }, { left: 61, kind: "b" },
  { left: 66, kind: "c" }, { left: 71, kind: "a" }, { left: 77, kind: "b" },
  { left: 82, kind: "c" }, { left: 87, kind: "a" }, { left: 93, kind: "b" },
];

/** Far rank: 48px, pushed back by a brightness/saturate shift. */
const FAR_TREES: { left: number; kind: "a" | "b" | "c" }[] = [
  { left: -1, kind: "b" }, { left: 4, kind: "a" }, { left: 9, kind: "c" },
  { left: 14, kind: "b" }, { left: 19, kind: "a" }, { left: 25, kind: "c" },
  { left: 30, kind: "b" }, { left: 35, kind: "a" }, { left: 40, kind: "c" },
  { left: 46, kind: "b" }, { left: 51, kind: "a" }, { left: 56, kind: "c" },
  { left: 61, kind: "b" }, { left: 67, kind: "a" }, { left: 72, kind: "c" },
  { left: 77, kind: "b" }, { left: 82, kind: "a" }, { left: 88, kind: "c" },
  { left: 93, kind: "b" }, { left: 97, kind: "a" },
];

/** Near rank: 96px, full colour, offset off the far rank's rhythm. */
const NEAR_TREES: { left: number; kind: "a" | "b" | "c" }[] = [
  { left: 1, kind: "a" }, { left: 8, kind: "c" }, { left: 16, kind: "b" },
  { left: 23, kind: "a" }, { left: 31, kind: "c" }, { left: 45, kind: "b" },
  { left: 53, kind: "a" }, { left: 60, kind: "c" }, { left: 68, kind: "b" },
  { left: 75, kind: "a" }, { left: 83, kind: "c" }, { left: 90, kind: "b" },
];

/**
 * The towers, spread across the horizon. Four of the seven — all seven would
 * turn a skyline into a street, and the Belt is meant to feel like somewhere
 * you travel between rather than a terrace.
 */
const BUILDINGS: { left: number; code: string; size: 96 | 64 }[] = [
  { left: 12, code: "az-900", size: 96 },
  { left: 38, code: "sc-900", size: 64 },
  { left: 64, code: "pl-900", size: 96 },
  { left: 86, code: "ab-900", size: 64 },
];

export default function HomeHero() {
  const { data: session, status } = useSession();
  const signedIn =
    status === "authenticated" && Boolean(session?.user?.examPal);

  // The sky props drift on a loop. Under reduced motion they are suppressed
  // entirely rather than frozen: a still cloud earns nothing, and not
  // rendering it means the PNG is never fetched.
  const still = usePreferences().reducedMotion;

  // A signed-in trainer stands in their own group photo.
  const ownTrainer = signedIn
    ? trainerAvatarSheet(session?.user?.trainerAvatar ?? null)
    : null;

  /**
   * Feet on one line, overlapping, people taller than creatures.
   *
   * Sized well above the 96px trees behind them. At the same scale as the
   * scenery the group did not read as a group at all — the cast simply became
   * more things in the treeline. A group photo needs its subjects nearer the
   * camera than the background, and with no perspective to play with, size is
   * the only cue available.
   */
  const cast: { sheet: SheetId; size: number }[] = [
    { sheet: PAL_SPECIES.wood.stages[0].image, size: 104 },
    { sheet: "trainer-girl", size: 136 },
    { sheet: PAL_SPECIES.water.stages[0].image, size: 104 },
    { sheet: "professor", size: 136 },
    { sheet: PAL_SPECIES.fire.stages[0].image, size: 104 },
    { sheet: ownTrainer ?? "trainer-boy", size: 136 },
  ];

  return (
    <section className="hero-canvas title-screen full-bleed">
      {!still && (
        <div className="sky-layer" aria-hidden="true">
          <span className="sky-prop sky-celestial" />
          <span className="sky-prop sky-cloud sky-cloud-1" />
          <span className="sky-prop sky-cloud--b sky-cloud-2" />
          <span className="sky-prop sky-cloud--far sky-cloud-3" />
          <span className="sky-prop sky-cloud sky-cloud-4" />
          <span className="sky-prop sky-cloud--b sky-cloud-5" />
        </div>
      )}

      {/* NOT suppressed under reduced motion — none of it moves. The mangroves
          and the towers are the setting rather than an effect. Rendered after
          the sky so the near rank occludes the clouds: a cloud drifting in
          front of a tree nearer to the viewer is the one thing that would give
          the whole flat scene away. */}
      <div className="tree-line" aria-hidden="true">
        {DISTANT_TREES.map(({ left, kind }) => (
          <span
            key={`d${left}`}
            className={`tree tree--distant tree--${kind}`}
            style={{ left: `${left}%` }}
          />
        ))}

        {FAR_TREES.map(({ left, kind }) => (
          <span
            key={`f${left}`}
            className={`tree tree--far tree--${kind}`}
            style={{ left: `${left}%` }}
          />
        ))}

        {BUILDINGS.map(({ left, code, size }) => (
          /* Pixel art must not be resampled by the image optimizer; it ships
             as-authored, so a plain img is deliberate. */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={code}
            src={`/scenery/v1/${size === 96 ? 96 : 48}/dungeon-${code}.png`}
            width={size}
            height={size}
            alt=""
            draggable={false}
            className={`scenery-building ${size === 64 ? "scenery-building--far" : ""}`}
            style={{ left: `${left}%`, width: size, height: size }}
          />
        ))}

        {NEAR_TREES.map(({ left, kind }) => (
          <span
            key={`n${left}`}
            className={`tree tree--near tree--${kind}`}
            style={{ left: `${left}%` }}
          />
        ))}
      </div>

      {/* The group photo. Sits above the scenery and below the title. */}
      <div className="cast-group" aria-hidden="true">
        {cast.map(({ sheet, size }, i) => (
          <PalSprite key={`${sheet}-${i}`} sheet={sheet} size={size} />
        ))}
      </div>

      <div className="hero-content grid justify-items-center gap-5">
        <h1 className="font-pixel title-wordmark">ExamParuu</h1>

        <p className="title-tagline text-body-lg text-[var(--foreground-muted)]">
          Microsoft certification practice, as a creature-collecting RPG.
        </p>

        <StartPrompt label={signedIn ? "Continue" : "Play"} />

        <p className="text-caption text-[var(--foreground-soft)]">
          Free · no paywall · 30 certifications · try one below without an
          account
        </p>
      </div>
    </section>
  );
}
