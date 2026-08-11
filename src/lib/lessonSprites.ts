import { sprite, type SpriteMatrix } from "./sprite";

/**
 * Concept marks for the learning-path cards — as matrices, not art.
 *
 * A lesson card is a term and a definition on a panel, and 319 of them in a
 * row read as a wall of text with a button under it. These give every card
 * something to look at.
 *
 * ── Why a new file rather than uiSprites.ts ──
 *
 * `uiSprites.ts` holds *interface* marks: the things you press, and the marks
 * that replaced text glyphs in a line of type. These are neither — they
 * illustrate content. Keeping them apart also keeps this session out of a file
 * a parallel branch has already collided on once.
 *
 * ── Why matrices ──
 *
 * Design law 10. A raster bakes its outline in, and on Storm Watch the near-
 * black outline *is* the panel colour. Every cell here is `C`, which resolves
 * to `currentColor`, so a mark inks itself from whatever text colour surrounds
 * it and follows both themes, `data-contrast="high"`, and the text-size
 * preference for free. It is also the reason there is no palette argument —
 * `PixelSprite` defaults to an inherited one.
 *
 * ── Why keyed on domain rather than on the card ──
 *
 * There are 319 flashcards and 25 exam domains. One mark per card would mean
 * 319 hand-authored matrices; one per domain means 14, because the concepts
 * genuinely repeat — "governance" is a clipboard whether it is Azure's or
 * Microsoft 365's, and drawing it twice would produce two clipboards, not two
 * ideas. The cost is that the three cards inside one module usually share a
 * domain, so they share a mark. That reads as a module theme rather than as a
 * per-card illustration, which is the honest limit of this approach.
 *
 * Every matrix is 16×16 and rendered at 48 (3×) so the grid stays exact.
 */

const CLOUD = sprite("lesson-cloud", [
  "                ",
  "                ",
  "                ",
  "       CCCC     ",
  "     CCCCCCCC   ",
  "    CCCCCCCCCC  ",
  "  CCCCCCCCCCCCC ",
  " CCCCCCCCCCCCCC ",
  " CCCCCCCCCCCCCC ",
  "  CCCCCCCCCCCC  ",
  "                ",
  "                ",
  "                ",
  "                ",
  "                ",
  "                ",
]);

const SHIELD = sprite("lesson-shield", [
  "                ",
  "    CCCCCCCC    ",
  "   CCCCCCCCCC   ",
  "  CCCCCCCCCCCC  ",
  "  CCCCCCCCCCCC  ",
  "  CCCCCCCCCCCC  ",
  "  CCCCCCCCCCCC  ",
  "  CCCCCCCCCCCC  ",
  "   CCCCCCCCCC   ",
  "   CCCCCCCCCC   ",
  "    CCCCCCCC    ",
  "     CCCCCC     ",
  "      CCCC      ",
  "       CC       ",
  "                ",
  "                ",
]);

const KEY = sprite("lesson-key", [
  "                ",
  "                ",
  "     CCCC       ",
  "    CC  CC      ",
  "   CC    CC     ",
  "   CC    CC     ",
  "    CC  CC      ",
  "     CCCC       ",
  "      CC        ",
  "      CC        ",
  "      CCCC      ",
  "      CC        ",
  "      CCC       ",
  "      CC        ",
  "                ",
  "                ",
]);

const DOCUMENT = sprite("lesson-document", [
  "                ",
  "   CCCCCCCCCC   ",
  "   C        C   ",
  "   C CCCCCC C   ",
  "   C        C   ",
  "   C CCCCCC C   ",
  "   C        C   ",
  "   C CCCCCC C   ",
  "   C        C   ",
  "   C CCCC   C   ",
  "   C        C   ",
  "   CCCCCCCCCC   ",
  "                ",
  "                ",
  "                ",
  "                ",
]);

/**
 * A cylinder. The caps are inset two columns so the silhouette pinches at top
 * and bottom — without that it is a rectangle with bands across it, which is
 * what DOCUMENT already is, and the two sat side by side unreadable.
 */
const DATABASE = sprite("lesson-database", [
  "                ",
  "                ",
  "    CCCCCCCC    ",
  "  CCCCCCCCCCCC  ",
  "  CC        CC  ",
  "  CCCCCCCCCCCC  ",
  "  CC        CC  ",
  "  CC        CC  ",
  "  CCCCCCCCCCCC  ",
  "  CC        CC  ",
  "  CC        CC  ",
  "  CCCCCCCCCCCC  ",
  "    CCCCCCCC    ",
  "                ",
  "                ",
  "                ",
]);

const CHART = sprite("lesson-chart", [
  "                ",
  "                ",
  "            CC  ",
  "            CC  ",
  "        CC  CC  ",
  "        CC  CC  ",
  "    CC  CC  CC  ",
  "    CC  CC  CC  ",
  "CC  CC  CC  CC  ",
  "CC  CC  CC  CC  ",
  "CC  CC  CC  CC  ",
  "CCCCCCCCCCCCCCCC",
  "                ",
  "                ",
  "                ",
  "                ",
]);

const ROBOT = sprite("lesson-robot", [
  "                ",
  "      CCCC      ",
  "       CC       ",
  "   CCCCCCCCCC   ",
  "  CCCCCCCCCCCC  ",
  "  CC CC  CC CC  ",
  "  CCCCCCCCCCCC  ",
  "  CC  CCCC  CC  ",
  "  CCCCCCCCCCCC  ",
  "   CCCCCCCCCC   ",
  "    CC    CC    ",
  "   CCC    CCC   ",
  "                ",
  "                ",
  "                ",
  "                ",
]);

const BLOCKS = sprite("lesson-blocks", [
  "                ",
  "                ",
  "   CCCCCCCCCC   ",
  "   C        C   ",
  "   C        C   ",
  "   CCCCCCCCCC   ",
  "                ",
  "   CCCC  CCCC   ",
  "   C  C  C  C   ",
  "   C  C  C  C   ",
  "   CCCC  CCCC   ",
  "                ",
  "                ",
  "                ",
  "                ",
  "                ",
]);

/**
 * Two arrows, out and back. The first attempt was a circular arrow, which at
 * 16×16 has an open left side and a downward tip and read unmistakably as a
 * hot-air balloon. A curve needs more pixels than this grid has.
 */
const FLOW = sprite("lesson-flow", [
  "                ",
  "         CC     ",
  "         CCCC   ",
  "  CCCCCCCCCCCCCC",
  "  CCCCCCCCCCCCCC",
  "         CCCC   ",
  "         CC     ",
  "                ",
  "                ",
  "     CC         ",
  "   CCCC         ",
  "CCCCCCCCCCCCCC  ",
  "CCCCCCCCCCCCCC  ",
  "   CCCC         ",
  "     CC         ",
  "                ",
]);

const WINDOW = sprite("lesson-window", [
  "                ",
  "                ",
  "  CCCCCCCCCCCC  ",
  "  CCCCCCCCCCCC  ",
  "  CC        CC  ",
  "  CC  CCCC  CC  ",
  "  CC  CCCC  CC  ",
  "  CC        CC  ",
  "  CC  CCCC  CC  ",
  "  CC  CCCC  CC  ",
  "  CC        CC  ",
  "  CCCCCCCCCCCC  ",
  "                ",
  "                ",
  "                ",
  "                ",
]);

/**
 * A branching tree — one parent, two children. Non-relational data is nested
 * rather than tabular, and a hierarchy says that where the first attempt (four
 * nodes joined to a centre) just read as a bowtie.
 */
const NODES = sprite("lesson-nodes", [
  "                ",
  "                ",
  "      CCCC      ",
  "      CCCC      ",
  "       CC       ",
  "       CC       ",
  "   CCCCCCCCCC   ",
  "   CC      CC   ",
  "   CC      CC   ",
  "  CCCC    CCCC  ",
  "  CCCC    CCCC  ",
  "                ",
  "                ",
  "                ",
  "                ",
  "                ",
]);

const GEAR = sprite("lesson-gear", [
  "                ",
  "     CC  CC     ",
  "     CC  CC     ",
  "   CCCCCCCCCC   ",
  "   CCCCCCCCCC   ",
  " CCCCC    CCCCC ",
  " CCCC      CCCC ",
  " CCCC      CCCC ",
  " CCCCC    CCCCC ",
  "   CCCCCCCCCC   ",
  "   CCCCCCCCCC   ",
  "     CC  CC     ",
  "     CC  CC     ",
  "                ",
  "                ",
  "                ",
]);

const SPARK = sprite("lesson-spark", [
  "                ",
  "       CC       ",
  "       CC       ",
  "   C   CC   C   ",
  "    C  CC  C    ",
  "     CCCCCC     ",
  "  CCCCCCCCCCCC  ",
  "  CCCCCCCCCCCC  ",
  "     CCCCCC     ",
  "    C  CC  C    ",
  "   C   CC   C   ",
  "       CC       ",
  "       CC       ",
  "                ",
  "                ",
  "                ",
]);

const BULB = sprite("lesson-bulb", [
  "                ",
  "      CCCC      ",
  "    CCCCCCCC    ",
  "   CCCCCCCCCC   ",
  "   CCC    CCC   ",
  "   CC      CC   ",
  "   CCC    CCC   ",
  "   CCCCCCCCCC   ",
  "    CCCCCCCC    ",
  "     CCCCCC     ",
  "     CCCCCC     ",
  "      CCCC      ",
  "      CCCC      ",
  "       CC       ",
  "                ",
  "                ",
]);

/**
 * Domain → mark, for all 25 exam domains that have flashcards.
 *
 * Keys are `domain` as it appears in `content/<exam>/flashcards.json`. Domain
 * ids are unique across exams today, so this is a flat table rather than one
 * nested under the exam code; the fallback below means a new exam that reuses
 * an id still renders something rather than nothing.
 */
const BY_DOMAIN: Record<string, SpriteMatrix> = {
  // AZ-900 — Azure
  "cloud-concepts": CLOUD,
  "architecture-services": BLOCKS,
  "management-governance": DOCUMENT,
  // AI-901 — Azure AI
  "ai-concepts": BULB,
  "foundry-implementation": ROBOT,
  // DP-900 — Azure Data
  "core-data-concepts": BULB,
  "relational-data": DATABASE,
  "nonrelational-data": NODES,
  "analytics-workload": CHART,
  // DP-600 — Fabric
  "plan-implement-manage": GEAR,
  "prepare-serve-data": FLOW,
  "semantic-models": BLOCKS,
  "explore-analyze": CHART,
  // SC-900 — Security
  "sci-concepts": BULB,
  entra: KEY,
  "security-solutions": SHIELD,
  "compliance-solutions": DOCUMENT,
  // DP-700 — Fabric data engineering
  "analytics-solution": GEAR,
  "ingest-transform": FLOW,
  "monitor-optimize": CHART,
  // SC-200 — Security operations
  "soc-environment": GEAR,
  "incident-response": SHIELD,
  "threat-hunting": NODES,
  // AB-900 — Copilot & agents
  "core-features": WINDOW,
  "data-protection-governance": SHIELD,
  "copilot-agent-admin": ROBOT,
  // AZ-104 — Azure Administrator
  "identities-governance": KEY,
  "manage-storage": DATABASE,
  "compute-resources": BLOCKS,
  "virtual-networking": NODES,
  "monitor-maintain": CHART,
  // PL-300 — Power BI
  "prepare-data": FLOW,
  "model-data": NODES,
  "visualize-analyze": CHART,
  "manage-secure-powerbi": SHIELD,
  // PL-900 — Power Platform
  "business-value": SPARK,
  environment: GEAR,
  "power-apps": WINDOW,
  "power-automate": FLOW,
  "copilot-studio-agents": ROBOT,
};

/**
 * The mark for a card's domain.
 *
 * Falls back to the lightbulb rather than to null: a card with no mark next to
 * cards that have one looks broken, whereas a generic "concept" mark just
 * looks generic. Content is added to this app far more often than this table
 * is edited, so the fallback is the common path for anything new.
 */
export function lessonMarkFor(domain: string): SpriteMatrix {
  return BY_DOMAIN[domain] ?? BULB;
}
