/**
 * Masters -> the render tiers the app actually loads.
 *
 *   node scripts/build-tiers.mjs [--dry]
 *
 * Reads art/masters/128/*.png and writes public/pals/<VERSION>/<tier>/<name>.png
 * for every tier in TARGETS.
 *
 * WHY THIS EXISTS, AND WHY 96 AND 64 ARE NEW
 *
 * `sourceFor` picks the source grid whose pixels divide the render size
 * evenly, because `image-rendering: pixelated` is nearest-neighbour and a
 * fractional scale drops pixel rows unevenly and shimmers. The app renders at
 * 32, 48, 64, 96 and 192 px. With only 32 and 48 on disk that meant:
 *
 *     192 (professor lg) -> 48 at 4x      96 (setup, battle) -> 48 at 2x
 *      64 (hero runners) -> 32 at 2x
 *
 * i.e. the professor was the 48px file blown up four times, which is the
 * whole of the "professor needs higher resolution" complaint. Adding 96 and
 * 64 makes 192 a 2x of 96, and 96 and 64 native. No new art required.
 *
 * 128 -> 96 is 4:3, so the box filter averages uneven 2- and 3-pixel blocks
 * and the result is slightly soft. That is still strictly better than what it
 * replaces: the 96 file renders at 1x, against a 48 file rendered at 2x with
 * literally half the pixel data. Authoring-time softness beats runtime
 * upscaling every time.
 *
 * The three stages are postprocess.mjs's, unchanged in substance:
 *
 *   1. BOX DOWNSAMPLE — generated "pixel art" is not truly on a 128 grid, it
 *      carries sub-pixel noise from the diffusion. Averaging the source block
 *      is more faithful than nearest-neighbour, which samples one arbitrary
 *      noisy pixel per output cell.
 *   2. QUANTISE — median-cut to a fixed colour count. This is what turns a
 *      soft average back into flat pixel art. Note the masters themselves are
 *      191-232 colours: they are raw generations that were never quantised,
 *      which is exactly why they must never be served directly.
 *   3. ALPHA SNAP — transparency stays binary. A soft alpha edge renders as a
 *      grey halo against the dark theme.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePNG, encodePNG } from "../art/lib/png.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "art/masters/128");

/**
 * Bumped whenever the art changes. public/ is served with stable filenames and
 * no content hash, so overwriting in place leaves returning users with a mixed
 * cache — a fresh 96 beside a cached 48 of the same character. Must stay in
 * step with ASSET_VERSION in src/lib/assets.ts; verify-assets.mjs checks that.
 */
const VERSION = "v2";

/** Every render size in the app divides one of these exactly. */
const TARGETS = [96, 64, 48, 32];
const COLOURS = 16;

/** Average over the source block; ignore fully transparent pixels. */
function boxDownsample(src, w, h, tw, th) {
  const out = new Uint8Array(tw * th * 4);
  const sx = w / tw, sy = h / th;
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      let r = 0, g = 0, b = 0, n = 0, opaque = 0, total = 0;
      for (let j = Math.floor(y * sy); j < Math.ceil((y + 1) * sy); j++) {
        for (let i = Math.floor(x * sx); i < Math.ceil((x + 1) * sx); i++) {
          if (i >= w || j >= h) continue;
          const s = (j * w + i) * 4;
          total++;
          if (src[s + 3] > 127) {
            r += src[s]; g += src[s + 1]; b += src[s + 2];
            n++; opaque++;
          }
        }
      }
      const d = (y * tw + x) * 4;
      // 40% is the coverage threshold below which a cell reads as background.
      if (n > 0 && opaque / total >= 0.4) {
        out[d] = Math.round(r / n); out[d + 1] = Math.round(g / n);
        out[d + 2] = Math.round(b / n); out[d + 3] = 255;
      } else {
        out[d + 3] = 0; // snapped hard — no soft halo
      }
    }
  }
  return out;
}

/** Median cut. Splits the box with the widest channel until it has n boxes. */
function quantise(px, n) {
  const pixels = [];
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] > 0) pixels.push([px[i], px[i + 1], px[i + 2]]);
  }
  if (!pixels.length) return px;

  let boxes = [pixels];
  while (boxes.length < n) {
    let bi = -1, best = -1, ch = 0;
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      for (let c = 0; c < 3; c++) {
        let lo = 255, hi = 0;
        for (const p of box) { if (p[c] < lo) lo = p[c]; if (p[c] > hi) hi = p[c]; }
        if (hi - lo > best) { best = hi - lo; bi = i; ch = c; }
      }
    });
    if (bi < 0) break;
    const box = boxes[bi].slice().sort((a, b) => a[ch] - b[ch]);
    const mid = box.length >> 1;
    boxes.splice(bi, 1, box.slice(0, mid), box.slice(mid));
  }

  const palette = boxes.filter((b) => b.length).map((box) => {
    const s = box.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]);
    return s.map((v) => Math.round(v / box.length));
  });

  const out = new Uint8Array(px.length);
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    let bestD = Infinity, bestC = palette[0];
    for (const c of palette) {
      const d = (px[i] - c[0]) ** 2 + (px[i + 1] - c[1]) ** 2 + (px[i + 2] - c[2]) ** 2;
      if (d < bestD) { bestD = d; bestC = c; }
    }
    out[i] = bestC[0]; out[i + 1] = bestC[1]; out[i + 2] = bestC[2]; out[i + 3] = 255;
  }
  return out;
}

const countColours = (px) => {
  const s = new Set();
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] > 0) s.add((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
  }
  return s.size;
};
const coverage = (px) => {
  let n = 0;
  for (let i = 3; i < px.length; i += 4) if (px[i] > 0) n++;
  return n / (px.length / 4);
};

if (!fs.existsSync(SRC)) {
  console.error(`no masters at ${SRC}`);
  process.exit(1);
}

const files = fs.readdirSync(SRC).filter((f) => f.endsWith(".png")).sort();
const dry = process.argv.includes("--dry");

if (!dry) {
  for (const t of TARGETS) {
    fs.mkdirSync(path.join(ROOT, "public/pals", VERSION, String(t)), { recursive: true });
  }
}

console.log(`${files.length} masters -> ${TARGETS.join(", ")}px  (public/pals/${VERSION})\n`);
console.log("sprite".padEnd(20) + "src".padEnd(7) + TARGETS.map((t) => `${t}px`.padEnd(13)).join(""));

const thin = [];
for (const f of files) {
  const { width, height, pixels } = decodePNG(fs.readFileSync(path.join(SRC, f)));
  let row = f.replace(".png", "").padEnd(20) + String(countColours(pixels)).padEnd(7);

  for (const t of TARGETS) {
    const small = quantise(boxDownsample(pixels, width, height, t, t), COLOURS);
    if (!dry) {
      fs.writeFileSync(path.join(ROOT, "public/pals", VERSION, String(t), f), encodePNG(t, t, small));
    }
    const fill = coverage(small);
    if (t === 32 && fill < 0.25) thin.push(`${f.replace(".png", "")} (${(fill * 100).toFixed(0)}%)`);
    row += `${countColours(small)}c ${(fill * 100).toFixed(0)}%`.padEnd(13);
  }
  console.log(row);
}

console.log(dry ? "\ndry run — nothing written" : `\nwritten to public/pals/${VERSION}/{${TARGETS.join(",")}}`);

// Fill % is the share of the canvas the creature occupies. Much under ~25% at
// 32px means the sprite will read as a speck in the nav — a cropping problem
// at generation time, not something this script can fix.
if (thin.length) console.log(`\nthin at 32px, consider tighter framing: ${thin.join(", ")}`);
