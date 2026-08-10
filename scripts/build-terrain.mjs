/**
 * Three independently generated tilesets -> one coherent terrain set.
 *
 *   node scripts/build-terrain.mjs [--dry]
 *
 * PixelLab's tileset tool takes two terrain descriptions and returns a
 * 15-tile autotile layout as a 4x4 grid of 32px cells. Three were generated so
 * they would chain — each pair's lower terrain repeats the previous pair's
 * upper:
 *
 *   water  -> sand        the estuary edge
 *   sand   -> mangrove    the tidal flats meeting the mangrove
 *   mangrove -> road      the routes
 *
 * ── The problem this exists to fix ──
 *
 * The chaining did not survive generation. Each sheet was made in a separate
 * request and the shared terrain drifted: sheet 1's sand measured #ddccaa, a
 * warm tan, and sheet 2's the same prompt came back #eeeecc, a pale cream.
 * Adjacent tiles from the two sheets would show a visible step in the beach.
 * The mangroves drifted less (#001111 against #002222) but drifted.
 *
 * A model will not reproduce a colour across runs, so the fix cannot be a
 * better prompt. Each sheet's terrain clusters are remapped onto one canonical
 * palette per terrain — the same luminance-ramp technique that recoloured the
 * dungeons, applied per cluster instead of per image.
 *
 * ── Why cluster by hue and not by position ──
 *
 * The 15-tile layout puts both terrains in almost every cell, so there is no
 * region of the sheet that is reliably one terrain. Every opaque pixel is
 * assigned to whichever canonical terrain its hue is closest to, which works
 * because the pairs are chosen to be far apart in hue — blue water against tan
 * sand, tan sand against green mangrove.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePNG, encodePNG } from "../art/lib/png.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "art/gen/out/terrain");
const OUT = path.join(ROOT, "public/terrain/v1");
const TILE = 32;
const dry = process.argv.includes("--dry");

/**
 * One canonical ramp per terrain, dark to light.
 *
 * Sampled from whichever sheet rendered that terrain best and then nudged
 * toward the app's own palette: the water borrows the Tide line's blues, the
 * mangrove the Verdant line's greens, so the chart sits in the Monsoon Belt
 * rather than beside it.
 */
const TERRAIN = {
  water: ["#1B3A47", "#2E6B7C", "#4FA3B8", "#7FC3D8"],
  sand: ["#A8946E", "#C6B48A", "#DDCCAA", "#EFE3C6"],
  mangrove: ["#0E2018", "#1F4A34", "#3E8455", "#6DB56A"],
  road: ["#7A6242", "#A8875B", "#C6A877", "#DFC79B"],
};

/** Which two terrains each sheet holds, lower first. */
const SHEETS = {
  "water-sand": ["water", "sand"],
  "sand-mangrove": ["sand", "mangrove"],
  "mangrove-road": ["mangrove", "road"],
};

const hexToRgb = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

/** Hue in degrees, 0-360. Grey returns -1 and is matched on luma alone. */
function hue(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return -1;
  const d = max - min;
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

/** Circular distance between two hues, or a large constant for grey. */
function hueDist(a, b) {
  if (a < 0 || b < 0) return 180;
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Mean hue and luma range of a canonical ramp. */
function profile(ramp) {
  const rgb = ramp.map(hexToRgb);
  const hues = rgb.map(([r, g, b]) => hue(r, g, b)).filter((h) => h >= 0);
  const lumas = rgb.map(([r, g, b]) => luma(r, g, b));
  return {
    rgb,
    hue: hues.length ? hues.reduce((a, b) => a + b, 0) / hues.length : -1,
    lo: Math.min(...lumas),
    hi: Math.max(...lumas),
  };
}

if (!fs.existsSync(SRC)) {
  console.error(`no ${SRC} — put the three exported tilesets there first`);
  process.exit(1);
}
if (!dry) fs.mkdirSync(OUT, { recursive: true });

console.log(`\nterrain -> public/terrain/v1  (${TILE}px tiles)\n`);
console.log("sheet".padEnd(16) + "lower".padEnd(11) + "upper".padEnd(11) + "tiles");

for (const [name, [lowerName, upperName]] of Object.entries(SHEETS)) {
  const file = path.join(SRC, `${name}.png`);
  if (!fs.existsSync(file)) {
    console.error(`missing ${file}`);
    process.exit(1);
  }

  const { width, height, pixels } = decodePNG(fs.readFileSync(file));
  const lower = profile(TERRAIN[lowerName]);
  const upper = profile(TERRAIN[upperName]);

  // Each sheet's own luma span per cluster, so a terrain that came back flat
  // still spreads across its canonical ramp instead of bunching at one stop.
  const span = { lower: [Infinity, -Infinity], upper: [Infinity, -Infinity] };
  const which = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < pixels.length; i += 4, p++) {
    if (pixels[i + 3] < 128) continue;
    const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
    const h = hue(r, g, b);
    const isUpper = hueDist(h, upper.hue) < hueDist(h, lower.hue);
    which[p] = isUpper ? 2 : 1;
    const l = luma(r, g, b);
    const s = span[isUpper ? "upper" : "lower"];
    if (l < s[0]) s[0] = l;
    if (l > s[1]) s[1] = l;
  }

  const out = new Uint8Array(pixels.length);
  for (let i = 0, p = 0; i < pixels.length; i += 4, p++) {
    if (which[p] === 0) continue;
    const isUpper = which[p] === 2;
    const target = isUpper ? upper : lower;
    const [lo, hi] = span[isUpper ? "upper" : "lower"];
    const l = luma(pixels[i], pixels[i + 1], pixels[i + 2]);
    const t = hi > lo ? (l - lo) / (hi - lo) : 0.5;
    const stop = target.rgb[Math.min(target.rgb.length - 1, Math.round(t * (target.rgb.length - 1)))];
    out[i] = stop[0];
    out[i + 1] = stop[1];
    out[i + 2] = stop[2];
    out[i + 3] = 255;
  }

  const cols = width / TILE;
  const rows = height / TILE;
  if (!Number.isInteger(cols) || !Number.isInteger(rows)) {
    console.error(`${name} is ${width}x${height}, not a whole number of ${TILE}px tiles`);
    process.exit(1);
  }

  if (!dry) {
    fs.writeFileSync(path.join(OUT, `${name}.png`), encodePNG(width, height, out));
  }
  console.log(
    name.padEnd(16) + lowerName.padEnd(11) + upperName.padEnd(11) + `${cols}x${rows}`,
  );
}

console.log(dry ? "\ndry run — nothing written" : `\nwritten to public/terrain/v1`);
