/**
 * Generates content/<code>/learning-path.json for every playable exam.
 *
 * The path structure is NOT invented here: the learning-path titles and their
 * module titles are the real ones published on Microsoft Learn, pulled from
 * the public catalog API (learn.microsoft.com/api/catalog) and pinned below by
 * their catalog uid. That is what makes the in-app path "the same path" a
 * learner would follow on Microsoft Learn.
 *
 * What is ours: every word of teaching. Module titles are factual labels for
 * navigation; the prose behind each one is the study guide this project wrote
 * from the published skills outline. No Microsoft body text is copied.
 *
 * Module -> content mapping: a domain's study-guide sections and flashcards
 * are distributed across that domain's modules in order, as evenly as they
 * divide. Both sequences follow the same syllabus order, so position is a
 * meaningful join — but it is a heuristic, and `npm run lint:paths` (see the
 * validator in content.ts) is what catches a module that ended up with
 * nothing in it.
 *
 * Re-run:  node "02 - Tooling/learning-paths.mjs"
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CATALOG = "https://learn.microsoft.com/api/catalog/?type=learningPaths,modules&locale=en-us";

/**
 * domainId -> Microsoft Learn learning-path uid.
 *
 * `null` means Microsoft Learn has no single published path matching that
 * domain — AI-901 is brand new in 2026 and its paths are not in the catalog
 * yet, and SC-900's compliance path is not exposed under a matching title.
 * Those fall back to the exam's own domain name as the path title, and the
 * module list becomes the study-guide sections. The app renders the "on
 * Microsoft Learn" link only when a uid resolved, so nothing claims a source
 * it does not have.
 */
const PATH_UIDS = {
  "az-900": {
    "cloud-concepts": "learn.wwl.microsoft-azure-fundamentals-describe-cloud-concepts",
    "architecture-services": "learn.wwl.azure-fundamentals-describe-azure-architecture-services",
    "management-governance": "learn.wwl.describe-azure-management-governance",
  },
  "dp-900": {
    "core-data-concepts": "learn.wwl.azure-data-fundamentals-explore-core-data-concepts",
    "relational-data": "learn.wwl.azure-data-fundamentals-explore-relational-data",
    "nonrelational-data": "learn.wwl.azure-data-fundamentals-explore-non-relational-data",
    "analytics-workload": "learn.wwl.azure-data-fundamentals-explore-data-warehouse-analytics",
  },
  "sc-900": {
    "sci-concepts": "learn.wwl.describe-concepts-of-security-compliance-identity",
    entra: "learn.wwl.describe-capabilities-of-microsoft-identity-access-management-solutions",
    "security-solutions": "learn.wwl.describe-capabilities-of-microsoft-security-solutions",
    "compliance-solutions":
      "learn.wwl.describe-capabilities-of-microsoft-compliance-solutions",
  },
  "pl-900": {
    "business-value": "learn-bizapps.power-platform-business-value-path",
    environment: "learn.wwl.manage-microsoft-power-platform-environment",
    "power-apps": "learn.wwl.demonstrate-capabilities-power-apps",
    "power-automate": "learn.wwl.demonstrate-capabilities-microsoft-power-automate",
    "copilot-studio-agents": "learn.wwl.create-extend-custom-copilots-microsoft-copilot-studio",
  },
  "ab-900": {
    "core-features": "learn.wwl.explore-microsoft-365-copilot-agent-administration",
    "data-protection-governance": "learn.wwl.purview-secure-govern-copilot-interactions",
    "copilot-agent-admin": "learn.wwl.explore-microsoft-365-copilot-agent-administration",
  },
  "dp-600": {
    "plan-implement-manage": "learn.wwl.get-started-fabric",
    "prepare-serve-data": "learn.wwl.design-transform-analytics-data",
    "semantic-models": "learn.wwl.design-manage-semantic-models-fabric",
    "explore-analyze": "learn.wwl.explore-analytics-data-stores",
  },
  // Both come from the AI-901 exam page's own `learn_item` list, which pins
  // exactly these two paths — and they line up one-to-one with the two
  // skills-measured areas rather than needing an editorial split.
  "ai-901": {
    "ai-concepts": "learn.ai-technical-concepts",
    "foundry-implementation": "learn.wwl.get-started-ai-apps-agents",
  },
};

/** Spread `items` across `buckets` groups, front-loading any remainder. */
function distribute(items, buckets) {
  const out = Array.from({ length: buckets }, () => []);
  if (buckets === 0) return out;
  items.forEach((item, i) => out[i % buckets].push(item));
  return out;
}

const read = (code, file) =>
  JSON.parse(readFileSync(join(ROOT, "content", code, file), "utf8"));

async function main() {
  const catalog = await fetch(CATALOG).then((r) => r.json());
  const paths = new Map((catalog.learningPaths ?? []).map((p) => [p.uid, p]));
  const modules = new Map((catalog.modules ?? []).map((m) => [m.uid, m]));

  for (const [code, byDomain] of Object.entries(PATH_UIDS)) {
    const outline = read(code, "outline.json");
    const guide = read(code, "study-guide.json");
    const cards = read(code, "flashcards.json");

    const learningPaths = outline.domains.map((domain) => {
      const uid = byDomain[domain.id] ?? null;
      const lp = uid ? paths.get(uid) : null;

      const sections =
        guide.find((g) => g.domainId === domain.id)?.sections ?? [];
      const domainCards = cards.filter((c) => c.domain === domain.id);

      // Titles come from Microsoft Learn where we have them. Where we don't,
      // each of our own sections becomes a module, which is the same shape.
      const moduleTitles = lp
        ? (lp.modules ?? [])
            .map((u) => modules.get(u)?.title)
            .filter(Boolean)
        : sections.map((s) => s.heading);

      const titles = moduleTitles.length ? moduleTitles : sections.map((s) => s.heading);
      const sectionGroups = distribute(sections.map((s) => s.id), titles.length);
      const cardGroups = distribute(domainCards.map((c) => c.id), titles.length);

      return {
        id: domain.id,
        title: lp ? lp.title : domain.name,
        domainId: domain.id,
        msLearnUrl: lp ? lp.url.split("?")[0] : null,
        modules: titles.map((title, i) => ({
          id: `${domain.id}-m${i + 1}`,
          title,
          sectionIds: sectionGroups[i] ?? [],
          cardIds: cardGroups[i] ?? [],
        })),
      };
    });

    const payload = {
      examCode: outline.examCode,
      note: "Learning path and module titles mirror the structure published on Microsoft Learn. All teaching content is original to ExamParuu.",
      paths: learningPaths,
    };

    writeFileSync(
      join(ROOT, "content", code, "learning-path.json"),
      JSON.stringify(payload, null, 2) + "\n",
      "utf8",
    );

    const mods = learningPaths.reduce((n, p) => n + p.modules.length, 0);
    const empty = learningPaths.flatMap((p) =>
      p.modules.filter((m) => m.cardIds.length === 0).map((m) => m.id),
    );
    console.log(
      `${code}: ${learningPaths.length} paths, ${mods} modules` +
        (empty.length ? `  ⚠ no cards: ${empty.join(", ")}` : ""),
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
