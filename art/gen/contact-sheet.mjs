/**
 * Build a review page for a generation batch.
 *
 *   node art/gen/contact-sheet.mjs scenery
 *
 * Reads art/gen/out/<batch>/*.png and writes art/gen/out/<batch>/sheet.html
 * with every candidate embedded as a data URI, so the page is one file that
 * can be opened, moved or sent anywhere without breaking.
 *
 * Candidates are grouped by SUBJECT rather than by seed, because the decision
 * being made is "which of these two is the cloud" — putting v1 next to v2 is
 * the whole point. `<name>-v<n>.png` is the naming contract.
 *
 * Each candidate is shown at three sizes against BOTH themes. That is not
 * decoration: art that reads at 192 and dissolves at 48 is the single most
 * common failure in this pipeline, and the cast bakes in a dark outline that
 * vanishes against the dark surface, so a sprite can look finished on one
 * theme and be invisible on the other. Judging at one size on one background
 * is how you ship something twice.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const batch = process.argv[2];

if (!batch) {
  console.error("usage: node art/gen/contact-sheet.mjs <batch>");
  process.exit(1);
}

const DIR = path.join(HERE, "out", batch);
if (!fs.existsSync(DIR)) {
  console.error(`no such batch: ${DIR}`);
  process.exit(1);
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".png")).sort();
if (!files.length) {
  console.error(`no PNGs in ${DIR}`);
  process.exit(1);
}

// "cloud-1.dark-v2.png" -> subject "cloud-1.dark", variant "v2"
const groups = new Map();
for (const f of files) {
  const m = f.match(/^(.*)-v(\d+)\.png$/);
  const subject = m ? m[1] : f.replace(/\.png$/, "");
  const variant = m ? `v${m[2]}` : "—";
  if (!groups.has(subject)) groups.set(subject, []);
  groups.get(subject).push({ file: f, variant });
}

const uri = (f) =>
  `data:image/png;base64,${fs.readFileSync(path.join(DIR, f)).toString("base64")}`;

const SIZES = [192, 96, 48];

const rows = [...groups.entries()]
  .map(([subject, items]) => {
    const cards = items
      .map(
        (it) => `
      <figure class="card">
        <figcaption>${it.variant}</figcaption>
        <div class="swatches">
          ${["light", "dark"]
            .map(
              (bg) => `<div class="bg bg--${bg}">
            ${SIZES.map(
              (s) =>
                `<img src="${uri(it.file)}" width="${s}" height="${s}" alt="${subject} ${it.variant} at ${s}px">`,
            ).join("")}
          </div>`,
            )
            .join("")}
        </div>
        <code>${it.file}</code>
      </figure>`,
      )
      .join("");
    return `<section><h2>${subject}</h2><div class="row">${cards}</div></section>`;
  })
  .join("\n");

const html = `<!doctype html>
<meta charset="utf-8">
<title>${batch} — candidates</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; padding:32px; background:#14181c; color:#e8eef2;
         font:14px/1.5 ui-sans-serif, system-ui, sans-serif; }
  h1 { font-size:20px; margin:0 0 4px; }
  .meta { color:#8b9aa6; margin:0 0 28px; }
  section { border-top:1px solid #2a3239; padding:20px 0; }
  h2 { font-size:15px; margin:0 0 14px; font-family:ui-monospace,monospace; color:#c08a3e; }
  .row { display:flex; flex-wrap:wrap; gap:22px; }
  .card { margin:0; background:#1b2126; border:1px solid #2a3239; border-radius:6px; padding:12px; }
  figcaption { font-family:ui-monospace,monospace; font-size:12px; color:#8b9aa6; margin-bottom:8px; }
  .swatches { display:flex; gap:10px; }
  .bg { display:flex; align-items:flex-end; gap:10px; padding:10px; border-radius:4px; }
  /* The two real surfaces: Low Tide panel and Storm Watch panel. */
  .bg--light { background:#f2efe6; }
  .bg--dark  { background:#12202b; }
  img { image-rendering:pixelated; display:block; }
  code { display:block; margin-top:8px; font-size:11px; color:#6d7d89; }
</style>
<h1>${batch} — ${files.length} candidates, ${groups.size} subjects</h1>
<p class="meta">Each candidate at 192 / 96 / 48px on Low Tide (left) and Storm Watch (right).
Judge the 48px column hardest — that is the size most of these actually ship at.</p>
${rows}
`;

const out = path.join(DIR, "sheet.html");
fs.writeFileSync(out, html);
console.log(`${files.length} candidates, ${groups.size} subjects -> ${out}`);
