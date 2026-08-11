import type { CatalogEntry, ExamSeries, QuizAttempt } from "./types";
import { catalog } from "./content";
import { isGymCleared, isProvingPassed } from "./gamification";

/**
 * The six regional gyms of the Monsoon Belt — one per 2026 Microsoft exam
 * series. Each region is a place in the world with its own colour identity
 * (drawn from the locked art palettes, never used as UI text) and a badge
 * earned by clearing every playable gym inside it.
 *
 * The mapping mirrors Microsoft's 2026 portfolio: the AB "Copilot & Agents"
 * series absorbed the Microsoft 365 track (MS-900 retired into AB-900), so
 * the surviving MS-* exams live in Agent Atoll.
 */

export type Region = {
  id: ExamSeries;
  /** The real-world series name, e.g. "Azure (AZ)". */
  name: string;
  /** The Microsoft product the series certifies against, e.g. "Azure". Used
   *  wherever a series is named to a trainer who is choosing what to study. */
  productName: string;
  /** The in-world place name shown on the map. */
  worldName: string;
  tagline: string;
  /** What Prof. Sequel says when you land here. */
  professorLine: string;
  /** Tailwind classes for the region glyph (shape + locked-palette colour). */
  glyphClass: string;
  /** Percentage coordinates on the region map. */
  x: number;
  y: number;
};

export const REGIONS: Region[] = [
  {
    id: "az",
    name: "Azure (AZ)",
    productName: "Azure",
    worldName: "The Azure Archipelago",
    tagline: "Cloud foundations, administration, and architecture.",
    professorLine:
      "The Archipelago is where most trainers start — broad waters, well charted. AZ-104 is the busiest dungeon in the whole Belt.",
    glyphClass: "rounded-full bg-[var(--tide-3)]",
    x: 16,
    y: 30,
  },
  {
    id: "ai",
    name: "AI & Machine Learning (AI)",
    productName: "Azure AI",
    worldName: "The Lightning Shoals",
    tagline: "Generative AI, agents, and machine learning operations.",
    professorLine:
      "The Shoals changed more this year than any other region — AI-901 replaced the old fundamentals, and three new dungeons opened in a single season.",
    glyphClass: "rotate-45 bg-[var(--tide-4)]",
    x: 50,
    y: 18,
  },
  {
    id: "dp",
    name: "Data & Analytics (DP)",
    productName: "Azure Data & Fabric",
    worldName: "The Datastream Delta",
    tagline: "Fabric, SQL, Databricks, and analytics engineering.",
    professorLine:
      "Every channel of the Delta carries data somewhere. Fabric country — my own field station is on the DP-600 route.",
    glyphClass: "rounded-[3px] bg-[var(--tide-2)]",
    x: 82,
    y: 28,
  },
  {
    id: "sc",
    name: "Security (SC)",
    productName: "Microsoft Security",
    worldName: "The Bastion Cliffs",
    tagline: "Security operations, identity, and Zero Trust architecture.",
    professorLine:
      "The Cliffs guard the whole Belt. Steep routes, patient trainers — and a brand-new SC-500 dungeon for cloud and AI security.",
    glyphClass: "rounded-[3px] bg-[var(--accent)]",
    x: 20,
    y: 72,
  },
  {
    id: "ab",
    name: "Copilot & Agents (AB)",
    productName: "Microsoft 365 Copilot",
    worldName: "Agent Atoll",
    tagline: "Copilot, AI agents, and the Microsoft 365 estate.",
    professorLine:
      "The newest charted region — the old Microsoft 365 territory reformed around Copilot and agents. AB-900 is the friendliest dungeon door in the Belt.",
    glyphClass: "rounded-full bg-[var(--ember-3)]",
    x: 55,
    y: 62,
  },
  {
    id: "pl",
    name: "Power Platform (PL)",
    productName: "Power Platform",
    worldName: "The Maker Mangroves",
    tagline: "Low-code apps, automation, and Power BI analytics.",
    professorLine:
      "Everything in the Mangroves gets built from what's growing to hand. PL-300 draws more analysts than any other route here.",
    glyphClass: "rotate-45 bg-[var(--verdant-2)]",
    x: 84,
    y: 74,
  },
];

export function getRegion(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}

export function getExamsBySeries(series: ExamSeries): CatalogEntry[] {
  const tierOrder = {
    Fundamentals: 0,
    Associate: 1,
    Expert: 2,
    Specialty: 3,
    "Applied Skills": 4,
  } as const;
  return catalog
    .filter((e) => e.series === series)
    .sort((a, b) => tierOrder[a.msLevel] - tierOrder[b.msLevel]);
}

/**
 * How a series is titled wherever one is offered as a choice — "DP · Azure
 * Data & Fabric".
 *
 * Someone picking where to start is picking a technology, not memorising an
 * exam number, and the number is on the route page.
 */
export function seriesTitle(series: string): string {
  const region = getRegion(series);
  const upper = series.toUpperCase();
  return region ? `${upper} · ${region.productName}` : upper;
}

/**
 * The exam a series starts you on: its lowest published tier that has content.
 *
 * `getExamsBySeries` already sorts by Microsoft's own tier order, so the first
 * playable entry is Fundamentals wherever one exists. This is what makes a
 * series a single choice — DP holds four playable exams and picking "DP" has
 * to mean one of them, which is DP-900 rather than an Associate-level Fabric
 * paper.
 */
export function entryExamForSeries(
  series: ExamSeries,
): CatalogEntry | undefined {
  return getExamsBySeries(series).find((e) => e.hasContent);
}

/**
 * One entry exam per series that has any content, in catalogue order.
 *
 * The unit of selection anywhere a trainer chooses a starting point. Listing
 * playable *exams* instead put "DP · Azure Data & Fabric" on screen twice —
 * two different papers reading as a duplicate.
 */
export function playableSeriesEntries(): CatalogEntry[] {
  const seen = new Set<string>();
  const rows: CatalogEntry[] = [];
  for (const exam of catalog) {
    if (!exam.hasContent || seen.has(exam.series)) continue;
    seen.add(exam.series);
    const entry = entryExamForSeries(exam.series);
    if (entry) rows.push(entry);
  }
  return rows;
}

export type RegionBadge = {
  region: Region;
  /** Exams in this region that have practice content today. */
  playable: number;
  cleared: number;
  /** Every playable gym in the region has been cleared (and there is one). */
  earned: boolean;
};

/**
 * The badge case. A region badge is earned by clearing the timed mock of
 * every exam in the region that has practice content. Regions with no
 * playable exams yet cannot be earned. Derived from attempts — no storage,
 * no XP: the §10 invariant is untouched.
 */
/**
 * The trainer's standing in the Belt, worn under their name. Purely derived
 * from dungeon clears, region badges, and Proving seals — the highest rung
 * reached wins. No storage, no XP.
 */
export function deriveTrainerTitle(attempts: QuizAttempt[]): string {
  const playable = catalog.filter((e) => e.hasContent);
  const dungeonsCleared = playable.filter((e) =>
    isGymCleared(e.code, attempts),
  ).length;
  const seals = playable.filter((e) =>
    isProvingPassed(e.code, attempts),
  ).length;
  const badges = computeRegionBadges(attempts);
  const earnable = badges.filter((b) => b.playable > 0);
  const regionsWon = earnable.filter((b) => b.earned).length;

  if (
    earnable.length > 0 &&
    regionsWon === earnable.length &&
    seals >= 1
  ) {
    return "Warden of the Belt";
  }
  if (seals >= 1) return "Belt Certified";
  if (regionsWon >= 1) return "Region Champion";
  if (dungeonsCleared >= 1) return "Route Walker";
  if (attempts.length > 0) return "Trainer in Training";
  return "Fresh Arrival";
}

export function computeRegionBadges(attempts: QuizAttempt[]): RegionBadge[] {
  return REGIONS.map((region) => {
    const playableExams = catalog.filter(
      (e) => e.series === region.id && e.hasContent,
    );
    const cleared = playableExams.filter((e) =>
      isGymCleared(e.code, attempts),
    ).length;
    return {
      region,
      playable: playableExams.length,
      cleared,
      earned: playableExams.length > 0 && cleared === playableExams.length,
    };
  });
}
