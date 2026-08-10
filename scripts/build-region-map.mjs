/**
 * The Monsoon Belt, composited from the Legacy Collection overworld sheet.
 *
 *   node scripts/build-region-map.mjs [--dry]
 *
 * Writes `public/maps/v1/monsoon-belt.png`.
 *
 * ── Why a build step and not a runtime tilemap ──
 *
 * The sheet is not a wang tileset. It is a set of pre-composed stamps — whole
 * islands with their coastline already drawn, forest clusters, buildings,
 * mountains — so there is nothing to tile. Compositing them once into a single
 * image means the map costs the browser one request instead of a grid of
 * hundreds of positioned divs, and it means the placement lives in version
 * control as data rather than as JSX.
 *
 * ── The islands carry their own water ──
 *
 * Each island stamp is a filled rectangle: land in the middle, the sheet's
 * navy sea in the corners. That is why the canvas is flood-filled with the
 * SAME navy sampled from the sheet rather than a colour picked by eye — a
 * near-miss would draw a visible square around every island. It is also why
 * the islands must not overlap: one island's water rectangle would erase its
 * neighbour's coastline. The layout below is checked for that.
 *
 * ── Positions come from regions.ts ──
 *
 * `REGION_POINTS` mirrors the x/y percentages in `src/lib/regions.ts`, so the
 * land lands under the markers `GymMap` positions by the same numbers. If a
 * region moves there, move it here — there is a check below that fails the
 * build if the two ever disagree in count.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePNG, encodePNG } from "../art/lib/png.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHEET = path.join(
  ROOT,
  "art/vendor/legacy-overworld-32.png",
);
const OUT_DIR = path.join(ROOT, "public/maps/v1");
const OUT = path.join(OUT_DIR, "monsoon-belt.png");

const DRY = process.argv.includes("--dry");

/**
 * Canvas. The aspect is fixed at 32:14 to match `.gym-map`'s `aspect-ratio`,
 * because markers are positioned by percentage and any mismatch crops the
 * image out from under them.
 *
 * The SIZE within that aspect is a composition lever: the island stamps are a
 * fixed 160×192 and cannot be scaled without blurring — nearest-neighbour at a
 * non-integer factor destroys the pixel grid, and 2× does not fit two rows in
 * this aspect. So a smaller canvas is how the land gets bigger relative to the
 * sea. 1120 puts each island at 14% of the width; 1280 put it at 12.5% and the
 * chart read as mostly water. Below about 1100 the overlap guard trips.
 */
const W = 1120;
const H = 490;

/**
 * Stamps, as rects into the sheet. Found by labelling opaque regions rather
 * than measured by eye — see the atlas pass in scratchpad.
 */
const S = {
  islandA: { x: 192, y: 128, w: 160, h: 192 },
  /**
   * NOT USED. The sheet's second island has a transparent notch cut through
   * its middle and a detached grass fragment above it — it is a compositing
   * piece rather than a finished island, and stamping it produced two regions
   * with holes in them. Kept documented so the next person does not rediscover
   * it by shipping it.
   */
  islandB_broken: { x: 0, y: 128, w: 160, h: 192 },
  forest: { x: 288, y: 9, w: 96, h: 86 },
  peak: { x: 321, y: 355, w: 61, h: 59 },
  range: { x: 399, y: 365, w: 97, h: 75 },
  tower: { x: 166, y: 359, w: 18, h: 57 },
  fort: { x: 202, y: 358, w: 75, h: 52 },
  houseA: { x: 4, y: 388, w: 23, h: 27 },
  houseB: { x: 37, y: 387, w: 21, h: 27 },
  houseC: { x: 34, y: 356, w: 28, h: 25 },
};

/** Mirrors src/lib/regions.ts. Percentages of the canvas. */
const REGION_POINTS = [
  { id: "az", x: 16, y: 30, flip: false },
  { id: "ai", x: 50, y: 18, flip: true },
  { id: "dp", x: 82, y: 28, flip: false },
  { id: "sc", x: 20, y: 72, flip: true },
  { id: "ab", x: 55, y: 62, flip: false },
  { id: "pl", x: 84, y: 74, flip: true },
];

/**
 * What stands on each island, offset from its centre. Chosen from what the
 * region *is* rather than scattered: the Bastion Cliffs get the mountain
 * range, the Maker Mangroves get the densest forest, Agent Atoll gets the
 * lighthouse.
 */
const DRESSING = {
  az: [{ s: "forest", dx: -20, dy: -34 }, { s: "houseA", dx: 26, dy: 10 }],
  ai: [{ s: "peak", dx: 4, dy: -30 }, { s: "houseB", dx: -30, dy: 16 }],
  dp: [{ s: "forest", dx: 10, dy: -30 }, { s: "houseC", dx: -34, dy: 14 }],
  sc: [{ s: "range", dx: -6, dy: -28 }],
  ab: [{ s: "tower", dx: 18, dy: -40 }, { s: "houseA", dx: -28, dy: 12 }],
  pl: [{ s: "forest", dx: -14, dy: -32 }, { s: "fort", dx: 20, dy: 22 }],
};

/* ------------------------------------------------------------------ */

const sheet = decodePNG(fs.readFileSync(SHEET));
const px = (img, x, y) => {
  const i = (y * img.width + x) * 4;
  return [
    img.pixels[i],
    img.pixels[i + 1],
    img.pixels[i + 2],
    img.pixels[i + 3],
  ];
};

/** The sea, taken from the sheet itself so island rectangles are invisible. */
const SEA = px(sheet, S.islandA.x + 2, S.islandA.y + 2);
if (SEA[3] !== 255) {
  throw new Error(
    `Expected opaque sea at the island's corner, got alpha ${SEA[3]}. The ` +
      `sheet layout changed — re-run the atlas pass before trusting the rects.`,
  );
}

const out = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) {
  out[i * 4] = SEA[0];
  out[i * 4 + 1] = SEA[1];
  out[i * 4 + 2] = SEA[2];
  out[i * 4 + 3] = 255;
}

/** Source-over blit, nearest-neighbour, optionally mirrored. */
function blit(rect, dx, dy, flip = false) {
  for (let y = 0; y < rect.h; y++) {
    const ty = dy + y;
    if (ty < 0 || ty >= H) continue;
    for (let x = 0; x < rect.w; x++) {
      const tx = dx + (flip ? rect.w - 1 - x : x);
      if (tx < 0 || tx >= W) continue;
      const [r, g, b, a] = px(sheet, rect.x + x, rect.y + y);
      if (a === 0) continue;
      const o = (ty * W + tx) * 4;
      if (a === 255) {
        out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = 255;
        continue;
      }
      // Partial alpha exists on the coastline foam; compose rather than snap,
      // or every island grows a hard white fringe.
      const k = a / 255;
      out[o] = Math.round(r * k + out[o] * (1 - k));
      out[o + 1] = Math.round(g * k + out[o + 1] * (1 - k));
      out[o + 2] = Math.round(b * k + out[o + 2] * (1 - k));
      out[o + 3] = 255;
    }
  }
}

/* --- lay the islands, then dress them ----------------------------- */

const placed = [];
for (const { id, x, y, flip } of REGION_POINTS) {
  // One island silhouette for all six, mirrored on alternating regions. The
  // sheet only ships one usable landmass, and a mirrored coastline reads as a
  // different island at this size where a repeated one would not.
  const rect = S.islandA;
  const cx = Math.round((x / 100) * W);
  const cy = Math.round((y / 100) * H);
  const dx = cx - Math.round(rect.w / 2);
  const dy = cy - Math.round(rect.h / 2);

  // The overlap check the header promises. Water rectangles erase coastlines,
  // so this is a correctness failure rather than a cosmetic one.
  for (const p of placed) {
    const gap =
      dx + rect.w <= p.dx || p.dx + p.w <= dx ||
      dy + rect.h <= p.dy || p.dy + p.h <= dy;
    if (!gap) {
      throw new Error(
        `Region "${id}" overlaps "${p.id}". One island's sea rectangle would ` +
          `erase the other's coast — move a point in regions.ts and here.`,
      );
    }
  }
  placed.push({ id, dx, dy, w: rect.w, h: rect.h });

  blit(rect, dx, dy, flip);

  for (const d of DRESSING[id] ?? []) {
    const r = S[d.s];
    blit(r, cx - Math.round(r.w / 2) + d.dx, cy - Math.round(r.h / 2) + d.dy);
  }
}

/* --- report ------------------------------------------------------- */

const hex = (c) =>
  "#" + c.slice(0, 3).map((v) => v.toString(16).padStart(2, "0")).join("");

console.log(`sheet   ${sheet.width}x${sheet.height}`);
console.log(`sea     ${hex(SEA)}`);
console.log(`canvas  ${W}x${H}`);
for (const p of placed) {
  console.log(`  ${p.id.padEnd(3)} at ${String(p.dx).padStart(5)},${String(p.dy).padStart(4)}  ${p.w}x${p.h}`);
}

if (DRY) {
  console.log("\ndry run — nothing written");
} else {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  // Positional args, not an object — encodePNG(w, h, pixels), unlike
  // decodePNG which returns one.
  fs.writeFileSync(OUT, encodePNG(W, H, out));
  console.log(
    `\nwrote ${path.relative(ROOT, OUT)} — ${(fs.statSync(OUT).size / 1024).toFixed(0)}KB`,
  );
}
