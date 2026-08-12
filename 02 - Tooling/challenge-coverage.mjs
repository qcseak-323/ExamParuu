/**
 * Measures which checkpoint formats every learning-path module can build.
 *
 * The learning path's whole promise is variety, and that promise is easy to
 * silently break: a builder's precondition (enough cards, enough distractors)
 * can strand a module on a single format with no error anywhere. This script
 * re-derives each builder's precondition against the real content files and
 * fails the run if any module is locked to one format or can build fewer
 * than three.
 *
 * The preconditions here mirror src/lib/learningPath.ts by hand — they must
 * be kept in step with the builders. Duplicating them is deliberate: this
 * runs under plain node with no TS toolchain, and a drifted copy fails loud
 * (the gate trips), not silent.
 *
 * Run:  node "02 - Tooling/challenge-coverage.mjs"
 */

import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

/**
 * Discovered from disk, never listed by hand.
 *
 * This was a hardcoded array of eleven codes, and adding AB-730 and AB-731 on
 * 2026-08-12 proved why that is unsafe: both new exams were skipped in
 * silence, the module count did not move, and the gate reported a pass it had
 * not actually checked. A gate that quietly ignores new content is worse than
 * no gate, because it reads as assurance.
 *
 * Any directory under content/ carrying both a questions file and a learning
 * path is an exam with modules to measure.
 */
const EXAMS = readdirSync(join(ROOT, "content"), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter(
    (code) =>
      existsSync(join(ROOT, "content", code, "questions.json")) &&
      existsSync(join(ROOT, "content", code, "learning-path.json")),
  )
  .sort();

const MATCH_SIZE = 4;
const REVERSE_DISTRACTORS = 3;

const read = (code, file) =>
  JSON.parse(readFileSync(join(ROOT, "content", code, file), "utf8"));

/** Formats the ORIGINAL rotation could build — the "before" column. */
function beforeFormats({ moduleCards, recallPool, allCards }) {
  const out = [];
  if (recallPool > 0) out.push("recall");
  if (moduleCards.length >= 2) out.push("match");
  if (moduleCards.length >= 2 && allCards.length > moduleCards.length)
    out.push("multi");
  return out;
}

/** Formats the widened builders can build — the "after" column. */
function afterFormats({
  moduleCards,
  recallPool,
  domainCards,
  allCards,
  domainId,
  domainsWithTwo,
}) {
  const out = [];
  const unionIds = new Set([...moduleCards, ...domainCards].map((c) => c.id));
  const distinctExamFronts = new Set(allCards.map((c) => c.front)).size;

  if (recallPool > 0) out.push("recall");
  // buildReverse: one module card + three distinct fronts that are not the
  // picked card's. Four distinct fronts exam-wide covers any pick.
  if (
    moduleCards.length >= 1 &&
    distinctExamFronts >= REVERSE_DISTRACTORS + 1
  )
    out.push("reverse");
  // buildMatch: module cards topped up from the domain, final set >= 2.
  if (Math.min(MATCH_SIZE, unionIds.size) >= 2) out.push("match");
  // buildMulti: >= 2 module cards and any distractor outside the module
  // (domain first, exam-wide fallback).
  if (
    moduleCards.length >= 2 &&
    allCards.some((c) => !moduleCards.some((m) => m.id === c.id))
  )
    out.push("multi");
  // buildOddOne: three distinct in-domain fronts + one card from elsewhere.
  const domainFronts = new Set(
    [...moduleCards, ...domainCards].map((c) => c.front),
  ).size;
  if (domainFronts >= 3 && allCards.some((c) => c.domain !== domainId))
    out.push("oddOne");
  // buildSort: two domains that can each fill a bucket with two cards.
  if (domainsWithTwo >= 2) out.push("sort");
  // buildSwipe: a deck of two, module cards padded from the domain.
  if (unionIds.size >= 2) out.push("swipe");
  return out;
}

let failures = 0;
const distribution = { before: new Map(), after: new Map() };
const bump = (which, n) =>
  distribution[which].set(n, (distribution[which].get(n) ?? 0) + 1);

for (const code of EXAMS) {
  const questions = read(code, "questions.json");
  const allCards = read(code, "flashcards.json");
  const { paths } = read(code, "learning-path.json");

  const byDomain = new Map();
  for (const c of allCards)
    byDomain.set(c.domain, [...(byDomain.get(c.domain) ?? []), c]);
  const domainsWithTwo = [...byDomain.values()].filter(
    (cs) => cs.length >= 2,
  ).length;

  console.log(`\n${code}`);
  for (const path of paths) {
    for (const mod of path.modules) {
      if (mod.cardIds.length === 0) continue; // unenterable: menu disables it
      const cardById = new Map(allCards.map((c) => [c.id, c]));
      const moduleCards = mod.cardIds
        .map((id) => cardById.get(id))
        .filter(Boolean);
      const domainCards = byDomain.get(path.domainId) ?? [];
      const inModule = questions.filter(
        (q) => q.teaches && mod.sectionIds.includes(q.teaches),
      ).length;
      const recallPool =
        inModule > 0
          ? inModule
          : questions.filter((q) => q.domain === path.domainId).length;

      const args = {
        moduleCards,
        recallPool,
        domainCards,
        allCards,
        domainId: path.domainId,
        domainsWithTwo,
      };
      const before = beforeFormats(args);
      const after = afterFormats(args);
      bump("before", before.length);
      bump("after", after.length);

      const bad = after.length < 3;
      if (bad) failures += 1;
      console.log(
        `  ${bad ? "✗" : "✓"} ${mod.id.padEnd(36)} before=${before.length} after=${after.length}  [${after.join(", ")}]`,
      );
    }
  }
}

const fmt = (m) =>
  [...m.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([n, count]) => `${n} format(s): ${count} module(s)`)
    .join("  ·  ");

console.log(`\nDistribution BEFORE: ${fmt(distribution.before)}`);
console.log(`Distribution AFTER:  ${fmt(distribution.after)}`);

if (failures > 0) {
  console.error(`\nGATE FAILED: ${failures} module(s) below 3 formats.`);
  process.exit(1);
}
console.log("\nGate passed: every module builds ≥3 formats, none single-format.");
