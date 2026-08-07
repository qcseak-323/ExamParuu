/**
 * Paruu — the starter companion a trainer picks when they create an account.
 *
 * Everything here is original: the creatures, their names, and their sprites.
 * Nothing is derived from any existing game's assets or characters, which
 * matters because the obvious inspiration for this feature is under very
 * active copyright.
 *
 * Sprite plumbing lives in sprite.ts — the landing-page runner needs the same
 * machinery and has nothing to do with pals.
 */

import {
  sprite,
  compose,
  type SpriteMatrix,
  type SpritePalette,
} from "./sprite";

export type PalType = "fire" | "water" | "wood";

export const PAL_TYPES: PalType[] = ["fire", "water", "wood"];

export function isPalType(value: unknown): value is PalType {
  return (
    typeof value === "string" && PAL_TYPES.includes(value as PalType)
  );
}

// --- Stage 1: three distinct starters --------------------------------------

const PYROBYTE = sprite("pyrobyte", [
  "                ",
  "       e        ",
  "      ede       ",
  "      dee       ",
  "     KKbKK      ",
  "    KbbbbbK     ",
  "   KbbbbbbbK    ",
  "  KbBbbbbbBbK   ",
  "  KbbbbbbbbbK   ",
  "  KbbdddddbbK   ",
  "  KbdddddddbK   ",
  "   KbdddddbK    ",
  "   KbbbbbbbK    ",
  "   KbbK KbbK    ",
  "    KK   KK     ",
  "                ",
]);

const HYDROBIT = sprite("hydrobit", [
  "                ",
  "       e        ",
  "      eee       ",
  "     KeeeK      ",
  "    KbbbbbK     ",
  "   KbbbbbbbK    ",
  "  KbBbbbbbBbK   ",
  "  KbbbbbbbbbK   ",
  "  KbbdddddbbK   ",
  " KKbdddddddbKK  ",
  " KcbdddddddbcK  ",
  "  KKbdddddbKK   ",
  "   KbbbbbbbK    ",
  "   KbbK KbbK    ",
  "    KK   KK     ",
  "                ",
]);

const TERRASPROUT = sprite("terrasprout", [
  "                ",
  "     e   e      ",
  "      eee       ",
  "       e        ",
  "    KKbbbKK     ",
  "   KbbbbbbbK    ",
  "  KbBbbbbbBbK   ",
  "  KbbbbbbbbbK   ",
  "  KbbdddddbbK   ",
  "  KbdddddddbK   ",
  "  KbdddddddbK   ",
  "   KbdddddbK    ",
  "   KbbbbbbbK    ",
  "   KbbK KbbK    ",
  "    KK   KK     ",
  "                ",
]);

// --- Stage 2 and 3: shared silhouettes, per-element crests ------------------

const STAGE2_BODY = sprite("stage2-body", [
  "                ",
  "                ",
  "                ",
  "     KbbbbbK    ",
  "    KbBbbbBbK   ",
  "    KbbbbbbbK   ",
  "   KKbbbbbbbKK  ",
  "  KbbdddddddbK  ",
  "  KbdddddddddK  ",
  "  KbdddddddddK  ",
  "  KbbdddddddbK  ",
  "   KbbbbbbbbK   ",
  "   KbbbKKbbbK   ",
  "  KbbK    KbbK  ",
  "  KKK      KKK  ",
  "                ",
]);

const STAGE3_BODY = sprite("stage3-body", [
  "                ",
  "                ",
  "    KbbbbbbK    ",
  "   KbBbbbbBbK   ",
  "   KbbbbbbbbK   ",
  "  KKbbbbbbbbKK  ",
  " KcbbdddddddbcK ",
  " KcbdddddddddbK ",
  " KcbdddddddddbK ",
  " KcbdddddddddbK ",
  " KKbbdddddddbKK ",
  "  KbbbbbbbbbbK  ",
  "  KbbbKKKKbbbK  ",
  " KbbK      KbbK ",
  " KKK        KKK ",
  "                ",
]);

const CRESTS: Record<PalType, { stage2: SpriteMatrix; stage3: SpriteMatrix }> = {
  fire: {
    stage2: sprite("fire-crest2", [
      "  e          e  ",
      "   ee  eee  ee  ",
      "    e ededed e  ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
    ]),
    stage3: sprite("fire-crest3", [
      " e  e  eee  e  e",
      "  ee e ededed e ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
    ]),
  },
  water: {
    stage2: sprite("water-crest2", [
      "       e        ",
      "      eee       ",
      "     eeeee      ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
    ]),
    stage3: sprite("water-crest3", [
      "      eee       ",
      "    eeeeeee     ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
    ]),
  },
  wood: {
    stage2: sprite("wood-crest2", [
      "   e       e    ",
      "    eee eee     ",
      "      eeeee     ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
    ]),
    stage3: sprite("wood-crest3", [
      "  e  eeeeee  e  ",
      "   eee eee eee  ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
    ]),
  },
};

// --- The wild opponent -----------------------------------------------------

/**
 * What you battle in a practice quiz: a "wild" bug that stands in for the
 * skills area being tested.
 */
export const GLITCHLING = sprite("glitchling", [
  "                ",
  "   K        K   ",
  "   KK      KK   ",
  "    KKbbbbKK    ",
  "   KbbbbbbbbK   ",
  "  KbbbbbbbbbbK  ",
  " KbBbbbbbbbbBbK ",
  " KbbbbbbbbbbbbK ",
  " KbbdddddddddbK ",
  " KbdddKddKdddbK ",
  " KbbdddddddddbK ",
  "  KbbbbbbbbbbK  ",
  "  KbKbKbKbKbK   ",
  "   K K K K K    ",
  "                ",
  "                ",
]);

export const GLITCHLING_PALETTE: SpritePalette = {
  a: "#3d2a52",
  b: "#7a5aa8",
  c: "#b79ce0",
  d: "#d8c8f0",
  e: "#ffe66d",
};

// --- Species definitions ---------------------------------------------------

export type PalStage = {
  /** Species name at this stage. */
  name: string;
  /** Legacy matrix, kept only until every call site renders the raster art. */
  sprite: SpriteMatrix;
  /** Sheet name under /pals for PalSprite, e.g. "fire-1". */
  image: string;
  /** Minimum trainer level required to reach this stage. */
  minLevel: number;
};

export type PalSpecies = {
  type: PalType;
  /** Display label for the element, e.g. "Fire". */
  label: string;
  /** The one-line pitch shown on the starter-select screen. */
  tagline: string;
  /** Flavour text in the professor's dialogue when highlighted. */
  description: string;
  /** The attack named in battle dialogue when an answer lands. */
  move: string;
  palette: SpritePalette;
  stages: [PalStage, PalStage, PalStage];
};

/*
 * The Monsoon Belt cast. Type keys are storage keys (`User.examPal`) and
 * NEVER change; everything display-facing — line labels, species names,
 * palettes — moved to the approved art. Palettes are the locked line
 * palettes from the design source and are art/accent colours only, never
 * UI text.
 */
export const PAL_SPECIES: Record<PalType, PalSpecies> = {
  fire: {
    type: "fire",
    label: "Ember",
    tagline: "Estuary-flame line — bold, fast starts.",
    description:
      "A hornbill-casqued spark from the estuary flats. Glidebit thrives on momentum — the longer your streak runs, the brighter it burns.",
    move: "EMBER QUERY",
    palette: {
      a: "#7A2E1E",
      b: "#C4553B",
      c: "#E8863F",
      d: "#F5C86B",
      e: "#F5C86B",
    },
    stages: [
      { name: "Glidebit", sprite: PYROBYTE, image: "fire-1", minLevel: 1 },
      {
        name: "Thermacache",
        sprite: compose(STAGE2_BODY, CRESTS.fire.stage2),
        image: "fire-2",
        minLevel: 5,
      },
      {
        name: "Pyredaemon",
        sprite: compose(STAGE3_BODY, CRESTS.fire.stage3),
        image: "fire-3",
        minLevel: 10,
      },
    ],
  },
  water: {
    type: "water",
    label: "Tide",
    tagline: "Tide line — calm under timers.",
    description:
      "An axolotl-frilled drop of the brine. Brinebit takes the long view — it would rather understand a topic than rush it.",
    move: "DATA SPLASH",
    palette: {
      a: "#173B52",
      b: "#2E6B8C",
      c: "#4FA3B8",
      d: "#9FD8DE",
      e: "#9FD8DE",
    },
    stages: [
      { name: "Brinebit", sprite: HYDROBIT, image: "water-1", minLevel: 1 },
      {
        name: "Coilcache",
        sprite: compose(STAGE2_BODY, CRESTS.water.stage2),
        image: "water-2",
        minLevel: 5,
      },
      {
        name: "Leviamux",
        sprite: compose(STAGE3_BODY, CRESTS.water.stage3),
        image: "water-3",
        minLevel: 10,
      },
    ],
  },
  wood: {
    type: "wood",
    label: "Verdant",
    tagline: "Mangrove line — patient and steady.",
    description:
      "A dappled fawn of the mangrove shade. Podbyte puts down roots — it rewards the trainer who shows up day after day.",
    move: "ROOT LOOKUP",
    palette: {
      a: "#1F4A34",
      b: "#3E8455",
      c: "#6DB56A",
      d: "#A8D5C2",
      e: "#A8D5C2",
    },
    stages: [
      { name: "Podbyte", sprite: TERRASPROUT, image: "wood-1", minLevel: 1 },
      {
        name: "Rootstack",
        sprite: compose(STAGE2_BODY, CRESTS.wood.stage2),
        image: "wood-2",
        minLevel: 5,
      },
      {
        name: "Canopyrex",
        sprite: compose(STAGE3_BODY, CRESTS.wood.stage3),
        image: "wood-3",
        minLevel: 10,
      },
    ],
  },
};

/** The evolution path's display names, by stage index. */
export const FORM_LABELS = ["Base form", "Super form", "Ultimate form"] as const;

export function formLabel(stageIndex: number): string {
  return FORM_LABELS[stageIndex] ?? FORM_LABELS[0];
}

/** Stage index of a pal's current form, for form-scaled effects. */
export function stageIndexForLevel(type: PalType, level: number): number {
  const { stages } = PAL_SPECIES[type];
  for (let i = stages.length - 1; i >= 0; i -= 1) {
    if (level >= stages[i].minLevel) return i;
  }
  return 0;
}

/**
 * Which form a pal is currently in. Evolution is driven by trainer level, so
 * it falls straight out of the XP the user has already earned — there is no
 * separate progression to store or sync.
 */
export function stageForLevel(type: PalType, level: number): PalStage {
  const { stages } = PAL_SPECIES[type];
  // Walk backwards so the highest stage whose threshold is met wins.
  for (let i = stages.length - 1; i >= 0; i -= 1) {
    if (level >= stages[i].minLevel) return stages[i];
  }
  return stages[0];
}

/** The next form and the level it unlocks at, or null when fully evolved. */
export function nextStage(
  type: PalType,
  level: number,
): { stage: PalStage; levelsAway: number } | null {
  const { stages } = PAL_SPECIES[type];
  const upcoming = stages.find((s) => level < s.minLevel);
  if (!upcoming) return null;
  return { stage: upcoming, levelsAway: upcoming.minLevel - level };
}
