import { sprite, type SpritePalette } from "./sprite";

/**
 * The trainer on the landing page, as a two-frame run cycle.
 *
 * Two frames is what the hardware this is imitating actually used for a run,
 * and it reads better than a smoother cycle would — the eye fills in the rest.
 * The frames differ in leg position and arm swing; the vertical bob that sells
 * the motion is applied in CSS rather than baked into the matrices, so it can
 * be switched off for reduced-motion without needing a third frame.
 */

const RUNNER_A = sprite("runner-a", [
  "                ",
  "     KbbbbK     ",
  "    KbbbbbbK    ",
  "     KcWWcK     ",
  "     KccccK     ",
  "      KccK      ",
  "    KKbbbbKK    ",
  "   KbbbbbbbbK   ",
  "   KbbbbbbbbK   ",
  "   KKbbbbbbKK   ",
  "     KddddK     ",
  "    KddK KddK   ",
  "   KddK   KddK  ",
  "  KddK     KddK ",
  "  KKK       KKK ",
  "                ",
]);

const RUNNER_B = sprite("runner-b", [
  "                ",
  "     KbbbbK     ",
  "    KbbbbbbK    ",
  "     KcWWcK     ",
  "     KccccK     ",
  "      KccK      ",
  "   KKKbbbbKK    ",
  "  KbbbbbbbbbK   ",
  "   KbbbbbbbbK   ",
  "   KKbbbbbbKK   ",
  "     KddddK     ",
  "     KddddK     ",
  "     KddddK     ",
  "    KddKKddK    ",
  "   KKK    KKK   ",
  "                ",
]);

export const RUNNER_FRAMES = [RUNNER_A, RUNNER_B] as const;

export const RUNNER_PALETTE: SpritePalette = {
  a: "#1f2a4a",
  b: "#d94f3d",
  c: "#f2c9a0",
  d: "#2b3a67",
  e: "#ffffff",
};
