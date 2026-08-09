/**
 * Import a PixelLab character export (the .zip from the app) into the pipeline.
 *
 *   node scripts/import-pixellab.mjs <extracted-dir> <sheet-name> [--dry]
 *
 * PixelLab's character export is a directory of PNGs plus a metadata.json:
 *
 *   metadata.json
 *   <State>/rotations/{south,south-east,east,...}.png
 *   <State>/animations/<Clip>/<direction>/frame_000.png ...
 *
 * This reads that structure, picks the views the app actually uses, fits the
 * art to its frame, and writes the tiers and animation strips the renderer
 * expects. It is written against the format rather than against one export,
 * because more of these are coming.
 *
 * ── The three things it has to fix ──
 *
 * 1. **Fill.** Exports come out with the figure occupying a small share of
 *    the canvas — the first one measured 5%, a 16x46 body in a 96x96 frame.
 *    Rendered at 48px that is a 23px character in a 48px box, i.e. a speck
 *    surrounded by nothing. Every frame is cropped to the UNION bounding box
 *    of the whole set and re-fitted, which enlarges the character without
 *    changing its proportions and without making frames jitter relative to
 *    one another.
 *
 * 2. **Anchor.** Frames are cropped against the union box, never their own.
 *    Cropping each frame to its own content would centre a running figure
 *    differently every frame and the sprite would vibrate against a still
 *    background.
 *
 * 3. **Palette.** One median cut over the pooled pixels of every frame, then
 *    each frame mapped through that single palette. Quantising frames
 *    independently gives each its own 16 colours and the sprite's colours
 *    crawl visibly frame to frame.
 *
 * ── What it deliberately does not fix ──
 *
 * Colour and perspective. If an export is near-greyscale, or is top-down when
 * the cast is side-view, that is a generation decision and no amount of
 * post-processing will make it belong. The script measures both and warns.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePNG, encodePNG } from "../art/lib/png.mjs";
import { boxDownsample, quantise, countColours, coverage, bbox } from "../art/lib/pixel.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [, , srcDir, sheet] = process.argv;
const dry = process.argv.includes("--dry");

if (!srcDir || !sheet) {
  console.error("usage: node scripts/import-pixellab.mjs <extracted-dir> <sheet-name> [--dry]");
  process.exit(1);
}

const SRC = path.resolve(srcDir);
const META = path.join(SRC, "metadata.json");
if (!fs.existsSync(META)) {
  console.error(`no metadata.json in ${SRC}`);
  process.exit(1);
}

const meta = JSON.parse(fs.readFileSync(META, "utf8"));
const state = meta.states?.[0];
if (!state) { console.error("metadata.json has no states"); process.exit(1); }

/**
 * The app draws characters in profile. In an 8-rotation export "east" is the
 * profile facing right, which is what PalSprite renders un-flipped.
 */
const PROFILE = "east";
const TIERS = [96, 48, 32];

/**
 * PixelLab clip folders are named by whoever made the export ("Running",
 * "Attack 2", "idle_v3"). The app's vocabulary is fixed — ClipId in
 * src/lib/assets.ts is "idle" | "run" | "battle" — so names are mapped here
 * rather than letting an export widen a union type in the app.
 * Anything unrecognised passes through lowercased and will fail the asset
 * check loudly, which is the right outcome: a clip the app cannot name is a
 * clip no call site can ask for.
 */
const CLIP_ALIASES = {
  running: "run", run: "run", walk: "run", walking: "run",
  idle: "idle", breathing: "idle",
  attack: "battle", attacking: "battle", battle: "battle", hurt: "battle",
};
const clipId = (name) => CLIP_ALIASES[name.toLowerCase()] ?? name.toLowerCase();
const COLOURS = 16;
/** Leave a transparent pixel all round so the dark-theme rim does not clip. */
const PAD = 2;

const load = (rel) => decodePNG(fs.readFileSync(path.join(SRC, rel)));

// ---- gather the frames we care about -------------------------------------

const rotations = state.frames?.rotations ?? {};
const anims = state.frames?.animations ?? {};

const picked = [];
if (rotations[PROFILE]) picked.push({ kind: "static", clip: null, rel: rotations[PROFILE] });
for (const [clip, byDir] of Object.entries(anims)) {
  const frames = byDir[PROFILE];
  if (!frames?.length) {
    console.log(`  skip clip "${clip}" — no ${PROFILE} direction in the export`);
    continue;
  }
  frames.forEach((rel) => picked.push({ kind: "clip", clip, rel }));
}
if (!picked.length) { console.error(`no ${PROFILE} frames found`); process.exit(1); }

const images = picked.map((p) => ({ ...p, img: load(p.rel) }));

// ---- union bounding box, so nothing jitters ------------------------------

let U = null;
for (const { img } of images) {
  const b = bbox(img.pixels, img.width, img.height);
  if (!b) continue;
  U = U
    ? { x0: Math.min(U.x0, b.x0), y0: Math.min(U.y0, b.y0),
        x1: Math.max(U.x1, b.x1), y1: Math.max(U.y1, b.y1) }
    : b;
}
if (!U) { console.error("every frame is transparent"); process.exit(1); }
U.w = U.x1 - U.x0 + 1; U.h = U.y1 - U.y0 + 1;

/**
 * Enlarge by an INTEGER factor inside the original canvas, rather than
 * cropping tight and letting the tier build stretch the result.
 *
 * The first version of this cropped to the union box — 50px for a 25x46
 * figure — and then wrote a 96px tier from it. That is a 1.9x fractional
 * upscale: it invents pixels, and it does so with a box filter, so the
 * "improved" sprite was softer than the export it came from.
 *
 * Doubling instead is lossless in the only sense that matters for pixel art:
 * every source pixel becomes an exact 2x2 block, nothing is interpolated, and
 * the canvas stays 96 so the 96/48/32 tiers remain clean divisors. The figure
 * still gets bigger — which was the actual goal — it just gets bigger by a
 * whole number.
 *
 * PAD is a preference, not a constraint, and the difference is load-bearing.
 * Importing the trainer with a run clip made the union box ONE pixel taller
 * than importing it without — 92 to 93 — because a running limb reaches
 * further than a standing one. Against a 188 canvas that is the difference
 * between (188-4)/92 = 2.0 and (188-4)/93 = 1.98, so flooring dropped the
 * whole doubling and the sprite went from 18% of its frame to 4%. Two pixels
 * of margin are not worth half the character, so the fit is measured against
 * the full canvas and the padding is applied only where it still fits.
 */
const side = images[0].img.width;
const fit = (avail) => Math.max(1, Math.min(
  Math.floor(avail / U.w),
  Math.floor(avail / U.h),
));
const scale = Math.max(fit(side - PAD * 2), fit(side));
// Where the enlarged figure lands: centred horizontally, sitting on the floor
// of the frame so a walking sprite does not appear to hover. `oy` cannot go
// negative — when the figure fills the canvas exactly, it sits flush.
const ox = Math.round((side - U.w * scale) / 2);
const oy = Math.max(0, side - PAD - U.h * scale);

/** Scale a frame's content by `scale` and place it at the shared anchor. */
function crop(img) {
  const out = new Uint8Array(side * side * 4);
  for (let y = 0; y < U.h * scale; y++) {
    for (let x = 0; x < U.w * scale; x++) {
      const sx = U.x0 + Math.floor(x / scale);
      const sy = U.y0 + Math.floor(y / scale);
      if (sx >= img.width || sy >= img.height) continue;
      const s = (sy * img.width + sx) * 4;
      if (img.pixels[s + 3] === 0) continue;
      const px = ox + x, py = oy + y;
      if (px < 0 || py < 0 || px >= side || py >= side) continue;
      const d = (py * side + px) * 4;
      out[d] = img.pixels[s]; out[d + 1] = img.pixels[s + 1];
      out[d + 2] = img.pixels[s + 2]; out[d + 3] = img.pixels[s + 3];
    }
  }
  return out;
}

const cropped = images.map((it) => ({ ...it, px: crop(it.img) }));

// ---- pooled palette, so colours do not crawl -----------------------------

const pool = new Uint8Array(cropped.reduce((n, c) => n + c.px.length, 0));
let at = 0;
for (const c of cropped) { pool.set(c.px, at); at += c.px.length; }

// ---- report before writing -----------------------------------------------

const first = cropped[0];
const srcSize = state.character?.size?.width ?? images[0].img.width;
let sat = 0, n = 0, lum = 0;
for (let i = 0; i < first.px.length; i += 4) {
  if (first.px[i + 3] === 0) continue;
  const mx = Math.max(first.px[i], first.px[i + 1], first.px[i + 2]);
  const mn = Math.min(first.px[i], first.px[i + 1], first.px[i + 2]);
  sat += mx === 0 ? 0 : (mx - mn) / mx;
  lum += 0.2126 * first.px[i] + 0.7152 * first.px[i + 1] + 0.0722 * first.px[i + 2];
  n++;
}
sat /= n; lum /= n;

console.log(`\n${sheet}  <-  ${state.character?.name ?? "?"}  (${state.character?.view ?? "?"} view, ${srcSize}px, ${state.character?.directions ?? "?"} directions)`);
console.log(`  profile "${PROFILE}", ${images.filter((i) => i.kind === "clip").length} animation frames across ${Object.keys(anims).length} clip(s)`);
console.log(`  union bbox ${U.w}x${U.h} -> scaled ${scale}x inside a ${side}px canvas, fill ${(coverage(first.px) * 100).toFixed(0)}% (was ${(coverage(images[0].img.pixels) * 100).toFixed(0)}%)`);

if (state.character?.view && !/side/i.test(state.character.view)) {
  console.log(`  ! view is "${state.character.view}"; the rest of the cast is side view`);
}
if (sat < 0.2) {
  console.log(`  ! mean saturation ${sat.toFixed(2)} — near-greyscale against a bright cast`);
}
if (lum < 90) {
  console.log(`  ! mean luminance ${lum.toFixed(0)} — will have low contrast on the dark theme`);
}

if (dry) { console.log("\ndry run — nothing written\n"); process.exit(0); }

// ---- write tiers and strips ----------------------------------------------

const VERSION = "v2";
const clips = {};
for (const t of TIERS) {
  fs.mkdirSync(path.join(ROOT, "public/pals", VERSION, String(t)), { recursive: true });
}

for (const t of TIERS) {
  // static
  const still = quantise(boxDownsample(first.px, side, side, t, t), COLOURS, pool);
  fs.writeFileSync(path.join(ROOT, "public/pals", VERSION, String(t), `${sheet}.png`), encodePNG(t, t, still));

  // one horizontal strip per clip
  for (const clip of Object.keys(anims)) {
    const frames = cropped.filter((c) => c.clip === clip);
    if (!frames.length) continue;
    const strip = new Uint8Array(t * frames.length * t * 4);
    frames.forEach((f, i) => {
      const small = quantise(boxDownsample(f.px, side, side, t, t), COLOURS, pool);
      for (let y = 0; y < t; y++) {
        for (let x = 0; x < t; x++) {
          const s = (y * t + x) * 4, d = (y * (t * frames.length) + i * t + x) * 4;
          strip[d] = small[s]; strip[d + 1] = small[s + 1];
          strip[d + 2] = small[s + 2]; strip[d + 3] = small[s + 3];
        }
      }
    });
    const name = `${sheet}--${clipId(clip)}`;
    fs.writeFileSync(
      path.join(ROOT, "public/pals", VERSION, String(t), `${name}.png`),
      encodePNG(t * frames.length, t, strip),
    );
    clips[clipId(clip)] = frames.length;
  }
}

console.log(`\n  wrote ${sheet}.png at ${TIERS.join("/")}`);
for (const [c, f] of Object.entries(clips)) {
  console.log(`  wrote ${sheet}--${c}.png  ${f} frames  (${TIERS.map((t) => `${t * f}x${t}`).join(", ")})`);
}
console.log(`\n  add to SHEETS in src/lib/assets.ts:`);
console.log(`    "${sheet}": { tiers: [${TIERS.join(", ")}], clips: { ${Object.entries(clips).map(([c, f]) => `${c}: ${f}`).join(", ")} } },\n`);
