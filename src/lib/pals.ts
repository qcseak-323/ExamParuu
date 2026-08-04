/**
 * ExamPals — the starter companion a trainer picks when they create an account.
 *
 * Everything here is original: the creatures, their names, and their sprites.
 * Nothing is derived from any existing game's assets or characters, which
 * matters because the obvious inspiration for this feature is under very
 * active copyright.
 *
 * Sprites are authored as character matrices rather than image files. That
 * keeps them in the bundle with no asset pipeline, lets them re-colour per
 * theme, and makes them scale to any size without blurring.
 */

export type PalType = "fire" | "water" | "wood";

export const PAL_TYPES: PalType[] = ["fire", "water", "wood"];

export function isPalType(value: unknown): value is PalType {
  return (
    typeof value === "string" && PAL_TYPES.includes(value as PalType)
  );
}

// --- Sprite plumbing -------------------------------------------------------

export const SPRITE_SIZE = 16;

/**
 * Character → palette slot. Space is transparent. `K` is the outline, which
 * is the one colour that has to follow the theme: a near-black outline
 * vanishes against the dark theme's background, so it resolves to a CSS
 * variable instead of a literal.
 */
export type SpriteMatrix = readonly string[];

export type PalPalette = {
  /** Dark body shade, used for shading under the chin and limbs. */
  a: string;
  /** Main body colour. */
  b: string;
  /** Light body highlight. */
  c: string;
  /** Belly / underside. */
  d: string;
  /** Crest, flame, fin, or leaf. */
  e: string;
};

/**
 * Fails loudly on a miscounted row. These matrices are hand-authored, and a
 * row that is 15 or 17 characters long renders as a subtly sheared sprite
 * that is genuinely hard to spot by eye — much easier to catch here.
 */
function sprite(name: string, rows: readonly string[]): SpriteMatrix {
  if (process.env.NODE_ENV !== "production") {
    if (rows.length !== SPRITE_SIZE) {
      throw new Error(
        `Sprite "${name}" has ${rows.length} rows, expected ${SPRITE_SIZE}`,
      );
    }
    rows.forEach((row, i) => {
      if (row.length !== SPRITE_SIZE) {
        throw new Error(
          `Sprite "${name}" row ${i} is ${row.length} chars, expected ${SPRITE_SIZE}`,
        );
      }
    });
  }
  return rows;
}

/**
 * Lays `overlay` on top of `base`, ignoring the overlay's transparent cells.
 * Evolved forms share a body silhouette and differ by the crest they wear,
 * so the crest is authored once per element rather than once per form.
 */
function compose(base: SpriteMatrix, overlay: SpriteMatrix): SpriteMatrix {
  return base.map((row, y) =>
    row
      .split("")
      .map((char, x) => {
        const over = overlay[y]?.[x];
        return over && over !== " " ? over : char;
      })
      .join(""),
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

export const GLITCHLING_PALETTE: PalPalette = {
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
  sprite: SpriteMatrix;
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
  palette: PalPalette;
  stages: [PalStage, PalStage, PalStage];
};

export const PAL_SPECIES: Record<PalType, PalSpecies> = {
  fire: {
    type: "fire",
    label: "Fire",
    tagline: "Burns through questions fast.",
    description:
      "A restless ember that never sits still. Pyrobyte thrives on momentum — the longer your streak runs, the brighter it gets.",
    move: "EMBER QUERY",
    palette: {
      a: "#8c2f10",
      b: "#e0561f",
      c: "#ffa34d",
      d: "#ffd166",
      e: "#ffb020",
    },
    stages: [
      { name: "Pyrobyte", sprite: PYROBYTE, minLevel: 1 },
      {
        name: "Flarecore",
        sprite: compose(STAGE2_BODY, CRESTS.fire.stage2),
        minLevel: 5,
      },
      {
        name: "Infernode",
        sprite: compose(STAGE3_BODY, CRESTS.fire.stage3),
        minLevel: 10,
      },
    ],
  },
  water: {
    type: "water",
    label: "Water",
    tagline: "Steady, patient, hard to rattle.",
    description:
      "Calm under pressure and impossible to fluster. Hydrobit takes the long view — it would rather understand a topic than rush it.",
    move: "DATA SPLASH",
    palette: {
      a: "#123f6d",
      b: "#2f7fd1",
      c: "#7fc4f5",
      d: "#cdefff",
      e: "#5bb0ea",
    },
    stages: [
      { name: "Hydrobit", sprite: HYDROBIT, minLevel: 1 },
      {
        name: "Streamcache",
        sprite: compose(STAGE2_BODY, CRESTS.water.stage2),
        minLevel: 5,
      },
      {
        name: "Tsunamux",
        sprite: compose(STAGE3_BODY, CRESTS.water.stage3),
        minLevel: 10,
      },
    ],
  },
  wood: {
    type: "wood",
    label: "Wood",
    tagline: "Grows a little every single day.",
    description:
      "Quiet and stubbornly consistent. Terrasprout puts down roots — it rewards the trainer who shows up day after day.",
    move: "ROOT LOOKUP",
    palette: {
      a: "#1f5e2a",
      b: "#3f9c46",
      c: "#7fd07a",
      d: "#d6f0b0",
      e: "#6ec24a",
    },
    stages: [
      { name: "Terrasprout", sprite: TERRASPROUT, minLevel: 1 },
      {
        name: "Thornstack",
        sprite: compose(STAGE2_BODY, CRESTS.wood.stage2),
        minLevel: 5,
      },
      {
        name: "Canopyrex",
        sprite: compose(STAGE3_BODY, CRESTS.wood.stage3),
        minLevel: 10,
      },
    ],
  },
};

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
