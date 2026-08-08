/**
 * Batch 1 — the sky and the shore. Sun, moon, trees, clouds.
 *
 *   node --use-system-ca art/gen/scenery.mjs [--dry]
 *
 * Writes candidates to art/gen/out/scenery/. Nothing here touches public/ —
 * run build-scenery.mjs on the picks once they have been reviewed.
 *
 * WHY PIXFLUX AND NOT BITFORGE
 *
 * The cast uses bitforge because it takes a style reference, which is what
 * keeps nineteen creatures looking like one family. Scenery has no such
 * constraint — a cloud does not need to resemble a guardian — and bitforge
 * caps at 200px against pixflux's 400. Pixflux also costs slightly less.
 *
 * WHY EVERYTHING GENERATES AT 192
 *
 * Same reason the cast masters want to be 192: it is the only size under the
 * relevant caps that divides exactly into every tier the app renders
 * (192/2=96, /3=64, /4=48, /6=32). Generating scenery at some other size and
 * downsampling would reintroduce the fractional-scale shimmer that the whole
 * of scripts/build-tiers.mjs exists to avoid.
 *
 * ON THE DARK VARIANTS
 *
 * The dark theme is Storm Watch, not night. It already renders rain. So the
 * second cloud set is a STORM cloud — heavier, bruised, lit from below — not
 * a night cloud with stars. Generating "night" here would produce art that
 * contradicts the weather the rest of the theme is painting.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(HERE, "../..");
const OUT = path.join(HERE, "out/scenery");
const API = "https://api.pixellab.ai/v2/create-image-pixflux";
const GEN_SIZE = 192;

function apiKey() {
  if (process.env.PIXELLAB_API_KEY) return process.env.PIXELLAB_API_KEY;
  for (const f of [".env.local", ".env"]) {
    const p = path.join(APP, f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*PIXELLAB_API_KEY\s*=\s*"?([^"\r\n]+)"?\s*$/);
      if (m) return m[1];
    }
  }
  throw new Error("PIXELLAB_API_KEY not found in env or .env.local");
}

/**
 * The Monsoon Belt reads as estuary and mangrove — brass, brine, storm glass.
 * "flat cel shading" and "low detail" are what the cast was generated with and
 * are the main lever keeping this from drifting into painterly.
 */
const STYLE =
  "pixel art game asset, flat cel shading, limited palette, crisp pixel edges, " +
  "bright and clean";

const NEGATIVE =
  "realistic, photographic, grimdark, blurry, gradient, text, watermark, " +
  "signature, frame, border, human, character, pokemon";

const SUBJECTS = [
  {
    key: "sun",
    desc:
      "A small round sun with short even rays, warm gold and pale cream, " +
      "cheerful and simple, centred on a transparent background.",
    seeds: [50101, 50168],
  },
  {
    key: "moon",
    desc:
      "A crescent moon in pale silver-blue with a soft cratered face, calm " +
      "and simple, centred on a transparent background.",
    seeds: [50235, 50302],
  },
  {
    key: "tree-1",
    desc:
      "A single mangrove tree with arching stilt roots, deep green canopy, " +
      "brown bark, side view, whole tree in frame on transparent background.",
    seeds: [50369, 50436],
  },
  {
    key: "tree-2",
    desc:
      "A tall slender coastal palm with a curved trunk and green fronds, " +
      "side view, whole tree in frame on transparent background.",
    seeds: [50503, 50570],
  },
  {
    key: "tree-3",
    desc:
      "A short bushy shrub with dense round green foliage and a stubby " +
      "trunk, side view, whole plant in frame on transparent background.",
    seeds: [50637, 50704],
  },
  {
    key: "cloud-1",
    desc:
      "A single fluffy fair-weather cloud, white with pale blue underside, " +
      "wide and soft, isolated on a transparent background.",
    seeds: [50771, 50838],
  },
  {
    key: "cloud-2",
    desc:
      "A small wispy cloud, white with a faint blue shadow, thin and " +
      "stretched, isolated on a transparent background.",
    seeds: [50905, 50972],
  },
  {
    key: "cloud-3",
    desc:
      "A tall billowing cumulus cloud, bright white with pale blue shading, " +
      "isolated on a transparent background.",
    seeds: [51039, 51106],
  },
  {
    key: "cloud-1.dark",
    desc:
      "A heavy storm cloud, deep slate grey and bruised blue, flat underside " +
      "with a faint warm rim light, isolated on a transparent background.",
    seeds: [51173, 51240],
  },
  {
    key: "cloud-2.dark",
    desc:
      "A ragged wind-torn storm cloud, dark grey-blue, thin and stretched, " +
      "isolated on a transparent background.",
    seeds: [51307, 51374],
  },
  {
    key: "cloud-3.dark",
    desc:
      "A towering thunderhead, dark slate and deep blue with a pale lit " +
      "crown, isolated on a transparent background.",
    seeds: [51441, 51508],
  },
];

async function generate(key, desc, seed) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      description: `${desc} ${STYLE}`,
      negative_description: NEGATIVE,
      image_size: { width: GEN_SIZE, height: GEN_SIZE },
      outline: "single color outline",
      shading: "flat shading",
      detail: "low detail",
      view: "side",
      no_background: true,
      seed,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 250)}`);
  const json = JSON.parse(text);
  const b64 = json.image?.base64 ?? json.image;
  if (typeof b64 !== "string") throw new Error("no image in response");
  return { b64, gens: Number(json.usage?.generations ?? 0) };
}

/**
 * `--only cloud-1-v2,cloud-2-v1` reruns just those candidates.
 *
 * Transient `fetch failed` errors are normal over a batch this size, and
 * without a filter the only way to recover two candidates is to pay for all
 * twenty-two again. Seeds are fixed per candidate, so a rerun reproduces the
 * same image the failed call would have returned.
 */
const onlyArg = process.argv.find((a) => a.startsWith("--only="))
  ?? (process.argv.includes("--only") ? `--only=${process.argv[process.argv.indexOf("--only") + 1]}` : null);
const only = onlyArg ? new Set(onlyArg.slice("--only=".length).split(",").map((s) => s.trim())) : null;

const jobs = SUBJECTS.flatMap((s) =>
  s.seeds.map((seed, i) => ({ label: `${s.key}-v${i + 1}`, desc: s.desc, seed })),
).filter((j) => !only || only.has(j.label));

if (only && !jobs.length) {
  console.error(`--only matched nothing. Known labels look like "cloud-1-v2".`);
  process.exit(1);
}

if (process.argv.includes("--dry")) {
  console.log(`${jobs.length} generations at ${GEN_SIZE}px · ${SUBJECTS.length} subjects\n`);
  for (const s of SUBJECTS) console.log(`  ${s.key.padEnd(14)} x${s.seeds.length}`);
  console.log(`\nwould write to ${OUT}`);
  process.exit(0);
}

const key = apiKey();
fs.mkdirSync(OUT, { recursive: true });

let gens = 0, ok = 0, failed = 0;
for (const job of jobs) {
  try {
    const r = await generate(key, job.desc, job.seed);
    fs.writeFileSync(path.join(OUT, `${job.label}.png`), Buffer.from(r.b64, "base64"));
    gens += r.gens; ok++;
    console.log(`  ok   ${job.label}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL ${job.label}  ${e.message.slice(0, 110)}`);
    // A bad key fails every remaining job identically; stop rather than burn
    // the whole batch discovering that twenty-two times.
    if (/401|403/.test(e.message)) process.exit(1);
  }
}

console.log(`\n${ok} generated, ${failed} failed. Used ${gens} generations.`);
console.log(`PNGs in ${OUT}`);
console.log(`\nnext: node art/gen/contact-sheet.mjs scenery`);
