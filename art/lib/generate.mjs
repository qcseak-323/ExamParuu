/**
 * The shared PixelLab batch runner.
 *
 * Extracted when the third generator was about to copy it again. Every batch
 * script now declares only its subjects and its style, and calls `runBatch`.
 *
 * WHAT THIS ENCODES, LEARNED THE EXPENSIVE WAY
 *
 * - **Two candidates per subject, fixed seeds.** Seeds are recorded per
 *   candidate so a failed call can be rerun and produce the image it would
 *   have produced. They are NOT portable across `image_size`: the same seed
 *   at a different resolution is a different subject, not a sharper one.
 * - **`--only` matters more than it looks.** Transient `fetch failed` is
 *   normal over a batch of twenty. Without a filter the only way to recover
 *   two candidates is to pay for all of them again.
 * - **Stop immediately on 401/403.** A bad key fails every remaining job
 *   identically; discovering that twenty-two times is pure waste.
 * - **Report `usage.generations`.** It is the only authoritative count. What
 *   a generation costs depends on the account's plan, which is not visible
 *   from here.
 */

import fs from "node:fs";
import path from "node:path";

const ENDPOINTS = {
  pixflux: "https://api.pixellab.ai/v2/create-image-pixflux",
  bitforge: "https://api.pixellab.ai/v2/create-image-bitforge",
};

/** Reads the key from the environment, else the app's .env.local. */
export function apiKey(appRoot) {
  if (process.env.PIXELLAB_API_KEY) return process.env.PIXELLAB_API_KEY;
  for (const f of [".env.local", ".env"]) {
    const p = path.join(appRoot, f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*PIXELLAB_API_KEY\s*=\s*"?([^"\r\n]+)"?\s*$/);
      if (m) return m[1];
    }
  }
  throw new Error("PIXELLAB_API_KEY not found in env or .env.local");
}

async function generate({ key, endpoint, description, negative, size, seed, extra }) {
  const res = await fetch(ENDPOINTS[endpoint] ?? endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      description,
      negative_description: negative,
      image_size: { width: size, height: size },
      outline: "single color outline",
      shading: "flat shading",
      detail: "low detail",
      view: "side",
      no_background: true,
      seed,
      ...extra,
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
 * @param subjects  [{ key, desc, seeds: [n, n], extra? }]
 * @param opts      { appRoot, outDir, style, negative, size, endpoint }
 */
export async function runBatch(subjects, opts) {
  const { appRoot, outDir, style, negative, size = 192, endpoint = "pixflux" } = opts;

  const argv = process.argv;
  const onlyArg =
    argv.find((a) => a.startsWith("--only=")) ??
    (argv.includes("--only") ? `--only=${argv[argv.indexOf("--only") + 1]}` : null);
  const only = onlyArg
    ? new Set(onlyArg.slice("--only=".length).split(",").map((s) => s.trim()))
    : null;

  const jobs = subjects
    .flatMap((s) =>
      s.seeds.map((seed, i) => ({
        label: `${s.key}-v${i + 1}`,
        desc: s.desc,
        extra: s.extra,
        seed,
      })),
    )
    .filter((j) => !only || only.has(j.label));

  if (only && !jobs.length) {
    console.error(`--only matched nothing. Labels look like "${subjects[0].key}-v1".`);
    process.exit(1);
  }

  if (argv.includes("--dry")) {
    console.log(`${jobs.length} generations at ${size}px via ${endpoint} · ${subjects.length} subjects\n`);
    for (const s of subjects) console.log(`  ${s.key.padEnd(16)} x${s.seeds.length}`);
    console.log(`\nwould write to ${outDir}`);
    return;
  }

  const key = apiKey(appRoot);
  fs.mkdirSync(outDir, { recursive: true });

  let gens = 0, ok = 0, failed = 0;
  for (const job of jobs) {
    try {
      const r = await generate({
        key, endpoint, size, seed: job.seed, extra: job.extra,
        description: `${job.desc} ${style}`,
        negative,
      });
      fs.writeFileSync(path.join(outDir, `${job.label}.png`), Buffer.from(r.b64, "base64"));
      gens += r.gens; ok++;
      console.log(`  ok   ${job.label}`);
    } catch (e) {
      failed++;
      console.log(`  FAIL ${job.label}  ${e.message.slice(0, 110)}`);
      if (/401|403/.test(e.message)) process.exit(1);
    }
  }

  console.log(`\n${ok} generated, ${failed} failed. Used ${gens} generations.`);
  console.log(`PNGs in ${outDir}`);
  if (failed) console.log(`retry: --only=<label>,<label>`);
}
