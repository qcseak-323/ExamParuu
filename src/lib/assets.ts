/**
 * The asset manifest — what art exists, at which resolutions, in which clips.
 *
 * Before this file the registry was spread across four places (`PAL_SPECIES`,
 * `TRAINER_AVATARS`, `GUARDIANS`, and a hardcoded string in
 * `ProfessorPortrait`), each typing the sheet name as a bare `string`, so a
 * typo was a silent 404 with no accessible name and no type error.
 *
 * The domain registries keep their data — `PAL_SPECIES` is about species
 * stats and evolution thresholds, `GUARDIANS` about exam mapping. What moves
 * here is everything *about the files*: which tiers exist for a sheet, which
 * animation clips exist and how many frames each has. That per-sheet metadata
 * is what lets art land incrementally — a sheet that has been re-mastered
 * gains a tier, a sheet that has been animated gains a clip, and no call site
 * changes either way.
 */

/* ------------------------------------------------------------------ *
 * Versioning
 * ------------------------------------------------------------------ */

/**
 * Bumped whenever the bytes behind a sheet name change.
 *
 * `public/` is served with stable filenames and no content hash, so
 * overwriting art in place leaves returning users pulling a mixed cache — a
 * freshly built 96 beside a months-old cached 48 of the same character, which
 * reads as the sprite changing size mid-page. The version is a path segment
 * rather than a query string so that "which generation is live" is one
 * greppable constant.
 *
 * Must stay in step with VERSION in scripts/build-tiers.mjs;
 * scripts/verify-assets.mjs fails if they drift.
 */
export const ASSET_VERSION = "v2";

/* ------------------------------------------------------------------ *
 * Sheets
 * ------------------------------------------------------------------ */

/** Every raster sheet under /pals. A typo here is now a compile error. */
export type SheetId =
  // trainers
  | "trainer-boy"
  | "trainer-girl"
  // Prof. Sequel
  | "professor"
  // the three starter lines, three stages each
  | "fire-1" | "fire-2" | "fire-3"
  | "water-1" | "water-2" | "water-3"
  | "wood-1" | "wood-2" | "wood-3"
  // one guardian per playable exam
  | "guardian-az-900"
  | "guardian-ai-901"
  | "guardian-dp-900"
  | "guardian-dp-600"
  | "guardian-sc-900"
  | "guardian-ab-900"
  | "guardian-pl-900";

/** Referenced by ProfessorPortrait, which is the only site that names him. */
export const PROFESSOR_SHEET: SheetId = "professor";

/**
 * Source grids on disk, largest first.
 *
 * 128 is deliberately absent. The masters were never quantised — they carry
 * 138-304 colours against these tiers' 16 — so serving one would put a raw
 * diffusion output beside flat pixel-art siblings. Until this file existed
 * that was prevented only by luck: every render size in the app happens to
 * divide 32 or 48, so `sourceFor`'s old if-chain could never reach its own
 * 128 fallback. Masters now live in art/masters/128 and are not served.
 */
export type Tier = 96 | 64 | 48 | 32;
const ALL_TIERS: readonly Tier[] = [96, 64, 48, 32] as const;

/* ------------------------------------------------------------------ *
 * Clips
 * ------------------------------------------------------------------ */

/**
 * An animation clip is a horizontal strip: `frames` cells of `tier` px, so the
 * file is `tier * frames` wide and `tier` tall. Frame 0 is the rest pose, which
 * is what makes reduced motion correct for free — see `.pal-strip` in
 * globals.css.
 */
export type ClipId = "idle" | "run" | "battle";

export type SheetMeta = {
  /** Tiers that exist on disk for this sheet. */
  tiers: readonly Tier[];
  /** Clips that exist, with their frame count. Absent clip => static PNG. */
  clips?: Partial<Record<ClipId, number>>;
};

/**
 * Every sheet currently has all four tiers and no clips: the tiers are derived
 * from the existing 128 masters by scripts/build-tiers.mjs, and no animation
 * has been generated yet. Both facts are expected to diverge per sheet as art
 * lands, which is the entire reason this is a table and not a constant.
 */
const EVERY_TIER: SheetMeta = { tiers: ALL_TIERS };

export const SHEETS: Record<SheetId, SheetMeta> = {
  "trainer-boy": EVERY_TIER,
  "trainer-girl": EVERY_TIER,
  professor: EVERY_TIER,
  "fire-1": EVERY_TIER,
  "fire-2": EVERY_TIER,
  "fire-3": EVERY_TIER,
  "water-1": EVERY_TIER,
  "water-2": EVERY_TIER,
  "water-3": EVERY_TIER,
  "wood-1": EVERY_TIER,
  "wood-2": EVERY_TIER,
  "wood-3": EVERY_TIER,
  "guardian-az-900": EVERY_TIER,
  "guardian-ai-901": EVERY_TIER,
  "guardian-dp-900": EVERY_TIER,
  "guardian-dp-600": EVERY_TIER,
  "guardian-sc-900": EVERY_TIER,
  "guardian-ab-900": EVERY_TIER,
  "guardian-pl-900": EVERY_TIER,
};

/* ------------------------------------------------------------------ *
 * Resolution
 * ------------------------------------------------------------------ */

/**
 * Pick the source grid to render `size` from: the largest available tier that
 * divides `size` exactly.
 *
 * `image-rendering: pixelated` is nearest-neighbour, so a fractional scale
 * drops pixel rows unevenly and shimmers — every render must be an integer
 * multiple of its source. Among the integer options, larger is better: it
 * carries more real detail.
 *
 * This must stay a max-over-divisors search rather than the if-chain it
 * replaced. That version tested `size % 48` before anything else, so it
 * answered 48 for a 96px render — the file with half the data — and would go
 * on doing so however many larger tiers were added after it.
 *
 * The sizes the app actually renders, and what they resolve to:
 *
 *     192 (professor lg)    -> 96 at 2x    was 48 at 4x
 *      96 (setup, battle)   -> 96 native   was 48 at 2x
 *      64 (hero runners)    -> 64 native   was 32 at 2x
 *      48                   -> 48 native
 *      32 (nav follower)    -> 32 native
 */
export function sourceFor(sheet: SheetId, size: number): Tier {
  const available = SHEETS[sheet].tiers;
  let best: Tier | null = null;
  for (const tier of available) {
    if (size % tier === 0 && (best === null || tier > best)) best = tier;
  }
  // No exact divisor: fall back to the largest tier and accept the downscale.
  // Shrinking a big source is softer but stable; upscaling a small one is not.
  if (best === null) {
    for (const tier of available) if (best === null || tier > best) best = tier;
  }
  return best as Tier;
}

/** `/pals/v2/48/fire-1.png` */
export function sheetSrc(sheet: SheetId, tier: Tier): string {
  return `/pals/${ASSET_VERSION}/${tier}/${sheet}.png`;
}

/** `/pals/v2/48/fire-1--run.png` — a strip, `frames` cells wide. */
export function clipSrc(sheet: SheetId, tier: Tier, clip: ClipId): string {
  return `/pals/${ASSET_VERSION}/${tier}/${sheet}--${clip}.png`;
}

/** Frame count for a clip, or null when the sheet has no such clip. */
export function clipFrames(sheet: SheetId, clip: ClipId): number | null {
  return SHEETS[sheet].clips?.[clip] ?? null;
}
