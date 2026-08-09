/**
 * Build the single-page PixelLab handover: settings, prompts, lessons, and
 * every sprite generated so far, in one artifact-ready HTML file.
 *
 *   node art/gen/handover-doc.mjs
 *
 * Writes art/gen/out/handover.html.
 *
 * The markdown handover in the vault has the same words but no pictures, and
 * for someone about to generate art by hand the pictures are half the brief —
 * "match this" is a far better instruction than any adjective. Everything is
 * embedded as a data URI so the page is one self-contained file.
 *
 * Reuses the review sheet's palette and type deliberately: this is the same
 * tool family, and a second visual language for the same job would be noise.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");

const uri = (p) => {
  const abs = path.join(ROOT, p);
  if (!fs.existsSync(abs)) return null;
  return `data:image/png;base64,${fs.readFileSync(abs).toString("base64")}`;
};

/** A row of sprites on the app's two real surfaces. */
function sprites(items, size = 96) {
  return items
    .map(({ src, label, note }) => {
      const d = uri(src);
      if (!d) return "";
      return `<figure class="sp">
        <span class="sp__pair">
          <span class="sw sw--tide"><img src="${d}" width="${size}" height="${size}" alt="${label}"></span>
          <span class="sw sw--storm"><img src="${d}" width="${size}" height="${size}" alt=""></span>
        </span>
        <figcaption>${label}${note ? `<em>${note}</em>` : ""}</figcaption>
      </figure>`;
    })
    .join("");
}

const CAST = [
  "fire-1", "fire-2", "fire-3", "water-1", "water-2", "water-3",
  "wood-1", "wood-2", "wood-3", "professor", "trainer-boy", "trainer-girl",
  "guardian-az-900", "guardian-ai-901", "guardian-dp-900", "guardian-dp-600",
  "guardian-sc-900", "guardian-ab-900", "guardian-pl-900",
].map((n) => ({ src: `public/pals/v2/96/${n}.png`, label: n }));

const SCENERY = [
  "sun", "moon", "tree-1", "tree-2", "tree-3",
  "cloud-1", "cloud-2", "cloud-1.dark", "cloud-2.dark",
].map((n) => ({ src: `public/scenery/v1/96/${n}.png`, label: n }));

const FX = [
  "bolt-fire", "bolt-water", "bolt-wood", "bolt-brass",
  "spark-hit", "dust-faint", "gust-1", "gust-2", "speed-line",
].map((n) => ({ src: `public/scenery/v1/96/${n}.png`, label: n }));

/**
 * The run strip, laid out frame by frame. Shown as cells rather than as the
 * single wide PNG because what matters when judging a cycle is whether the
 * pose changes evenly, and a 768px-wide image on a page this width does not
 * show that.
 */
function strip(src, tier, frames) {
  const d = uri(src);
  if (!d) return "";
  const cells = Array.from({ length: frames }, (_, i) =>
    `<span class="cell" style="background-image:url(${d});
       background-position:-${i * tier}px 0; width:${tier}px; height:${tier}px;
       background-size:${tier * frames}px ${tier}px"></span>`).join("");
  return `<div class="strip strip--tide">${cells}</div>
          <div class="strip strip--storm">${cells}</div>`;
}

/** One row of the pending table: what to make, and exactly what to type. */
const row = (n, item, tool, prompt, note) =>
  `<tr><td class="num">${n}</td><td><strong>${item}</strong>${note ? `<br><span class="hint">${note}</span>` : ""}</td>
   <td>${tool}</td><td><pre class="inline">${prompt}</pre></td></tr>`;

const html = `<title>PixelLab handover &mdash; ExamParuu art pack</title>
<style>
  :root {
    --ground:#eceff1; --raise:#ffffff; --line:#d3dade; --ink:#17222a;
    --muted:#5f727e; --brass:#a8752f; --brass-hi:#c08a3e; --warn:#a4442f;
    --code-bg:#f4f6f7;
    --tide:#f2efe6; --storm:#12202b;
    --mono: ui-monospace, "Cascadia Mono", "SF Mono", Menlo, Consolas, monospace;
    --sans: ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    :root { --ground:#0f1519; --raise:#161f26; --line:#27343d; --ink:#e6edf1;
            --muted:#8fa2ad; --brass:#c08a3e; --brass-hi:#d8a457; --warn:#e0765c;
            --code-bg:#0c1216; }
  }
  :root[data-theme="dark"] {
    --ground:#0f1519; --raise:#161f26; --line:#27343d; --ink:#e6edf1;
    --muted:#8fa2ad; --brass:#c08a3e; --brass-hi:#d8a457; --warn:#e0765c;
    --code-bg:#0c1216;
  }
  :root[data-theme="light"] {
    --ground:#eceff1; --raise:#ffffff; --line:#d3dade; --ink:#17222a;
    --muted:#5f727e; --brass:#a8752f; --brass-hi:#c08a3e; --warn:#a4442f;
    --code-bg:#f4f6f7;
  }

  body { margin:0; background:var(--ground); color:var(--ink);
         font:16px/1.6 var(--sans); -webkit-text-size-adjust:100%; }
  .wrap { max-width:900px; margin:0 auto; padding:28px 18px 80px; }

  h1 { font:600 26px/1.2 var(--sans); margin:0 0 6px; text-wrap:balance; }
  .sub { color:var(--muted); margin:0; font-size:15px; }
  .rule { height:3px; width:56px; background:var(--brass); border-radius:2px; margin:20px 0 0; }

  h2 { font:600 13px/1 var(--mono); letter-spacing:.08em; text-transform:uppercase;
       color:var(--brass); margin:44px 0 14px; padding-top:20px;
       border-top:1px solid var(--line); }
  h3 { font:600 15px/1.3 var(--sans); margin:24px 0 8px; }
  p { margin:0 0 12px; max-width:68ch; }
  ul { margin:0 0 12px; padding-left:22px; max-width:68ch; }
  li { margin-bottom:6px; }
  strong { font-weight:640; }

  table { border-collapse:collapse; width:100%; margin:0 0 16px;
          font-size:14px; display:block; overflow-x:auto; }
  th, td { text-align:left; padding:7px 12px 7px 0; border-bottom:1px solid var(--line);
           vertical-align:top; }
  th { font:600 12px/1 var(--mono); letter-spacing:.05em; text-transform:uppercase;
       color:var(--muted); }
  td code { font-size:13px; }

  pre { background:var(--code-bg); border:1px solid var(--line); border-radius:8px;
        padding:12px 14px; overflow-x:auto; margin:0 0 16px;
        font:13px/1.55 var(--mono); }
  code { font-family:var(--mono); font-size:.92em; }
  p code, li code, td code { background:var(--code-bg); padding:1px 5px;
        border-radius:4px; border:1px solid var(--line); }

  .grid { display:flex; flex-wrap:wrap; gap:14px; margin:0 0 18px; }
  .sp { margin:0; background:var(--raise); border:1px solid var(--line);
        border-radius:9px; padding:9px; }
  .sp__pair { display:flex; gap:5px; }
  .sw { display:flex; align-items:center; justify-content:center;
        padding:5px; border-radius:5px; }
  .sw--tide { background:var(--tide); }
  .sw--storm { background:var(--storm); }
  .sw img { image-rendering:pixelated; display:block; }
  figcaption { font:11px/1.4 var(--mono); color:var(--muted); margin-top:7px;
               text-align:center; }
  figcaption em { display:block; font-style:normal; color:var(--brass); }

  /* Prompt cells: the prompt is the payload of this table, so it gets the
     code treatment inline rather than sitting as plain prose. */
  pre.inline { margin:0; padding:7px 10px; font-size:12.5px; white-space:pre-wrap;
               min-width:20ch; }
  .hint { font:11px/1.4 var(--mono); color:var(--muted); }

  .strip { display:flex; gap:4px; padding:8px; border-radius:7px; margin-bottom:6px;
           overflow-x:auto; }
  .strip--tide { background:var(--tide); }
  .strip--storm { background:var(--storm); margin-bottom:16px; }
  .cell { display:block; flex:none; image-rendering:pixelated;
          background-repeat:no-repeat; }
  /* Only the numbered pending rows, not the label column of every table. */
  td.num { color:var(--muted); font:600 12px/1.6 var(--mono); width:2ch; }

  .callout { background:var(--raise); border:1px solid var(--line);
             border-left:3px solid var(--brass); border-radius:0 8px 8px 0;
             padding:12px 16px; margin:0 0 16px; }
  .callout p:last-child { margin-bottom:0; }
  .warn { border-left-color:var(--warn); }
  blockquote { margin:0 0 12px; padding-left:14px; border-left:2px solid var(--line);
               color:var(--muted); font-style:italic; max-width:66ch; }
</style>

<div class="wrap">
<header>
  <h1>PixelLab handover &mdash; ExamParuu art pack</h1>
  <p class="sub">Everything generated so far, everything still outstanding, and the recipe that
  makes new art sit with the old. 110 generations, 2026-08-09.</p>
  <div class="rule"></div>
</header>

<h2>1 &middot; Settings</h2>
<p>Every sprite in this project was generated with these. <strong>Match them or new art will not
sit with the old.</strong></p>
<table>
  <tr><th>Setting</th><th>Value</th></tr>
  <tr><td>Size</td><td><strong>192 &times; 192</strong></td></tr>
  <tr><td>Model</td><td><strong>Bitforge</strong> for characters and creatures, <strong>Pixflux</strong> for scenery and effects</td></tr>
  <tr><td>Outline</td><td>single colour outline</td></tr>
  <tr><td>Shading</td><td>flat shading</td></tr>
  <tr><td>Detail</td><td><strong>low detail</strong></td></tr>
  <tr><td>View</td><td>side</td></tr>
  <tr><td>Background</td><td>none / transparent</td></tr>
</table>
<div class="callout">
  <p><strong>Why 192.</strong> It is the only size under Bitforge's 200px cap that divides exactly
  into every size the app renders (192/2=96, /3=64, /4=48, /6=32). Nearest-neighbour scaling drops
  pixel rows unevenly at any other ratio, which shimmers. Do not generate at 128 or 200.</p>
  <p><strong>Style-image gotcha.</strong> A style reference must be <em>exactly</em> the output
  size. A 128px reference against a 192px generation fails outright.</p>
  <p><strong>Animation is the exception &mdash; generate at 96, not 192.</strong> 96 divides both
  48 and 32, and the frame budget is width &times; height &times; frames &le; 524,288.</p>
</div>

<h3>The character tool &mdash; different settings, and 96 is correct</h3>
<p>The 8-rotation character tool is not the still generator and does not take the same settings.
The trainer boy came through it, and these are the ones that matter.</p>
<table>
  <tr><th>Setting</th><th>Value</th><th>Why</th></tr>
  <tr><td>Size</td><td><strong>96</strong></td><td>Characters render at most 96px in this app, so 96 is native at the largest size used &mdash; and it divides 48 and 32 exactly</td></tr>
  <tr><td>View</td><td><strong>side</strong> for battle and setup<br><strong>low top-down</strong> for a map avatar</td><td>The cast is drawn in profile. Top-down is only correct for the overworld</td></tr>
  <tr><td>Directions</td><td><strong>east only</strong> for the cast<br><strong>all 8</strong> for a map avatar</td><td>The app uses the profile and mirrors it, so seven of eight rotations are discarded &mdash; generating one costs a quarter as much</td></tr>
  <tr><td>Frames</td><td>8</td><td>Fits the budget comfortably at 96px</td></tr>
</table>
<div class="callout warn">
  <p><strong>Do not go above 96 on this tool.</strong> 128 and 168 are offered and both look like an
  upgrade; neither divides 48 or 32, so every render would land on a fractional scale and shimmer.
  The only other safe size is 192.</p>
</div>

<h3>What the importer already handles &mdash; do not work around these</h3>
<p>Export raw. No pre-cropping, no pre-scaling, no matching a colour count.</p>
<table>
  <tr><th>Export quirk</th><th>What <code>import-pixellab.mjs</code> does</th></tr>
  <tr><td>Figure small in frame (the first was 5%)</td><td>Integer upscale inside the canvas, to 20%</td></tr>
  <tr><td>Frames drifting against each other</td><td>One shared anchor from the union bounding box</td></tr>
  <tr><td>Colours crawling during a cycle</td><td>One pooled palette across every frame</td></tr>
  <tr><td>Clip folder named "Running"</td><td>Aliased to the app's <code>run</code></td></tr>
  <tr><td>More than 16 colours</td><td>Median-cut quantise</td></tr>
  <tr><td>Soft alpha edges</td><td>Snapped to binary</td></tr>
  <tr><td>A tier the source cannot support</td><td>Declared per sheet in the manifest and routed around</td></tr>
</table>
<p>The two things it <strong>cannot</strong> fix are colour and perspective. Both are generation
decisions; it measures them and warns, but no post-processing makes a greyscale top-down sprite
belong to a bright side-view cast.</p>

<h2>2 &middot; Prompts</h2>

<h3>Creatures</h3>
<p>Style suffix, appended to every creature description:</p>
<pre>super cute chibi anime pixel art sprite, kawaii, flat cel shading, bright colours</pre>
<p>Negative:</p>
<pre>epic, majestic, regal, ornate, grimdark, soulslike, realistic, scary,
menacing, muted colours, pokemon, text, background, human,
extra eyes, extra face, two heads, duplicated features, deformed,
spots, patterned markings, two characters, duplicate subject, pair</pre>
<p>Description: <strong>the animal, and nothing else.</strong> <code>A seal.</code>
<code>An otter.</code></p>

<h3>Trainers and people</h3>
<pre>super cute anime pixel art sprite, kawaii, flat cel shading, bright colours,
full body, side view</pre>
<pre>epic, majestic, regal, grimdark, soulslike, realistic, scary, menacing,
muted colours, pokemon, text, background, creature, animal, weapon</pre>

<h3>Scenery and effects</h3>
<pre>pixel art game asset, flat cel shading, limited palette, crisp pixel edges,
bright and clean</pre>
<p>For effects specifically, swap the style line to:</p>
<pre>pixel art game effect sprite, flat cel shading, bold saturated colour,
hard dark outline, crisp pixel edges, limited palette</pre>
<pre>realistic, photographic, grimdark, blurry, gradient, text, watermark,
signature, frame, border, human, character, pokemon</pre>

<h2>3 &middot; Five lessons, each paid for</h2>
<p>These cost 110 generations. They are why the last batch worked.</p>

<h3>1. Long descriptions cause soulslike drift</h3>
<p>The most important one, and already documented in <code>02 - Tooling/chibi.mjs</code> from an
earlier session:</p>
<blockquote>The style block said "adorable chibi" in 25 generic words while the subject line said
"magnificent regal mythical deity" in 40 concrete ones. Epic register wins that argument every
time.</blockquote>
<p>A two-word subject line cannot out-argue the style block, so the style block sets the register
unopposed. <strong>Shorter is better, every single time.</strong></p>

<h3>2. Patterns painted on a body become extra faces</h3>
<p>"Yellow lightning-bolt markings", "woven terracotta stripes", "slate-blue shield plates" &mdash;
each produced patterned blobs, and at this size a blob with two dots reads as a second face. Never
describe markings. A <strong>structural</strong> feature in the silhouette (a lantern tail, a long
snout) is safe; a <strong>pattern</strong> is not.</p>

<h3>3. Silhouette ambiguity is what actually breaks a bare prompt</h3>
<p>Animals the model knows cold survive two words and come out cleanest &mdash; seal, otter,
armadillo, bee, snail, hedgehog. Animals without a firm body plan collapse: <code>A firefly.</code>
returned a blonde anime girl in armour on both seeds; <code>A tapir.</code> grew a second head on
both. <strong>If a bare prompt fails, change the animal rather than adding words.</strong></p>

<h3>4. Duplicate subjects are common</h3>
<p>A big one and a small one of the same animal in one frame &mdash; seen with the bee, the snail,
and a firefly standing beside its own lantern. Hence <code>two characters, duplicate subject,
pair</code> in the negative.</p>

<h3>5. A style reference will not give up colour</h3>
<p>The trainer boy chains from the pink-haired trainer-girl at strength 35. Black hair failed in the
description, failed in the negative prompt, and failed with <code>text_guidance_scale</code> raised
from 8 to 12. Holding colour is most of what a style reference does. It was fixed in post instead,
by <code>scripts/recolour-hair.mjs</code>.</p>

<h2>4 &middot; Live in production &mdash; the cast</h2>
<p>19 sheets. <strong>The professor's blur was a renderer bug, not an art problem</strong>, and is
fixed &mdash; he needed no new art. Eighteen of these are unchanged; the trainer boy is new.</p>
<div class="grid">${sprites(CAST)}</div>

<h3>Trainer boy &mdash; imported, with a run cycle</h3>
<p>The only sheet that did not come from a still generation. Imported from a PixelLab character
export via <code>scripts/import-pixellab.mjs</code>, which took the <code>east</code> rotation as
the profile and built the run strip from the eight animation frames.</p>
${strip("public/pals/v2/48/trainer-boy--run.png", 48, 8)}
<div class="callout">
  <p>It is <strong>the first sheet to diverge from the others</strong> and the reason the manifest
  is a table rather than a constant: it has <strong>no 64 tier</strong>. 96 divides 48 and 32
  exactly but not 64, and writing one would mean inventing pixels, so <code>sourceFor</code> routes
  a 64px render to the 32 tier at exactly 2&times; instead.</p>
  <p>Its master lives in the export, not <code>art/masters/128</code> &mdash; the old one is retired
  under <code>art/masters/_retired</code> so the tier build cannot regenerate over the import.</p>
</div>
<div class="callout warn">
  <p>Measured at <strong>0.03 saturation</strong> and <strong>1.30:1 against the dark theme</strong>.
  Legible thanks to the outline rim, but far darker than anything else on screen. The cause is in
  the prompt &mdash; "messy black hair, simple hoodie and jeans" names no colour. If he is ever
  regenerated, name the colours; re-importing is one command and nothing else changes.</p>
</div>

<h2>5 &middot; Live in production &mdash; scenery</h2>
<p>22 generations, 9 installed. Clouds drift over the hero, sun swaps to moon on the dark theme,
14 trees stand on the horizon where gradient mounds used to fake them.</p>
<div class="grid">${sprites(SCENERY)}</div>
<p><code>cloud-3</code> and <code>cloud-3.dark</code> were dropped: both dark candidates read as
jellyfish, and a day cloud with no dark variant shows white in a storm.</p>

<h2>6 &middot; Live in production &mdash; effects</h2>
<p>18 generations, 9 installed. <strong>These fixed a live bug</strong> &mdash;
<code>.attack-bolt</code> was rendered by the battle screen from day one and defined nowhere in
CSS, so every attack in the game was invisible.</p>
<div class="grid">${sprites(FX)}</div>

<h2>7 &middot; Pending generation</h2>
<p>Everything still outstanding, with a suggested prompt for each. The prompts already apply the
lessons in &sect;3 &mdash; short, no patterns, unambiguous silhouettes. Append the matching style
suffix from &sect;2 and use the matching negative.</p>

<h3>7.1 &nbsp; Characters &mdash; Bitforge, 192px, creature style</h3>
<p>Seven wild Paruu, one per route. These replace the Glitchling, a 16&times;16 matrix that is
currently the opponent in every wild battle on every route. <strong>The description is the animal
and nothing else</strong> &mdash; each of these species was chosen because its silhouette is
unmistakable, which is what lets a two-word prompt work.</p>
<table>
  <tr><th>#</th><th>Item</th><th>Tool</th><th>Prompt</th></tr>
  ${row(1, "AZ-900 &middot; Nimbit", "Bitforge", "A chubby baby seal with soft white fur and a pale blue nose,\nsitting up with its flippers raised.", "The Azure Archipelago")}
  ${row(2, "AI-901 &middot; Arcnode", "Bitforge", "A round baby pufferfish with bright yellow skin and short soft\nspines, puffed up and grinning.", "The Lightning Shoals")}
  ${row(3, "DP-900 &middot; Siltbyte", "Bitforge", "A chubby baby otter with warm brown fur and a cream belly,\nsitting up on its hind legs.", "The Datastream Delta")}
  ${row(4, "DP-600 &middot; Combcache", "Bitforge", "A round baby bee with golden fuzz and small translucent wings,\nhovering with its arms out.", "The Delta's weaving quarter")}
  ${row(5, "SC-900 &middot; Wardshell", "Bitforge", "A chubby baby armadillo with a smooth slate-blue shell and short\nlegs, looking up.", "The Bastion Cliffs")}
  ${row(6, "AB-900 &middot; Tasklet", "Bitforge", "A small baby snail with a coral-pink shell and a cream body,\nstretching forward with its eye stalks up.", "Agent Atoll")}
  ${row(7, "PL-900 &middot; Quillbyte", "Bitforge", "A round baby hedgehog with soft russet quills and a pale face,\nstanding on its hind legs.", "The Maker Mangroves")}
</table>
<div class="callout">
  <p><strong>Why these can be long when the earlier long ones failed.</strong> Length was never the
  mechanism. Two things were:</p>
  <ul>
    <li><strong>Register conflict.</strong> A subject line full of concrete epic words out-argues a
    generic style block, and epic wins. Every line above stays in the cute register &mdash;
    <em>chubby, baby, round, soft, grinning</em> &mdash; so it pulls the same direction as
    <code>super cute chibi kawaii</code> rather than against it.</li>
    <li><strong>Patterns.</strong> "Lightning-bolt markings", "woven stripes", "shield plates"
    painted a pattern on a body, and a patterned blob with two dots reads as a second face. These
    describe <em>structure and pose</em> &mdash; flippers raised, hovering, standing on hind legs
    &mdash; and a single body colour. No surface markings anywhere.</li>
  </ul>
  <p><strong>If the drift returns, cut back to the bare noun</strong> (<code>A seal.</code>) rather
  than adding defensive clauses. That version is known to work structurally; it just came back
  colourless.</p>
</div>

<h3>7.2 &nbsp; Map avatar &mdash; character tool, 96px, 8 directions</h3>
<p>Separate from the trainer, and a different job. The region map is drawn top-down and currently
has no player character on it at all. An 8-rotation character with a walk cycle is exactly an
overworld avatar &mdash; which is why <strong>top-down is correct here</strong>, where it was wrong
for the battle cast.</p>
<table>
  <tr><th>#</th><th>Item</th><th>Tool</th><th>Prompt</th></tr>
  ${row(8, "Map avatar &mdash; boy", "Character, 8 dir", "A cheerful teenage boy with short black hair, wearing a teal hoodie,\nsand-coloured jeans and white trainers, walking with a relaxed stride.\nLow top-down perspective, crisp black outlines.", "all 8 directions + a walk cycle")}
  ${row(9, "Map avatar &mdash; girl", "Character, 8 dir", "A cheerful teenage girl with long pink hair, wearing a coral jacket,\nblue jeans and white trainers, walking with a relaxed stride.\nLow top-down perspective, crisp black outlines.", "to match trainer-girl")}
</table>
<div class="callout warn">
  <p><strong>Name the colours.</strong> This is the one lesson the first export taught: "messy black
  hair, simple hoodie and jeans" contains no colour, and PixelLab returned a near-black silhouette
  measuring <strong>1.30:1 against the dark theme</strong> &mdash; effectively invisible. Greyscale
  cannot be colourised afterwards.</p>
  <p>For a map avatar generate <strong>all 8 directions</strong>; the map turns. For anything in
  battle or setup, generate <strong>east only</strong> and pay a quarter as much &mdash; the app
  uses the profile and mirrors it.</p>
</div>

<h3>7.3 &nbsp; Terrain &mdash; tileset tool, 32px tiles</h3>
<p>The tileset tool takes a <em>lower</em> and an <em>upper</em> terrain and generates the seamless
transitions between them. Three sets cover the map and the roads. They get composited offline into
one map image per theme, so no runtime tile renderer is needed.</p>
<table>
  <tr><th>#</th><th>Item</th><th>Tool</th><th>Prompt</th></tr>
  ${row(10, "Sea to shore", "Tileset", "lower:  Shallow turquoise sea water with gentle ripples\nupper:  Pale wet sand with scattered small shells", "The Monsoon Belt is an estuary")}
  ${row(11, "Shore to land", "Tileset", "lower:  Pale wet sand with scattered small shells\nupper:  Lush green mangrove grass with low tufts", "")}
  ${row(12, "Land to road", "Tileset", "lower:  Lush green mangrove grass with low tufts\nupper:  Packed brown dirt road with faint wheel ruts", "wishlist item 10")}
</table>

<h3>7.4 &nbsp; Props and icons &mdash; Pixflux, 192px, scenery style</h3>
<p>Small single objects on a transparent background. Same rule as the creatures: name the object,
do not describe its surface.</p>
<table>
  <tr><th>#</th><th>Item</th><th>Tool</th><th>Prompt</th></tr>
  ${row(13, "Dungeon building", "Pixflux", "A small stone gym building with a domed slate roof, a wide arched\ndoorway and two narrow windows, seen from the front.", "replaces GYM_SPRITE, whose hardcoded colours ignore the theme")}
  ${row(14, "Ribbon badge, earned", "Pixflux", "A round brass medal with a fluted edge, hanging from a short\nred ribbon.", "replaces the 🏅 emoji")}
  ${row(15, "Ribbon badge, locked", "Pixflux", "A plain grey stone disc hanging from a short frayed ribbon.", "replaces the ⚪ emoji")}
  ${row(16, "Shard", "Pixflux", "A single faceted gemstone in deep blue, cut to a point, with one\nbright highlight.", "the learning path's currency, currently the glyph ◆")}
  ${row(17, "Path seal", "Pixflux", "A round gold wax seal with a five-pointed star pressed into its\ncentre and a scalloped edge.", "the reward for clearing a path, currently ★")}
  ${row(18, "Mode icon &mdash; Learning Path", "Pixflux", "An open book lying flat with visible pages and a ribbon marker.", "one per mode panel")}
  ${row(19, "Mode icon &mdash; Practice", "Pixflux", "A round archery target with concentric rings and one arrow in\nthe centre.", "")}
  ${row(20, "Mode icon &mdash; Exam", "Pixflux", "A rolled paper scroll tied with a brass ribbon.", "")}
</table>

<h3>7.5 &nbsp; Animation &mdash; animation tool, 96px</h3>
<p>Not a text prompt in the usual sense: the animation tools take an <strong>existing sprite</strong>
plus an action, so these need the finished cast as input. Two clips each for the two trainers and
the nine starter Paruu, roughly 33 in total.</p>
<table>
  <tr><th>#</th><th>Item</th><th>Tool</th><th>Prompt</th></tr>
  ${row(21, "Run cycle", "Animate with text / skeleton", "walking", "2 trainers + 9 starters")}
  ${row(22, "Battle cycle", "Animate with text / skeleton", "attacking", "same cast")}
</table>
<div class="callout">
  <p><strong>96px, not 192</strong> &mdash; 96 divides both render tiers (48 and 32) and the frame
  budget is width &times; height &times; frames &le; 524,288, so 96&times;96 comfortably allows 16
  frames where 192 allows only 8.</p>
  <p><strong>Frame 0 must be the rest pose.</strong> Under reduced motion the app freezes a strip at
  frame 0, so whatever pose is first is what a person who disables animation will see permanently.</p>
</div>

<h3>7.6 &nbsp; Not for PixelLab</h3>
<p>The UI kit &mdash; cursor, arrows, checkbox, currently the glyphs <code>&#9654;</code>
<code>&#9745;</code> <code>&#9744;</code>. At 8&ndash;16px a generated sprite is unreliable, and
these are better hand-authored as matrices so they re-ink with the theme, which a raster cannot.
Say the word and I will write them; they need no generation.</p>

<h2>8 &middot; Getting new art into the app</h2>
<p>Drop 192px PNGs into <code>art/gen/out/&lt;batch&gt;/</code> named
<code>&lt;subject&gt;-v&lt;n&gt;.png</code>, then:</p>
<pre>node art/gen/review-artifact.mjs &lt;batch&gt;   # build a review page

# or, for a PixelLab character export (.zip), unzip it and:
node scripts/import-pixellab.mjs &lt;export-dir&gt; &lt;sheet-name&gt;</pre>
<p>Record the winner per subject in <code>art/picks.json</code>, then:</p>
<pre>node scripts/build-scenery.mjs   # scenery/effects -> public/scenery/v1/{96,48}
node scripts/build-tiers.mjs     # cast masters    -> public/pals/v2/{96,64,48,32}
node scripts/verify-assets.mjs   # also runs as part of npm run lint</pre>
<div class="callout">
  <p>The build does the three things that turn a generation into a sprite: box downsample,
  median-cut quantise to 16 colours, and snap alpha to binary. <strong>A raw generation is not
  pixel art until it has been quantised</strong> &mdash; judge candidates after that step, not
  before. Several of these looked wrong raw and fine after.</p>
</div>

<h2>9 &middot; Spend</h2>
<table>
  <tr><th>Batch</th><th>Generations</th><th>Outcome</th></tr>
  <tr><td>1 &mdash; scenery</td><td>22</td><td>9 installed, live</td></tr>
  <tr><td>2 &mdash; effects</td><td>18</td><td>9 installed, live</td></tr>
  <tr><td>3 &mdash; characters</td><td>70</td><td>not shipped &mdash; see &sect;7.1</td></tr>
  <tr><td><strong>Total</strong></td><td><strong>110</strong></td><td></td></tr>
</table>
<p>Batch 3 took five passes because the register had to be rediscovered, and its output is not being
carried forward. That is not wasted: the recipe in &sect;2 and the lessons in &sect;3 <em>are</em>
those 70 generations, and they are what should let the &sect;7 items land in one pass each rather
than five. The candidates themselves remain on disk under
<code>art/gen/out/characters*</code> if any turn out to be worth revisiting.</p>
</div>
`;

const out = path.join(HERE, "out/handover.html");
fs.writeFileSync(out, html);
console.log(`-> ${out}  (${(fs.statSync(out).size / 1024 / 1024).toFixed(2)} MB)`);
