import { sprite, type SpritePalette } from "./sprite";

/**
 * The trainer, as a two-frame run cycle at 24x24.
 *
 * Deliberately an original design rather than a likeness of any existing
 * game's protagonist: hooded jacket, shoulder satchel, teal-and-amber
 * palette. What it borrows is era convention — the larger canvas, the
 * shading pass, and the stocky proportions that separate a 16-bit handheld
 * sprite from an 8-bit one — none of which belongs to anyone.
 *
 * Two frames is what the hardware actually used for a run, and it reads
 * better than a smoother cycle; the eye fills in the rest. The vertical bob
 * lives in CSS rather than the matrices so it can be switched off for
 * reduced-motion without needing a third frame.
 */

// Shared from the waist up; the frames differ in stride.
const UPPER: readonly string[] = [
  "                        ",
  "         KKKKKK         ",
  "        KeeeeeeK        ",
  "       KeeeeeeeeK       ",
  "       KeeKKKKeeK       ",
  "      KKccccccccKK      ",
  "      KcccBWcccccK      ",
  "      KccccccccccK      ",
  "       KcccccccK        ",
  "        KKcccKK         ",
  "      KKbbbbbbbbKK      ",
  "     KbbbbbbbbbbbbK     ",
  "    KcbbbbbbbbbbbbfK    ",
  "    KcbbbbbbbbbbbbfK    ",
  "     KbbbbbbbbbbbbK     ",
  "     KbbbbbbbbbbbK      ",
  "      KaaaaaaaaK        ",
];

const RUNNER_A = sprite("trainer-a", [
  ...UPPER,
  "      KddddKdddK        ",
  "     KdddK  KdddK       ",
  "    KdddK    KdddK      ",
  "   KdddK      KdddK     ",
  "   KggK        KggK     ",
  "   KKK          KKK     ",
  "                        ",
]);

const RUNNER_B = sprite("trainer-b", [
  ...UPPER,
  "      KdddddddK         ",
  "      KddddddK          ",
  "     KdddK KddK         ",
  "    KdddK   KddK        ",
  "    KggK     KggK       ",
  "    KKK       KKK       ",
  "                        ",
]);

export const RUNNER_FRAMES = [RUNNER_A, RUNNER_B] as const;

export const RUNNER_PALETTE: SpritePalette = {
  a: "#0f5f63", // jacket shadow
  b: "#188b91", // jacket
  c: "#f2c9a0", // skin
  d: "#2b3a67", // trousers
  e: "#3a2a1f", // hair under the hood
  f: "#e8913c", // satchel strap
  g: "#f4f4f0", // shoes
};

/**
 * A gym on the region map. Original building design — pitched roof, banner
 * over the door, lantern windows.
 */
export const GYM_SPRITE = sprite("gym", [
  "                ",
  "       ff       ",
  "      ffff      ",
  "     ffffff     ",
  "    KffffffK    ",
  "   KffffffffK   ",
  "  KffffffffffK  ",
  " KKKKKKKKKKKKKK ",
  " KbbbbbbbbbbbbK ",
  " KbggbbbbbbggbK ",
  " KbggbbbbbbggbK ",
  " KbbbbKddKbbbbK ",
  " KbbbbKddKbbbbK ",
  " KbbbbKddKbbbbK ",
  " KKKKKKKKKKKKKK ",
  "                ",
]);

export const GYM_PALETTE: SpritePalette = {
  a: "#6b4a2a",
  b: "#d8d2c4", // walls
  c: "#ffffff",
  d: "#7a4a24", // door
  e: "#c0392f",
  f: "#c0392f", // roof
  g: "#8fd3f4", // windows
};

/** The same building, greyed, for a route with no content yet. */
export const GYM_LOCKED_PALETTE: SpritePalette = {
  a: "#4a4a4a",
  b: "#9a9a9a",
  c: "#b8b8b8",
  d: "#5a5a5a",
  e: "#6a6a6a",
  f: "#6a6a6a",
  g: "#7f8b93",
};
