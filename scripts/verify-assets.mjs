/**
 * Asserts that what src/lib/assets.ts claims matches what is on disk.
 *
 *   node scripts/verify-assets.mjs
 *
 * Wired into `npm run lint` rather than `build`: an art problem should be
 * loud, but it should not fail a deploy of unrelated code.
 *
 * There is no test runner in this project, so this is the only automated
 * check standing between the manifest and a silent 404. It catches the four
 * ways art and code drift apart:
 *
 *   1. A sheet the manifest declares has no file at a tier it claims.
 *   2. A file whose colour count exceeds the 16 the postprocess enforces —
 *      i.e. a raw master that got copied into public/ by mistake. This is not
 *      hypothetical: the previous public/pals/128 was exactly that, 138-304
 *      colours, unreachable only by luck.
 *   3. Soft alpha, which renders as a grey halo against the dark theme.
 *   4. A strip whose width does not match its declared frame count. That one
 *      matters most, because a strip is animated by stepping a fixed fraction
 *      of its width: if the manifest says 8 frames and the file holds 6, every
 *      frame lands off-centre and the sprite visibly slides.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePNG } from "../art/lib/png.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = path.join(ROOT, "src/lib/assets.ts");
const BUILDER = path.join(ROOT, "scripts/build-tiers.mjs");
const MAX_COLOURS = 16;

const problems = [];
const fail = (msg) => problems.push(msg);

/**
 * The manifest is TypeScript, and this is a plain node script with no build
 * step, so the few values needed are read with regexes rather than by
 * importing it. Narrow and brittle by design: if the shape of assets.ts
 * changes enough to break these, the parse fails loudly below rather than
 * silently verifying nothing.
 */
const src = fs.readFileSync(MANIFEST, "utf8");

const version = src.match(/ASSET_VERSION\s*=\s*"([^"]+)"/)?.[1];
if (!version) fail("could not read ASSET_VERSION from src/lib/assets.ts");

const builderVersion = fs.readFileSync(BUILDER, "utf8").match(/VERSION\s*=\s*"([^"]+)"/)?.[1];
if (version && builderVersion && version !== builderVersion) {
  fail(`version drift: assets.ts says ${version}, build-tiers.mjs says ${builderVersion}`);
}

// The SheetId union, one "name" per line between the type opening and its `;`.
//
// Comments are stripped first, and that is not fussiness. This scanned every
// quoted string in the block, so a comment explaining that a sheet came from
// the "south" rotation added `south` to the sheet list and failed the build
// looking for public/pals/v2/96/south.png. The union is documented in place,
// so any quoted word in that prose was a landmine.
const unionBlock = (src.match(/export type SheetId =([\s\S]*?);/)?.[1] ?? "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/[^\n]*/g, "");
const sheets = [...unionBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
if (!sheets.length) fail("could not parse the SheetId union");

// The default tier list, used by every sheet declared as EVERY_TIER.
const tiers = [...(src.match(/ALL_TIERS[^=]*=\s*\[([^\]]+)\]/)?.[1] ?? "").matchAll(/\d+/g)]
  .map((m) => Number(m[0]));
if (!tiers.length) fail("could not parse ALL_TIERS");

/**
 * Sheets that declare their own tiers, e.g.
 *   "trainer-boy": { tiers: [96, 48, 32], clips: { run: 8 } },
 *
 * This started as a single global list because every sheet shared one. The
 * first import to arrive at 96px with no 64 broke that assumption, and a
 * global list would have demanded a 64 tier that must not exist — reporting a
 * missing file for art that was correctly never made.
 */
const overrides = new Map();
for (const [, name, list] of src.matchAll(/"([\w-]+)":\s*\{\s*tiers:\s*\[([^\]]+)\]/g)) {
  overrides.set(name, [...list.matchAll(/\d+/g)].map((m) => Number(m[0])));
}
const tiersFor = (sheet) => overrides.get(sheet) ?? tiers;

const countColours = (px) => {
  const s = new Set();
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] > 0) s.add((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
  }
  return s.size;
};
const softAlpha = (px) => {
  for (let i = 3; i < px.length; i += 4) if (px[i] !== 0 && px[i] !== 255) return true;
  return false;
};

let checked = 0;
if (version && sheets.length && tiers.length) {
  for (const sheet of sheets) {
    for (const tier of tiersFor(sheet)) {
      const rel = `public/pals/${version}/${tier}/${sheet}.png`;
      const file = path.join(ROOT, rel);
      if (!fs.existsSync(file)) {
        fail(`missing: ${rel}`);
        continue;
      }
      const { width, height, pixels } = decodePNG(fs.readFileSync(file));
      checked++;
      if (width !== tier || height !== tier) {
        fail(`${rel}: expected ${tier}x${tier}, got ${width}x${height}`);
      }
      const colours = countColours(pixels);
      if (colours > MAX_COLOURS) {
        fail(`${rel}: ${colours} colours, max ${MAX_COLOURS} — is this an unquantised master?`);
      }
      if (softAlpha(pixels)) {
        fail(`${rel}: soft alpha — will halo on the dark theme`);
      }
    }
  }

  // Clips, when any exist. `"idle": 8` inside a sheet's clips object.
  for (const [, sheet, clip, frames] of src.matchAll(
    /"?([\w-]+)"?:\s*\{\s*tiers:[^}]*clips:\s*\{[^}]*?"?(idle|run|battle)"?:\s*(\d+)/g,
  )) {
    for (const tier of tiersFor(sheet)) {
      const rel = `public/pals/${version}/${tier}/${sheet}--${clip}.png`;
      const file = path.join(ROOT, rel);
      if (!fs.existsSync(file)) {
        fail(`missing clip: ${rel}`);
        continue;
      }
      const { width, height } = decodePNG(fs.readFileSync(file));
      checked++;
      const expected = tier * Number(frames);
      if (width !== expected || height !== tier) {
        fail(`${rel}: manifest says ${frames} frames so expected ${expected}x${tier}, got ${width}x${height}`);
      }
    }
  }
}

// A stale copy under public/ is the failure this whole versioning scheme
// exists to prevent, so name it explicitly rather than letting it sit there.
for (const legacy of ["32", "48", "128"]) {
  if (fs.existsSync(path.join(ROOT, "public/pals", legacy))) {
    fail(`public/pals/${legacy} still exists — unversioned art is served without cache busting`);
  }
}

if (problems.length) {
  console.error(`asset check FAILED (${problems.length}):\n`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`asset check ok — ${checked} files across ${sheets.length} sheets, tiers ${tiers.join("/")}, ${version}`);
