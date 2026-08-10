import { sprite, type SpriteMatrix, type SpritePalette } from "./sprite";
import { GUARDIANS } from "./guardians";

/**
 * Route badges, the shard and the path seal — as matrices, not art.
 *
 * These replace the last literal emoji in the app (🏅 and ⚪ in
 * `ExamProgressClient`) and the text glyphs ◆ and ★ that stood in for a shard
 * and a seal across four more components.
 *
 * ── Why hand-authored rather than generated ──
 *
 * Three PixelLab attempts failed here, and the third explained the other two:
 * the Objects tool applies item 1's description to the whole sheet, so it is a
 * *variation* generator, not a multi-subject one. Sixteen takes on one gold
 * medal is the wrong shape for seven badges that must be told apart at a
 * glance.
 *
 * But the deciding reason is design law 10, not the tool. **A raster cannot
 * re-ink itself.** A generated badge bakes its outline in, so on Storm Watch —
 * where that near-black *is* the panel colour — it dissolves into the surface
 * and needs a rim hack to survive. `K` here resolves to `var(--sprite-outline)`
 * and follows the theme for free, which is the whole argument for matrices and
 * the reason `PixelSprite` was never retired.
 *
 * ── How a badge is built ──
 *
 * One shared 16×16 roundel, with an 8×8 emblem stamped into the middle. The
 * emblem is the only thing that differs between routes, and it is drawn from
 * the guardian that holds the route — a feather for a gull-winged courier, a
 * lantern for a buoy-backed crab. Shared frame, distinct centre: the badges
 * read as a set at a glance and as seven different things on inspection.
 *
 * Colour comes from the guardian's own five-stop palette, so a badge always
 * matches the creature whose route it certifies.
 */

/** The roundel every badge shares. `c` is the field the emblem sits on. */
const DISC: readonly string[] = [
  "     KKKKKK     ",
  "   KKaaaaaaKK   ",
  "  KabbbbbbbbaK  ",
  " KabbccccccbbaK ",
  " KabccccccccbaK ",
  "KabbccccccccbbaK",
  "KabccccccccccbaK",
  "KabccccccccccbaK",
  "KabccccccccccbaK",
  "KabbccccccccbbaK",
  " KabccccccccbaK ",
  " KabbccccccbbaK ",
  "  KabbbbbbbbaK  ",
  "   KKaaaaaaKK   ",
  "    KffK KffK   ",
  "     KK   KK    ",
];

const EMBLEM_X = 4;
const EMBLEM_Y = 4;

/**
 * Stamp an 8×8 emblem into the roundel's field.
 *
 * A space in the emblem means "leave the field showing", which is what lets
 * every emblem be drawn as a standalone shape rather than as a patch that has
 * to know what surrounds it.
 */
function badge(name: string, emblem: readonly string[]): SpriteMatrix {
  const rows = DISC.map((row, y) => {
    const line = emblem[y - EMBLEM_Y];
    if (!line) return row;
    const chars = row.split("");
    for (let x = 0; x < line.length; x++) {
      if (line[x] !== " ") chars[EMBLEM_X + x] = line[x];
    }
    return chars.join("");
  });
  return sprite(name, rows);
}

/* ------------------------------------------------------------------ *
 * The emblems — one per guardian, 8×8
 * ------------------------------------------------------------------ */

/** Straitwing, a gull-winged courier. */
const FEATHER = [
  "    aa  ",
  "   aaa  ",
  "  aaaa  ",
  " aaaa   ",
  " aaa    ",
  "aa a    ",
  "a  a    ",
  "   a    ",
];

/** Voltfin, storm-charged, surfacing before the thunder. */
const BOLT = [
  "    aa  ",
  "   aa   ",
  "  aa    ",
  " aaaaa  ",
  "   aa   ",
  "  aa    ",
  " aa     ",
  "        ",
];

/** Deltoad, filtering every channel of the Delta. */
const DROPLET = [
  "   aa   ",
  "   aa   ",
  "  aaaa  ",
  " aaaaaa ",
  " aaaaaa ",
  " aaaaaa ",
  "  aaaa  ",
  "        ",
];

/**
 * Loomwing, weaving the Delta's fabric thread by thread.
 *
 * Crossed threads rather than a bobbin. The bobbin was drawn first and read as
 * a ladder: at eight pixels, three horizontal bars are rungs whatever they were
 * meant to be.
 */
const SPOOL = [
  "        ",
  " aa  aa ",
  "  aaaa  ",
  "   aa   ",
  "   aa   ",
  "  aaaa  ",
  " aa  aa ",
  "        ",
];

/** Bastilisk, a cliff sentinel that has never once blinked. */
const SHIELD = [
  " aaaaaa ",
  " aaaaaa ",
  " aaaaaa ",
  " aaaaaa ",
  "  aaaa  ",
  "  aaaa  ",
  "   aa   ",
  "        ",
];

/** Beaconid, whose lantern signals every agent home. */
const LANTERN = [
  "   aa   ",
  "  aaaa  ",
  " aaaaaa ",
  " a    a ",
  " a    a ",
  " aaaaaa ",
  "  aaaa  ",
  "        ",
];

/** Mangroot, building with whatever the tide brings in. */
const LEAF = [
  "     aa ",
  "   aaaa ",
  "  aaaaa ",
  " aaaaaa ",
  " aaaaa  ",
  " aaaa   ",
  " aa     ",
  "a       ",
];

const EMBLEMS: Record<string, readonly string[]> = {
  "az-900": FEATHER,
  "ai-901": BOLT,
  "dp-900": DROPLET,
  "dp-600": SPOOL,
  "sc-900": SHIELD,
  "ab-900": LANTERN,
  "pl-900": LEAF,
};

export const BADGE_SPRITES: Record<string, SpriteMatrix> = Object.fromEntries(
  Object.entries(EMBLEMS).map(([code, emblem]) => [code, badge(code, emblem)]),
);

/** The roundel with nothing stamped on it — a route not yet cleared. */
export const BADGE_LOCKED: SpriteMatrix = sprite("badge-locked", DISC);

/* ------------------------------------------------------------------ *
 * Palettes
 * ------------------------------------------------------------------ */

/**
 * A badge wears its guardian's colours, so it matches the creature whose route
 * it certifies. The guardian palettes are already ordered dark to light, which
 * is exactly what the roundel wants — `a` for the rim, `c` for the field.
 * `f` is the ribbon and is not part of a guardian palette, so it borrows the
 * rim colour.
 */
export function badgePalette(examCode: string): SpritePalette {
  const g = GUARDIANS[examCode];
  if (!g) return BADGE_LOCKED_PALETTE;
  return { ...g.palette, f: g.palette.a };
}

/** Drained, for a route the trainer has not cleared. */
export const BADGE_LOCKED_PALETTE: SpritePalette = {
  a: "#4A5560",
  b: "#6C7883",
  c: "#8E99A3",
  d: "#A8B2BA",
  e: "#8E99A3",
  f: "#4A5560",
};

/* ------------------------------------------------------------------ *
 * The two glyphs that were text
 * ------------------------------------------------------------------ */

/** Was ◆ — the shard the trainer earns for clearing a module. */
export const SHARD_SPRITE: SpriteMatrix = sprite("shard", [
  "     KK     ",
  "    KccK    ",
  "   KccccK   ",
  "  KcccbbcK  ",
  " KccbbbbbcK ",
  "KccbbbbbbbcK",
  "KcbbbbbbbbcK",
  " KcbbbbbbcK ",
  "  KcbbbbcK  ",
  "   KcbbcK   ",
  "    KccK    ",
  "     KK     ",
]);

/** Was ★ — a sealed learning path, and the pinned-route marker on the map. */
export const SEAL_SPRITE: SpriteMatrix = sprite("seal", [
  "     KK     ",
  "    KeeK    ",
  "    KeeK    ",
  "KKKKeeeeKKKK",
  "KeeeeeeeeeeK",
  " KeeeeeeeeK ",
  "  KeeeeeeK  ",
  "  KeeeeeeK  ",
  " Keee  eeeK ",
  " KeK    KeK ",
  "  K      K  ",
  "            ",
]);

/** Storm glass — the shard reads as a cut gem rather than a flat lozenge. */
export const SHARD_PALETTE: SpritePalette = {
  a: "#1F5F6B",
  b: "#2E8C9E",
  c: "#7FC3D8",
  d: "#B7E0EA",
  e: "#7FC3D8",
};

/** Brass — the seal is hardware, and brass is what hardware is made of here. */
export const SEAL_PALETTE: SpritePalette = {
  a: "#8A5F22",
  b: "#C08A3E",
  c: "#E5B96A",
  d: "#F5D79B",
  e: "#E5B96A",
};
