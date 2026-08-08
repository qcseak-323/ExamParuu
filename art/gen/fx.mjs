/**
 * Batch 2 — battle effects, wind and speed lines.
 *
 *   node --use-system-ca art/gen/fx.mjs [--dry] [--only=label,label]
 *
 * Covers three things at once:
 *
 *  1. **A live defect.** QuizClient.tsx renders
 *     `<span class="attack-bolt attack-bolt--fire">` with inline width, height
 *     and animationDelay — and `.attack-bolt` is defined NOWHERE in
 *     globals.css. No rule, no keyframes. Attacks currently render nothing at
 *     all. Four elemental bolts plus the CSS closes it.
 *  2. **Wishlist 9, "Wind UI pack"** — replaces `.wind-gusts::before`, a
 *     sliding repeating-linear-gradient.
 *  3. **Wishlist 6, "Speeding Line"** — replaces `.speed-lines`, likewise a
 *     gradient.
 *
 * TWO LESSONS FROM BATCH 1 ARE BAKED INTO THESE PROMPTS
 *
 * **Contrast.** The day scenery came back near-white on a pale sky and
 * measured 1.03:1 — invisible. These sit over `.battle-scene`, which is light
 * on Low Tide, so every prompt asks for saturated, high-contrast colour and a
 * dark outline rather than glow. Glow is the failure mode: it renders as a
 * soft alpha edge, and the alpha snap turns that into a hard ugly fringe.
 *
 * **Shape words pull in subjects.** "Towering thunderhead" produced a stalk
 * with a canopy — a mushroom, twice. Abstract effects are especially prone to
 * this, so "no creature, no character, no plant" is in the negative prompt and
 * each description says what the shape IS geometrically.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { runBatch } from "../lib/generate.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(HERE, "../..");

const STYLE =
  "pixel art game effect sprite, flat cel shading, bold saturated colour, " +
  "hard dark outline, crisp pixel edges, limited palette";

const NEGATIVE =
  "creature, character, animal, plant, tree, mushroom, face, realistic, " +
  "photographic, blurry, soft glow, gradient, text, watermark, background";

const SUBJECTS = [
  // --- the four attack bolts. fx is "fire" | "water" | "wood" | "brass",
  //     already chosen per fighter in guardians.ts.
  {
    key: "bolt-fire",
    desc:
      "A sharp diagonal shard of flame, deep orange and bright yellow, " +
      "angular flame tongues, pointing up-right, isolated on transparent.",
    seeds: [60101, 60168],
  },
  {
    key: "bolt-water",
    desc:
      "A sharp diagonal shard of water, deep teal and bright cyan, angular " +
      "droplet spray, pointing up-right, isolated on transparent.",
    seeds: [60235, 60302],
  },
  {
    key: "bolt-wood",
    desc:
      "A sharp diagonal shard of green energy with angular leaf blades, " +
      "deep green and bright lime, pointing up-right, isolated on transparent.",
    seeds: [60369, 60436],
  },
  {
    key: "bolt-brass",
    desc:
      "A sharp diagonal shard of brass-gold energy, dark bronze and bright " +
      "gold, angular metallic facets, pointing up-right, isolated on transparent.",
    seeds: [60503, 60570],
  },

  // --- impact and defeat. `.sprite-hit` and `.sprite-faint` are transform
  //     only today: a flicker and a fall, with nothing struck and nothing left
  //     behind.
  {
    key: "spark-hit",
    desc:
      "A small starburst impact spark, white core with bright yellow points, " +
      "eight sharp radiating spikes, symmetrical, isolated on transparent.",
    seeds: [60637, 60704],
  },
  {
    key: "dust-faint",
    desc:
      "A low puff of dust, three rounded sandy-brown clumps spreading " +
      "sideways, flat and wide, isolated on transparent.",
    seeds: [60771, 60838],
  },

  // --- wind and speed. Both replace sliding gradients.
  {
    key: "gust-1",
    desc:
      "Three horizontal curved wind streaks of varying length, pale blue-white " +
      "with a dark blue edge, tapering to points, isolated on transparent.",
    seeds: [60905, 60972],
  },
  {
    key: "gust-2",
    desc:
      "Two long horizontal curved wind streaks with a small spiral at one end, " +
      "pale blue-white with a dark blue edge, isolated on transparent.",
    seeds: [61039, 61106],
  },
  {
    key: "speed-line",
    desc:
      "A cluster of straight horizontal motion lines of varying length and " +
      "thickness, solid dark ink, tapering, isolated on transparent.",
    seeds: [61173, 61240],
  },
];

await runBatch(SUBJECTS, {
  appRoot: APP,
  outDir: path.join(HERE, "out/fx"),
  style: STYLE,
  negative: NEGATIVE,
  size: 192,
  endpoint: "pixflux",
});
