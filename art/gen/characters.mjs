/**
 * Batch 3 — the revised trainer boy, and one wild Paruu per route.
 *
 *   node --use-system-ca art/gen/characters.mjs [--dry] [--only=label,...]
 *
 * TWO DIFFERENT RECIPES IN ONE BATCH, AND THE DIFFERENCE MATTERS
 *
 * **The trainer IS chained.** He is meant to look like trainer-girl's
 * classmate — same school, same illustrator — so trainer-girl goes in as
 * style_image at strength 35. Copying subject traits is the point here.
 *
 * **The creatures are NOT chained.** guardians.mjs learned this twice: style
 * chaining copies subject traits, and a creature that inherits another
 * creature's face is worse than one that is merely inconsistent. All fresh
 * seeds, no style image, the same bitforge recipe the guardians used — these
 * are their smaller cousins and should look it.
 *
 * WHY BITFORGE AND 192
 *
 * Bitforge is the endpoint the whole cast was generated with and the only one
 * that takes a style reference. It caps at 200px; 192 is the largest size
 * under that cap which divides exactly into every render tier (192/2=96,
 * /3=64, /4=48, /6=32).
 *
 * FRAMING
 *
 * scripts/build-tiers.mjs measures canvas fill, and the existing cast reads
 * badly on it: fire-1 and guardian-az-900 occupy 20% of their frame, so at
 * 32px they are specks. Every description here ends by demanding the subject
 * fill the frame. Trainers are exempt in spirit — a human figure is roughly
 * 1:4 and cannot fill a square — but the creatures have no excuse.
 *
 * THE NAMES
 *
 * Draft, for the user to edit. The house style is a nature word welded to a
 * computing word: Glidebit, Brinebit, Podbyte, Rootstack, Coilcache,
 * Leviamux; guardians Straitwing, Voltfin, Deltoad, Loomwing, Bastilisk,
 * Beaconid, Mangroot. Each wild Paruu is native to its route's region and
 * deliberately smaller and plainer than that region's guardian, because it is
 * the thing you meet on the way to the guardian, not a rival to it.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runBatch } from "../lib/generate.mjs";
import { decodePNG, encodePNG } from "../lib/png.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(HERE, "../..");

const GEN_SIZE = 192;

/**
 * trainer-girl, as the style reference the boy is chained from.
 *
 * **style_image must be exactly the output size.** Passing the 128px master
 * against a 192px request fails with
 * `style_image must be size (192, 192), not torch.Size([128, 128])`, which is
 * not documented anywhere and cost two generations to discover.
 *
 * So it is built from the 96 tier at exactly 2x rather than by stretching the
 * 128 master by 1.5x. 96 divides 192 evenly, so nearest-neighbour doubling
 * duplicates every pixel exactly and invents nothing; 128 -> 192 would land
 * on half-pixels and smear the very edges the style encoder is reading.
 */
function styleRef(sheet) {
  const src = decodePNG(fs.readFileSync(path.join(APP, `public/pals/v2/96/${sheet}.png`)));
  const f = GEN_SIZE / src.width;
  if (!Number.isInteger(f)) throw new Error(`${sheet}: ${src.width} does not divide ${GEN_SIZE}`);
  const out = new Uint8Array(GEN_SIZE * GEN_SIZE * 4);
  for (let y = 0; y < GEN_SIZE; y++) {
    for (let x = 0; x < GEN_SIZE; x++) {
      const s = (Math.floor(y / f) * src.width + Math.floor(x / f)) * 4;
      const d = (y * GEN_SIZE + x) * 4;
      out[d] = src.pixels[s]; out[d + 1] = src.pixels[s + 1];
      out[d + 2] = src.pixels[s + 2]; out[d + 3] = src.pixels[s + 3];
    }
  }
  return encodePNG(GEN_SIZE, GEN_SIZE, out).toString("base64");
}

const GIRL = styleRef("trainer-girl");

/* --- The recipe, recovered from the runs that produced the approved cast ---

   The first attempt at this batch came back, in the user's words, looking
   "like coming out of a soul game". That is not a new failure: chibi.mjs in
   the vault documents it and diagnoses it exactly.

     "The soul-like drift had a simpler cause than any of those patches. The
      style block said 'adorable chibi' in 25 generic words while the subject
      line said 'magnificent regal mythical deity' in 40 concrete ones. Epic
      register wins that argument every time."

   Its conclusion: SUBJECT, ONE DISTINGUISHING FEATURE, CHIBI. Nothing else.

   Three things went wrong the first time, all of them things that file warns
   about:

   1. **The descriptions were long.** ~35 words each, every clause a defensive
      patch ("fills the frame", "big head", "gentle eyes"). chibi.mjs is
      explicit that these accumulate, fight the model, and bury the two words
      that matter. The winning prompts are one line:
      "A chubby baby pangolin with leaf-shaped green scales. Chibi, big head,
      huge sparkling eyes."

   2. **The negative prompt was missing the words that actually block it** —
      regal, ornate, soulslike, scary, menacing, muted colours. Restored from
      final.mjs, which is the most evolved version.

   3. **The subjects were unappealing.** A spider, a boulder, a mudskipper and
      a tuber. The approved cast is a pangolin, an axolotl, a deer, a mermaid,
      a hermit crab, a moth, a seabird — animals with faces you want to like.
      Every subject below is now a baby animal, and the region is expressed
      through its ONE feature rather than by making the creature out of the
      landscape.

   "Fills the frame" is gone. It was mine, it is exactly the kind of
   defensive clause chibi.mjs removed, and it pushed everything toward
   featureless spheres. */
const CREATURE_STYLE =
  "super cute chibi anime pixel art sprite, kawaii, flat cel shading, bright colours";
const CREATURE_NEG =
  "epic, majestic, regal, ornate, grimdark, soulslike, realistic, scary, " +
  "menacing, muted colours, pokemon, text, background, human, " +
  // The anatomy failures being corrected: patterned bodies were producing
  // blobs that read as a second face, and several came back distorted.
  "extra eyes, extra face, two heads, duplicated features, deformed, " +
  "spots, patterned markings, " +
  // Seen three times now: a big one and a small one of the same animal in
  // one frame (bee v1, snail v2, and the firefly beside its own lantern).
  // mythical.mjs blocks this too.
  "two characters, duplicate subject, pair";

const TRAINER_STYLE =
  "super cute anime pixel art sprite, kawaii, flat cel shading, bright colours, " +
  "full body, side view";
const TRAINER_NEG =
  "epic, majestic, regal, grimdark, soulslike, realistic, scary, menacing, " +
  "muted colours, pokemon, text, background, creature, animal, weapon, " +
  // Belt and braces on the hair: the style reference is pink-haired.
  "pink hair, red hair, blonde hair";

const SUBJECTS = [
  /* --- the revised trainer boy -------------------------------------------
     The brief: match trainer-girl, teenage student, stylish uniform,
     colourful hair. The existing boy is a cap-and-satchel scout and reads as
     a different game from her storm coat. This one IS chained. */
  {
    key: "trainer-boy",
    desc:
      "A cheerful teenage schoolboy with black hair, a neat school " +
      "uniform and a small satchel, standing.",
    seeds: [92101, 92168],
    style: TRAINER_STYLE,
    negative: TRAINER_NEG,
    extra: {
      style_image: { type: "base64", base64: GIRL, format: "png" },
      style_strength: 35,
      /* trainer-girl has PINK hair, and at strength 35 the reference was
         winning: both previous passes came back pink-haired however the
         description was worded. This is the same fight mythical.mjs had when
         a new form had to outgrow its reference, and the same remedy —
         text_guidance_scale defaults to 8, max 20, and 12 is enough to let
         the description carry a colour the reference disagrees with.
         Strength stays at 35 rather than dropping: 35 is what buys the
         classmate look — same uniform, same rendering weight — and that part
         is working. Only the hair needs to escape. */
      text_guidance_scale: 12,
    },
  },

  /* --- one wild Paruu per route ------------------------------------------
     Fresh seeds, no style image, one line each. The region is carried by the
     single distinguishing feature, not by building the animal out of the
     landscape — a cloud, a boulder and a tuber were the last attempt and none
     of them had a face worth liking. */
  /* The animal. Nothing else.
     This is the end of the road the last two passes were walking down. Each
     time the description got shorter the result got better, so the subject
     line is now a noun and a full stop.
     The register lives entirely in CREATURE_STYLE now — "super cute chibi
     ... kawaii" — and that is the point. chibi.mjs diagnosed the soulslike
     drift as the subject line and the style block arguing about register, with
     the more concrete one winning. A subject line of two words cannot win that
     argument, so the style block sets the register unopposed.
     Region comes from the choice of animal and nothing else: a seal belongs to
     the archipelago, a silkworm to the weaving quarter, a tapir to the
     mangroves.
     WHICH ANIMALS SURVIVE A TWO-WORD PROMPT
     Not all of them, and the rule is silhouette ambiguity rather than
     anything about detail.
     A seal, an armadillo and an otter have body plans the model knows cold,
     so two words are plenty and the results were the cleanest of any pass.
     A silkworm, a firefly and a tapir do not. Given nothing to anchor on the
     model fills the gap with whatever the style block pulls hardest toward —
     which, with "super cute chibi kawaii" in it, is an anime girl. The firefly
     came back as a blonde girl in armour on both seeds; the tapir grew a
     second head on both.
     So the three ambiguous species were replaced rather than propped up with
     feature clauses, which keeps every prompt bare:
       silkworm -> bee       (a maker, and a complement to Loomwing the moth)
       firefly  -> snail     (carries its house; a slow messenger for the atoll)
       tapir    -> hedgehog  (unmistakable outline, small forest creature) */
  { key: "wild-az-900", desc: "A seal.", seeds: [92235, 92302] },
  { key: "wild-ai-901", desc: "A pufferfish.", seeds: [92369, 92436] },
  { key: "wild-dp-900", desc: "An otter.", seeds: [92503, 92570] },
  { key: "wild-dp-600", desc: "A bee.", seeds: [94101, 94168] },
  { key: "wild-sc-900", desc: "An armadillo.", seeds: [92771, 92838] },
  { key: "wild-ab-900", desc: "A snail.", seeds: [94235, 94302] },
  { key: "wild-pl-900", desc: "A hedgehog.", seeds: [94369, 94436] },
];

await runBatch(SUBJECTS, {
  appRoot: APP,
  outDir: path.join(HERE, "out/characters"),
  style: CREATURE_STYLE,
  negative: CREATURE_NEG,
  size: GEN_SIZE,
  endpoint: "bitforge",
});
