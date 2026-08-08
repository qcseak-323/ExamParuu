/**
 * Picked candidates -> the scenery assets the app serves.
 *
 *   node scripts/build-scenery.mjs [--dry]
 *
 * Reads art/picks.json, pulls the chosen candidate for each subject out of
 * art/gen/out/<batch>/, and writes public/scenery/<VERSION>/<size>/<name>.png.
 *
 * WHY A PICKS FILE AND NOT A MANUAL COPY
 *
 * The cast was installed by hand — postprocess.mjs wrote `<name>-<tier>.png`
 * into a sibling directory and someone renamed and copied 38 files, with the
 * destination recorded only in a code comment. That is unrepeatable and
 * unauditable: nothing on disk says which candidate won or why. picks.json is
 * the record, and this script is the only path from a candidate to public/.
 *
 * NAMING
 *
 * A subject may carry a `.dark` suffix (`cloud-1.dark`), which the manifest
 * reads as "this asset has a Storm Watch variant". The suffix survives into
 * the filename untouched, so the CSS custom property that swaps themes is a
 * straight string substitution and not a lookup.
 *
 * SIZES
 *
 * Two, for the same reason the cast has tiers: `image-rendering: pixelated`
 * is nearest-neighbour, so a scenery layer scaled to a fractional multiple
 * shimmers as it parallaxes — which is far more visible on a drifting cloud
 * than on a static sprite. 96 for near layers, 48 for far ones.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePNG, encodePNG } from "../art/lib/png.mjs";
import { boxDownsample, quantise, countColours, coverage, bbox } from "../art/lib/pixel.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PICKS = path.join(ROOT, "art/picks.json");

/** Independent of ASSET_VERSION: scenery and cast are re-cut separately. */
const VERSION = "v1";
const SIZES = [96, 48];
const COLOURS = 16;

if (!fs.existsSync(PICKS)) {
  console.error("no art/picks.json");
  process.exit(1);
}

const picks = JSON.parse(fs.readFileSync(PICKS, "utf8"));
const dry = process.argv.includes("--dry");
const problems = [];

for (const [batch, subjects] of Object.entries(picks)) {
  if (batch.startsWith("_")) continue; // _comment, _dropped

  const srcDir = path.join(ROOT, "art/gen/out", batch);
  if (!fs.existsSync(srcDir)) {
    problems.push(`no candidates for batch "${batch}" at ${srcDir}`);
    continue;
  }

  if (!dry) {
    for (const s of SIZES) {
      fs.mkdirSync(path.join(ROOT, "public/scenery", VERSION, String(s)), { recursive: true });
    }
  }

  console.log(`\n${batch} -> public/scenery/${VERSION}/{${SIZES.join(",")}}\n`);
  console.log("asset".padEnd(18) + "pick".padEnd(7) + SIZES.map((s) => `${s}px`.padEnd(14)).join("") + "bbox");

  for (const [subject, variant] of Object.entries(subjects)) {
    if (subject.startsWith("_")) continue;

    const file = path.join(srcDir, `${subject}-${variant}.png`);
    if (!fs.existsSync(file)) {
      problems.push(`missing candidate: ${subject}-${variant}.png`);
      continue;
    }

    const { width, height, pixels } = decodePNG(fs.readFileSync(file));
    let row = subject.padEnd(18) + variant.padEnd(7);

    for (const s of SIZES) {
      const small = quantise(boxDownsample(pixels, width, height, s, s), COLOURS);
      if (!dry) {
        fs.writeFileSync(
          path.join(ROOT, "public/scenery", VERSION, String(s), `${subject}.png`),
          encodePNG(s, s, small),
        );
      }
      row += `${countColours(small)}c ${(coverage(small) * 100).toFixed(0)}%`.padEnd(14);
    }

    // Reported because scenery is composited, not centred in a box like a
    // sprite: a cloud whose art sits high in its canvas leaves dead space
    // that CSS has to position around, and the number is the only way to
    // know before it is on screen.
    const b = bbox(pixels, width, height);
    row += b ? `${b.w}x${b.h} @${b.x0},${b.y0}` : "empty";
    console.log(row);
  }
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(dry ? "\ndry run — nothing written" : `\nwritten to public/scenery/${VERSION}`);
