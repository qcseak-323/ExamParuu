/**
 * Repaint a sprite's hair, deterministically.
 *
 *   node scripts/recolour-hair.mjs <in.png> <out.png> [--dry]
 *
 * WHY THIS EXISTS RATHER THAN ANOTHER GENERATION
 *
 * The trainer boy chains from trainer-girl so the two read as classmates, and
 * she is pink-haired. Asking for black hair failed three ways: in the
 * description, in the negative prompt, and with text_guidance_scale raised
 * from 8 to 12. The style reference kept winning, because holding the hair is
 * most of what a style reference at strength 35 DOES.
 *
 * Fighting that costs two generations per attempt and never converges. Hair
 * colour is a palette operation, so it is done here instead: exact colour,
 * repeatable, no re-roll, and the uniform and face are untouched.
 *
 * SEPARATING HAIR FROM SKIN, WHICH IS THE ONLY HARD PART
 *
 * Both are pink. Three signals together, none sufficient alone:
 *
 *   1. SATURATION. Hair is saturated pink; skin is a desaturated peach.
 *      This does most of the work but blush cheeks are saturated too.
 *   2. POSITION. Hair sits in the top third of the figure's bounding box.
 *      Blush sits below that, on the face. This is what excludes the cheeks.
 *   3. CONNECTIVITY. The kept pixels are flood-filled from the topmost
 *      qualifying run, so a stray saturated pixel elsewhere is dropped rather
 *      than repainted. Without this, a pink shirt trim recolours too.
 *
 * The replacement preserves relative luminance: each hair pixel keeps its
 * position in the hair's own light-to-dark range and is mapped onto a black
 * ramp. Flattening to one colour would delete the shading that makes it read
 * as hair rather than a silhouette.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePNG, encodePNG } from "../art/lib/png.mjs";
import { bbox } from "../art/lib/pixel.mjs";

const [, , inPath, outPath] = process.argv;
const dry = process.argv.includes("--dry");
if (!inPath || (!outPath && !dry)) {
  console.error("usage: node scripts/recolour-hair.mjs <in.png> <out.png> [--dry]");
  process.exit(1);
}

/** The black the hair becomes: darkest shadow to brightest highlight. */
const RAMP = [
  [0x14, 0x16, 0x1c],
  [0x20, 0x24, 0x2e],
  [0x2e, 0x34, 0x42],
  [0x44, 0x4c, 0x5e],
];

/** Saturation and value, 0..1, from 8-bit RGB. */
function sv(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return { s: max === 0 ? 0 : (max - min) / max, v: max / 255, max, min };
}

/** Pink-to-magenta hue, saturated enough to be dye rather than skin. */
function isHairish(r, g, b) {
  const { s, v } = sv(r, g, b);
  if (s < 0.22 || v < 0.15) return false;   // desaturated => skin or cloth
  if (r <= b) return false;                  // pinks are red-dominant
  if (g > r * 0.92) return false;            // yellow/greens are not hair here
  return true;
}

const src = decodePNG(fs.readFileSync(path.resolve(inPath)));
const { width: w, height: h, pixels } = src;

const box = bbox(pixels, w, h);
if (!box) { console.error("image is fully transparent"); process.exit(1); }

// Hair occupies the top of the figure. A third is generous enough for a
// fringe and short enough to exclude the cheeks.
const cutoff = box.y0 + Math.round(box.h * 0.34);

const candidate = new Uint8Array(w * h);
for (let y = box.y0; y <= Math.min(cutoff, box.y1); y++) {
  for (let x = box.x0; x <= box.x1; x++) {
    const i = (y * w + x) * 4;
    if (pixels[i + 3] === 0) continue;
    if (isHairish(pixels[i], pixels[i + 1], pixels[i + 2])) candidate[y * w + x] = 1;
  }
}

// Flood fill from the topmost candidate so only the connected hair mass is
// taken. A lone saturated pixel on a collar is not hair.
const keep = new Uint8Array(w * h);
let seed = -1;
outer: for (let y = box.y0; y <= box.y1; y++) {
  for (let x = box.x0; x <= box.x1; x++) if (candidate[y * w + x]) { seed = y * w + x; break outer; }
}
if (seed < 0) { console.error("no hair-coloured pixels found"); process.exit(1); }

const stack = [seed];
while (stack.length) {
  const p = stack.pop();
  if (keep[p] || !candidate[p]) continue;
  keep[p] = 1;
  const x = p % w, y = (p - x) / w;
  if (x > 0) stack.push(p - 1);
  if (x < w - 1) stack.push(p + 1);
  if (y > 0) stack.push(p - w);
  if (y < h - 1) stack.push(p + w);
}

// Luminance range of the hair, so the ramp maps onto its own shading.
let lo = 255, hi = 0, n = 0;
for (let p = 0; p < keep.length; p++) {
  if (!keep[p]) continue;
  const i = p * 4;
  const l = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
  if (l < lo) lo = l; if (l > hi) hi = l; n++;
}

const out = new Uint8Array(pixels);
for (let p = 0; p < keep.length; p++) {
  if (!keep[p]) continue;
  const i = p * 4;
  const l = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
  const t = hi > lo ? (l - lo) / (hi - lo) : 0;
  const c = RAMP[Math.min(RAMP.length - 1, Math.round(t * (RAMP.length - 1)))];
  out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2];
}

const pct = ((n / (box.w * box.h)) * 100).toFixed(1);
console.log(`${path.basename(inPath)}: ${n} px recoloured (${pct}% of the figure's box), ` +
  `luma ${lo.toFixed(0)}-${hi.toFixed(0)} -> black ramp`);

if (dry) { console.log("dry run — nothing written"); process.exit(0); }
fs.writeFileSync(path.resolve(outPath), encodePNG(w, h, out));
console.log(`written ${outPath}`);
