/**
 * Guardian Paruu — one per dungeon.
 *
 * Every playable exam's dungeon is guarded by a unique Paruu. Clear the
 * dungeon (the timed mock, `isGymCleared`) and the guardian joins you:
 * ownership is DERIVED from attempts, never stored, exactly like badges and
 * seals — so this system needed no schema change and cannot violate the XP
 * invariant in gamification.ts.
 *
 * Art status: every guardian has PixelLab raster art (`image`, sheets at
 * /pals/{32,48,128}) generated 2026-08-07 via 02 - Tooling/guardians.mjs —
 * fresh seeds, same recipe as the professor. The matrix silhouettes remain
 * as the uncaught "???" display (GUARDIAN_SILHOUETTE) and as the fallback
 * FighterSprite renders if a sheet is ever missing.
 *
 * Everything here is original — creatures, names, sprites — nothing derived
 * from any existing game's assets, same rule as pals.ts.
 */

import { sprite, type SpriteMatrix, type SpritePalette } from "./sprite";
import { isGymCleared } from "./gamification";
import { catalog } from "./content";
import { PAL_SPECIES, stageForLevel, type PalType } from "./pals";
import type { QuizAttempt } from "./types";

// --- Placeholder silhouettes ------------------------------------------------

/** Wings spread — the fliers. */
const GUARD_WINGED = sprite("guard-winged", [
  "                ",
  "  e          e  ",
  " KeK        KeK ",
  " KbeK      KebK ",
  "  KbbK    KbbK  ",
  "   KbbKKKKbbK   ",
  "   KbbbbbbbbK   ",
  "  KbBbbbbbbBbK  ",
  "  KbbbbbbbbbbK  ",
  "  KbbddddddbbK  ",
  "   KbddddddbK   ",
  "    KbddddbK    ",
  "     KbbbbK     ",
  "    KbK  KbK    ",
  "     K    K     ",
  "                ",
]);

/** Side fins and a crest — the swimmers. */
const GUARD_FINNED = sprite("guard-finned", [
  "                ",
  "       e        ",
  "      ece       ",
  "     KeceK      ",
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

/** Broad and planted — the sentinels. */
const GUARD_ROOTED = sprite("guard-rooted", [
  "     e   e      ",
  "      eee       ",
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
  "                ",
]);

// --- The guardians ----------------------------------------------------------

export type Guardian = {
  /** The dungeon this Paruu guards. */
  examCode: string;
  name: string;
  /** In-world region name, matching regions.ts. */
  regionName: string;
  tagline: string;
  /** The attack named in battle dialogue. */
  move: string;
  palette: SpritePalette;
  /** Placeholder matrix, rendered until `image` exists. */
  sprite: SpriteMatrix;
  /** Raster sheet under /pals once PixelLab art is generated, else null. */
  image: string | null;
};

export const GUARDIANS: Record<string, Guardian> = {
  "az-900": {
    examCode: "az-900",
    name: "Straitwing",
    regionName: "The Azure Archipelago",
    tagline: "A gull-winged courier that knows every strait in the Archipelago.",
    move: "SKY ROUTE",
    palette: {
      a: "#173B52",
      b: "#4FA3B8",
      c: "#9FD8DE",
      d: "#DCE8E1",
      e: "#F5C86B",
    },
    sprite: GUARD_WINGED,
    image: "guardian-az-900",
  },
  "ai-901": {
    examCode: "ai-901",
    name: "Voltfin",
    regionName: "The Lightning Shoals",
    tagline: "A storm-charged fin that surfaces just before the thunder.",
    move: "ION SURGE",
    palette: {
      a: "#1B2E3B",
      b: "#2E6B8C",
      c: "#9FD8DE",
      d: "#F5C86B",
      e: "#FFE66D",
    },
    sprite: GUARD_FINNED,
    image: "guardian-ai-901",
  },
  "dp-900": {
    examCode: "dp-900",
    name: "Deltoad",
    regionName: "The Datastream Delta",
    tagline: "A patient silt toad that filters every channel of the Delta.",
    move: "SILT SURGE",
    palette: {
      a: "#1F4A34",
      b: "#3E8455",
      c: "#6DB56A",
      d: "#A8D5C2",
      e: "#4FA3B8",
    },
    sprite: GUARD_FINNED,
    image: "guardian-dp-900",
  },
  "dp-600": {
    examCode: "dp-600",
    name: "Loomwing",
    regionName: "The Datastream Delta",
    tagline: "A moth that weaves the Delta's fabric, thread by thread.",
    move: "WARP WEFT",
    palette: {
      a: "#7A2E1E",
      b: "#C4553B",
      c: "#E8863F",
      d: "#F5C86B",
      e: "#9FD8DE",
    },
    sprite: GUARD_WINGED,
    image: "guardian-dp-600",
  },
  "sc-900": {
    examCode: "sc-900",
    name: "Bastilisk",
    regionName: "The Bastion Cliffs",
    tagline: "A cliff sentinel that has never once blinked on watch.",
    move: "AEGIS GAZE",
    palette: {
      a: "#26374A",
      b: "#4A6274",
      c: "#7E97A8",
      d: "#B7C6D1",
      e: "#F5C86B",
    },
    sprite: GUARD_ROOTED,
    image: "guardian-sc-900",
  },
  "ab-900": {
    examCode: "ab-900",
    name: "Beaconid",
    regionName: "Agent Atoll",
    tagline: "A buoy-backed crab whose lantern signals every agent home.",
    move: "SIGNAL FLARE",
    palette: {
      a: "#7A2E1E",
      b: "#E8863F",
      c: "#F5C86B",
      d: "#FFE0A8",
      e: "#FFE66D",
    },
    sprite: GUARD_FINNED,
    image: "guardian-ab-900",
  },
  "pl-900": {
    examCode: "pl-900",
    name: "Mangroot",
    regionName: "The Maker Mangroves",
    tagline: "A rooted maker that builds with whatever the tide brings in.",
    move: "CANOPY CALL",
    palette: {
      a: "#1F4A34",
      b: "#3E8455",
      c: "#6DB56A",
      d: "#A8D5C2",
      e: "#E8863F",
    },
    sprite: GUARD_ROOTED,
    image: "guardian-pl-900",
  },
};

export function getGuardian(examCode: string): Guardian | undefined {
  return GUARDIANS[examCode];
}

/** Every guardian with a playable dungeon, in catalog order. */
export function allGuardians(): Guardian[] {
  return catalog
    .filter((e) => e.hasContent && GUARDIANS[e.code])
    .map((e) => GUARDIANS[e.code]);
}

/** The guardians whose dungeons this trainer has cleared. Derived, never stored. */
export function ownedGuardians(attempts: QuizAttempt[]): Guardian[] {
  return allGuardians().filter((g) => isGymCleared(g.examCode, attempts));
}

export function isGuardianOwned(
  examCode: string,
  attempts: QuizAttempt[],
): boolean {
  return Boolean(GUARDIANS[examCode]) && isGymCleared(examCode, attempts);
}

/** Muted single tone for a guardian not yet caught — a "???" silhouette. */
export const GUARDIAN_SILHOUETTE: SpritePalette = {
  a: "#54646E",
  b: "#54646E",
  c: "#54646E",
  d: "#54646E",
  e: "#54646E",
};

// --- Fighters ---------------------------------------------------------------

/**
 * Anything a trainer can send into battle: the starter line (raster sheet)
 * or a guardian (placeholder matrix until its raster art lands). Battle
 * components render this through FighterSprite instead of choosing between
 * PalSprite and PixelSprite themselves.
 */
export type Fighter = {
  /** "starter", or the guardian's exam code. */
  id: string;
  name: string;
  /** Accessible label for the sprite. */
  title: string;
  /** The attack named in battle dialogue. */
  move: string;
  /** One-line pitch for the picker. */
  hint: string;
  sheet: string | null;
  sprite: SpriteMatrix | null;
  palette: SpritePalette | null;
};

export function starterFighter(
  palType: PalType,
  level: number,
  nickname: string | null,
): Fighter {
  const species = PAL_SPECIES[palType];
  const stage = stageForLevel(palType, level);
  const name = nickname ?? stage.name;
  return {
    id: "starter",
    name,
    title: `${name}, your ${species.label}-line Paruu`,
    move: species.move,
    hint: `Your ${species.label}-line partner`,
    sheet: stage.image,
    sprite: null,
    palette: null,
  };
}

export function guardianFighter(guardian: Guardian): Fighter {
  return {
    id: guardian.examCode,
    name: guardian.name,
    title: `${guardian.name}, guardian of the ${guardian.examCode.toUpperCase()} dungeon`,
    move: guardian.move,
    hint: `Guardian of the ${guardian.examCode.toUpperCase()} dungeon`,
    sheet: guardian.image,
    sprite: guardian.sprite,
    palette: guardian.palette,
  };
}

/** The full team this trainer can choose from at the start of any battle. */
export function fighterRoster(
  palType: PalType,
  level: number,
  nickname: string | null,
  attempts: QuizAttempt[],
): Fighter[] {
  return [
    starterFighter(palType, level, nickname),
    ...ownedGuardians(attempts).map(guardianFighter),
  ];
}
