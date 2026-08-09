/**
 * The dungeon towers -> one recoloured building per route.
 *
 *   node scripts/build-dungeons.mjs [--dry]
 *
 * Four towers were generated; seven routes need one. Rather than let three
 * routes visibly share a building, each route's tower is mapped through its
 * own guardian's palette — so AZ-900's tower stands in Straitwing's blues and
 * DP-600's in Loomwing's reds, and the reuse stops being legible even where
 * two routes share a silhouette.
 *
 * This is why the dungeon cannot go through build-scenery.mjs: that script
 * cuts one candidate into one asset, and this one cuts four candidates into
 * seven, keyed on a palette that lives in the app rather than in picks.json.
 *
 * ── How the recolour works ──
 *
 * Luminance-ramp remap, the same idea as recolour-hair.mjs. Each opaque pixel
 * is placed in the image's own light-to-dark range, that position is bucketed,
 * and the bucket is painted with the guardian's palette entry at the matching
 * rank. Structure survives — the mass stays dark, the windows stay the
 * brightest thing on it — while every hue becomes the route's.
 *
 * **Buckets, not interpolation.** Blending between two ramp stops would give
 * smooth gradients, which is exactly what pixel art is not: the tier build
 * quantises to 16 colours anyway, and a gradient quantises into banding.
 * Bucketing to the ramp's own length lands on flat, in-palette colours by
 * construction.
 *
 * **Alpha is passed through untouched and then snapped.** The towers stand on
 * tangled roots with a lot of thin detail; anything that softens that edge
 * turns the silhouette to mush at the 48 tier.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePNG, encodePNG } from "../art/lib/png.mjs";
import { boxDownsample, quantise, countColours, coverage } from "../art/lib/pixel.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERSION = "v1";
const SIZES = [96, 48];
const COLOURS = 16;
const dry = process.argv.includes("--dry");

/**
 * Route -> which tower, mirroring art/picks.json's `dungeonByExam`.
 * Kept here as data rather than parsed out of the prose in that file, which
 * records *why* each pairing was made and is written for a human.
 */
const ROUTE_TOWER = {
  "az-900": "v1",
  "sc-900": "v1",
  "pl-900": "v2",
  "dp-600": "v2",
  "dp-900": "v3",
  "ab-900": "v4",
  "ai-901": "v4",
};

/**
 * The guardian palettes, lifted from src/lib/guardians.ts.
 *
 * Duplicated deliberately: this is a build script over raw PNGs and importing
 * a TypeScript module from the app would mean a compile step in the art
 * pipeline, which has stayed zero-dependency on purpose. `verifyPalettes`
 * below fails the build if the two ever drift.
 */
const PALETTES = {
  "az-900": ["#173B52", "#4FA3B8", "#9FD8DE", "#DCE8E1", "#F5C86B"],
  "ai-901": ["#1B2E3B", "#2E6B8C", "#9FD8DE", "#F5C86B", "#FFE66D"],
  "dp-900": ["#1F4A34", "#3E8455", "#6DB56A", "#A8D5C2", "#4FA3B8"],
  "dp-600": ["#7A2E1E", "#C4553B", "#E8863F", "#F5C86B", "#9FD8DE"],
  "sc-900": ["#26374A", "#4A6274", "#7E97A8", "#B7C6D1", "#F5C86B"],
  "ab-900": ["#7A2E1E", "#E8863F", "#F5C86B", "#FFE0A8", "#FFE66D"],
  "pl-900": ["#1F4A34", "#3E8455", "#6DB56A", "#A8D5C2", "#E8863F"],
};

/** Guard against this file and guardians.ts drifting apart. */
function verifyPalettes() {
  const src = fs.readFileSync(path.join(ROOT, "src/lib/guardians.ts"), "utf8");
  const bad = [];
  for (const [code, ramp] of Object.entries(PALETTES)) {
    for (const hex of ramp) {
      if (!src.includes(hex)) bad.push(`${code}: ${hex} is not in guardians.ts`);
    }
  }
  return bad;
}

const hexToRgb = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

/** Rec. 601 luma — closer to perceived brightness than a plain mean. */
const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

/** Brine deep — the dark theme's page colour, and the ramp's floor. */
const ABYSS = hexToRgb("#0C161E");

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/**
 * Repaint `pixels` through `ramp`, preserving relative brightness.
 * Returns a new RGBA buffer; the source is not touched.
 *
 * ── Why the ramp gets a floor bolted on ──
 *
 * Mapping straight onto the five guardian colours worked for the routes whose
 * palette happens to start dark — Straitwing opens on #173B52, and its tower
 * stayed a night-blue mass with lit windows. It failed badly for Beaconid,
 * whose darkest entry is #7A2E1E, a mid-brown: with no dark stop to land in,
 * the whole tower rose into the oranges and came out a bright gingerbread
 * house. That is the exact quality the towers were regenerated to fix.
 *
 * So the ramp is anchored: two extra stops below the palette, the guardian's
 * darkest hue carried most of the way to brine deep. Hue still says which
 * route this is; the floor guarantees there is a dark mass for the windows to
 * be bright against. Menace lives in the light-to-dark spread, and this keeps
 * the spread wide whatever palette it is handed.
 */
function recolour(pixels, ramp) {
  const sorted = ramp
    .map(hexToRgb)
    .map((rgb) => ({ rgb, l: luma(...rgb) }))
    .sort((a, b) => a.l - b.l)
    .map((s) => s.rgb);

  const darkest = sorted[0];
  const stops = [mix(darkest, ABYSS, 0.82), mix(darkest, ABYSS, 0.5), ...sorted];

  // The source's own opaque luminance range, so a dark tower uses the whole
  // ramp rather than bunching into its bottom two stops.
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    const l = luma(pixels[i], pixels[i + 1], pixels[i + 2]);
    if (l < lo) lo = l;
    if (l > hi) hi = l;
  }
  if (!Number.isFinite(lo) || hi <= lo) return Uint8Array.from(pixels);

  const out = new Uint8Array(pixels.length);
  const last = stops.length - 1;
  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3];
    if (a < 128) {
      out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0;
      continue;
    }
    const t = (luma(pixels[i], pixels[i + 1], pixels[i + 2]) - lo) / (hi - lo);
    const stop = stops[Math.min(last, Math.round(t * last))];
    out[i] = stop[0];
    out[i + 1] = stop[1];
    out[i + 2] = stop[2];
    out[i + 3] = 255;
  }
  return out;
}

const drift = verifyPalettes();
if (drift.length) {
  console.error("palettes have drifted from src/lib/guardians.ts:");
  for (const d of drift) console.error(`  ${d}`);
  process.exit(1);
}

if (!dry) {
  for (const s of SIZES) {
    fs.mkdirSync(path.join(ROOT, "public/scenery", VERSION, String(s)), { recursive: true });
  }
}

console.log(`\ndungeons -> public/scenery/${VERSION}/{${SIZES.join(",")}}\n`);
console.log("route".padEnd(10) + "tower".padEnd(8) + SIZES.map((s) => `${s}px`.padEnd(14)).join(""));

const problems = [];

for (const [code, variant] of Object.entries(ROUTE_TOWER)) {
  const file = path.join(ROOT, "art/gen/out/dungeon", `dungeon-${variant}.png`);
  if (!fs.existsSync(file)) {
    problems.push(`missing candidate: dungeon-${variant}.png`);
    continue;
  }

  const { width, height, pixels } = decodePNG(fs.readFileSync(file));
  const painted = recolour(pixels, PALETTES[code]);

  let row = code.padEnd(10) + variant.padEnd(8);
  for (const s of SIZES) {
    const small = quantise(boxDownsample(painted, width, height, s, s), COLOURS);
    // Binary alpha: the downsample feathers the roots, and a soft edge on a
    // 48px building reads as blur rather than as detail.
    for (let i = 3; i < small.length; i += 4) small[i] = small[i] < 128 ? 0 : 255;
    if (!dry) {
      fs.writeFileSync(
        path.join(ROOT, "public/scenery", VERSION, String(s), `dungeon-${code}.png`),
        encodePNG(s, s, small),
      );
    }
    row += `${countColours(small)}c ${(coverage(small) * 100).toFixed(0)}%`.padEnd(14);
  }
  console.log(row);
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(dry ? "\ndry run — nothing written" : `\nwritten to public/scenery/${VERSION}`);
