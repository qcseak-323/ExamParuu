/**
 * Build a phone-reviewable pick sheet for a generation batch.
 *
 *   node art/gen/review-artifact.mjs scenery
 *
 * Writes art/gen/out/<batch>/review.html, shaped for publishing as an
 * Artifact: no doctype/html/head/body wrapper, everything inlined, images as
 * data URIs (the Artifact CSP blocks every external host).
 *
 * This is a DECISION tool, not a gallery. The job is to choose one candidate
 * per subject, so each subject is a row of tappable cards and the page keeps a
 * running tally plus a copyable pick string — which is the only part that has
 * to travel back, and it fits in a text message.
 *
 * Every candidate is shown BOTH raw and quantised to 16 colours. That is the
 * whole reason this exists rather than eyeballing the PNGs: a raw generation
 * carries smooth gradients that read as "not pixel art", and most of that
 * disappears once the palette is cut. Judging the raw image is judging an
 * image that will never ship.
 *
 * The two swatch backgrounds are the app's real panel colours and do NOT
 * follow the artifact's theme — they are the thing under test. A sprite bakes
 * in the #12202B outline, so it can look finished on Low Tide and vanish on
 * Storm Watch.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePNG, encodePNG } from "../lib/png.mjs";
import { boxDownsample, quantise, coverage } from "../lib/pixel.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const batch = process.argv[2];
if (!batch) {
  console.error("usage: node art/gen/review-artifact.mjs <batch>");
  process.exit(1);
}

const DIR = path.join(HERE, "out", batch);
if (!fs.existsSync(DIR)) {
  console.error(`no such batch: ${DIR}`);
  process.exit(1);
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".png")).sort();

const groups = new Map();
for (const f of files) {
  const m = f.match(/^(.*)-v(\d+)\.png$/);
  const subject = m ? m[1] : f.replace(/\.png$/, "");
  const variant = m ? `v${m[2]}` : "v1";
  if (!groups.has(subject)) groups.set(subject, []);
  groups.get(subject).push({ file: f, variant });
}

const b64 = (buf) => `data:image/png;base64,${buf.toString("base64")}`;

/** Raw bytes, and the same art after the real downres + 16-colour cut. */
function renderPair(file) {
  const raw = fs.readFileSync(path.join(DIR, file));
  const { width, height, pixels } = decodePNG(raw);
  const small = quantise(boxDownsample(pixels, width, height, 96, 96), 16);
  return { raw: b64(raw), flat: b64(encodePNG(96, 96, small)), fill: coverage(small) };
}

const sections = [...groups.entries()].map(([subject, items]) => {
  const cards = items.map((it) => {
    const { raw, flat, fill } = renderPair(it.file);
    const thin = fill < 0.12;
    return `
      <button class="cand" data-subject="${subject}" data-variant="${it.variant}"
              aria-pressed="false" type="button">
        <span class="cand__head">
          <span class="cand__v">${it.variant}</span>
          <span class="cand__fill${thin ? " is-thin" : ""}">${(fill * 100).toFixed(0)}% fill</span>
        </span>
        <span class="surfaces">
          <span class="surface surface--tide">
            <img src="${flat}" width="96" height="96" alt="${subject} ${it.variant}, flat, on Low Tide">
            <img src="${flat}" width="48" height="48" alt="">
          </span>
          <span class="surface surface--storm">
            <img src="${flat}" width="96" height="96" alt="${subject} ${it.variant}, flat, on Storm Watch">
            <img src="${flat}" width="48" height="48" alt="">
          </span>
        </span>
        <span class="rawline">
          <img src="${raw}" width="40" height="40" alt="">
          <span class="rawlabel">raw 192 &rarr; flat 16&nbsp;colours</span>
        </span>
      </button>`;
  }).join("");

  return `<section class="subject" data-subject="${subject}">
    <h2>${subject}</h2>
    <div class="cands">${cards}</div>
  </section>`;
}).join("\n");

const html = `<title>Scenery candidates &mdash; batch 1</title>
<style>
  :root {
    /* Neutrals biased to brine rather than a plain grey, and brass lifted
       from the app's own token set so the page belongs to the same world. */
    --ground: #eceff1;
    --raise:  #ffffff;
    --line:   #d3dade;
    --ink:    #17222a;
    --muted:  #5f727e;
    --brass:  #a8752f;
    --brass-hi: #c08a3e;
    --warn:   #a4442f;
    /* Fixed: the app's real panel colours. Never themed — under test. */
    --tide:  #f2efe6;
    --storm: #12202b;
    --mono: ui-monospace, "Cascadia Mono", "SF Mono", Menlo, Consolas, monospace;
    --sans: ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --ground:#0f1519; --raise:#161f26; --line:#27343d;
      --ink:#e6edf1; --muted:#8fa2ad; --brass:#c08a3e; --brass-hi:#d8a457;
      --warn:#e0765c;
    }
  }
  :root[data-theme="dark"] {
    --ground:#0f1519; --raise:#161f26; --line:#27343d;
    --ink:#e6edf1; --muted:#8fa2ad; --brass:#c08a3e; --brass-hi:#d8a457;
    --warn:#e0765c;
  }
  :root[data-theme="light"] {
    --ground:#eceff1; --raise:#ffffff; --line:#d3dade;
    --ink:#17222a; --muted:#5f727e; --brass:#a8752f; --brass-hi:#c08a3e;
    --warn:#a4442f;
  }

  body { margin:0; background:var(--ground); color:var(--ink);
         font:16px/1.55 var(--sans); -webkit-text-size-adjust:100%; }
  .wrap { max-width:760px; margin:0 auto; padding:24px 16px 140px; }

  header h1 { font:600 21px/1.25 var(--sans); margin:0 0 6px; text-wrap:balance; }
  header p { margin:0; color:var(--muted); font-size:14px; max-width:62ch; }
  .rule { height:2px; background:var(--brass); margin:18px 0 8px; width:52px; border-radius:2px; }

  .subject { border-top:1px solid var(--line); padding:20px 0 4px; }
  .subject h2 { font:600 13px/1 var(--mono); letter-spacing:.06em; text-transform:uppercase;
                color:var(--brass); margin:0 0 12px; }
  .cands { display:grid; grid-template-columns:1fr 1fr; gap:12px; }

  .cand { appearance:none; display:flex; flex-direction:column; gap:10px;
          background:var(--raise); border:1px solid var(--line); border-radius:10px;
          padding:12px; cursor:pointer; text-align:left; color:inherit; font:inherit;
          transition:border-color .12s, box-shadow .12s; }
  .cand:hover { border-color:var(--brass); }
  .cand:focus-visible { outline:2px solid var(--brass-hi); outline-offset:2px; }
  .cand[aria-pressed="true"] { border-color:var(--brass);
          box-shadow:inset 0 0 0 2px var(--brass); }

  .cand__head { display:flex; justify-content:space-between; align-items:baseline; gap:8px; }
  .cand__v { font:600 13px/1 var(--mono); }
  .cand[aria-pressed="true"] .cand__v::after { content:" \\2713"; color:var(--brass); }
  .cand__fill { font:11px/1 var(--mono); color:var(--muted); font-variant-numeric:tabular-nums; }
  .cand__fill.is-thin { color:var(--warn); }

  .surfaces { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
  .surface { display:flex; align-items:flex-end; justify-content:center; gap:4px;
             padding:6px; border-radius:6px; min-height:76px; }
  .surface--tide  { background:var(--tide); }
  .surface--storm { background:var(--storm); }
  .surface img { image-rendering:pixelated; display:block; max-width:100%; height:auto; }

  .rawline { display:flex; align-items:center; gap:7px; }
  .rawline img { image-rendering:pixelated; opacity:.65; border-radius:3px; }
  .rawlabel { font:10px/1.3 var(--mono); color:var(--muted); }

  .tally { position:fixed; left:0; right:0; bottom:0; background:var(--raise);
           border-top:1px solid var(--line); padding:12px 16px calc(12px + env(safe-area-inset-bottom));
           display:flex; flex-direction:column; gap:8px; }
  .tally__row { display:flex; align-items:center; gap:10px; justify-content:space-between; }
  .tally__count { font:600 13px/1 var(--mono); font-variant-numeric:tabular-nums; }
  .picks { font:12px/1.4 var(--mono); color:var(--muted); word-break:break-all;
           max-height:3.4em; overflow-y:auto; }
  .copy { appearance:none; border:1px solid var(--brass); background:transparent;
          color:var(--brass); font:600 13px/1 var(--sans); padding:9px 14px;
          border-radius:7px; cursor:pointer; white-space:nowrap; }
  .copy:hover { background:var(--brass); color:var(--raise); }
  .copy:focus-visible { outline:2px solid var(--brass-hi); outline-offset:2px; }

  @media (max-width:430px) {
    .surfaces { grid-template-columns:1fr; }
    .subject h2 { font-size:12px; }
  }
  @media (prefers-reduced-motion: reduce) { * { transition:none !important; } }
</style>

<div class="wrap">
  <header>
    <h1>Scenery candidates &mdash; batch 1</h1>
    <div class="rule"></div>
    <p>Two candidates per subject, each shown after the real 16-colour cut, on both app
    surfaces. Judge the small one: 48px is where most of these ship. Tap a card to pick it,
    then copy the string at the bottom and send it back.</p>
  </header>

  ${sections}
</div>

<div class="tally">
  <div class="tally__row">
    <span class="tally__count" id="count">0 / ${groups.size} picked</span>
    <button class="copy" id="copy" type="button">Copy picks</button>
  </div>
  <div class="picks" id="picks">nothing picked yet</div>
</div>

<script>
(function () {
  var picks = {};
  var total = ${groups.size};
  var countEl = document.getElementById("count");
  var picksEl = document.getElementById("picks");

  function serialise() {
    return Object.keys(picks).sort().map(function (k) {
      return k + "=" + picks[k];
    }).join(", ");
  }

  function refresh() {
    var n = Object.keys(picks).length;
    countEl.textContent = n + " / " + total + " picked";
    picksEl.textContent = n ? serialise() : "nothing picked yet";
  }

  document.querySelectorAll(".cand").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var subject = btn.dataset.subject;
      var variant = btn.dataset.variant;
      var already = picks[subject] === variant;

      document.querySelectorAll('.cand[data-subject="' + subject + '"]')
        .forEach(function (sib) { sib.setAttribute("aria-pressed", "false"); });

      if (already) { delete picks[subject]; }
      else { picks[subject] = variant; btn.setAttribute("aria-pressed", "true"); }
      refresh();
    });
  });

  document.getElementById("copy").addEventListener("click", function () {
    var btn = this;
    var text = serialise() || "(no picks)";
    var done = function () {
      var was = btn.textContent;
      btn.textContent = "Copied";
      setTimeout(function () { btn.textContent = was; }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, done);
    } else {
      var ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta); done();
    }
  });

  refresh();
})();
</script>
`;

const out = path.join(DIR, "review.html");
fs.writeFileSync(out, html);
console.log(`${files.length} candidates, ${groups.size} subjects -> ${out}`);
console.log(`(${(fs.statSync(out).size / 1024 / 1024).toFixed(2)} MB)`);
