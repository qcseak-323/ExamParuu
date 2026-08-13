import type { SheetId } from "./assets";

/**
 * Which wild Paruu roams which route.
 *
 * Until now every wild encounter in the game was the Glitchling — a 16×16
 * matrix — because five passes and seventy generations never produced a cast
 * anyone was willing to ship. These are the replacements, and they are the
 * answer to the pack's "one new Paruu for each dungeon".
 *
 * ── Why species names and not route names ──
 *
 * `guardian-az-900` is named for its route because a guardian *is* the route's
 * boss. A wild Paruu is an animal that happens to live there, so the sheets are
 * `wild-seal` and `wild-otter`, and this table is the only thing that knows
 * where each one roams. Moving a species to a different route is an edit here
 * rather than a file rename and a manifest change.
 *
 * ── The `flip` flag ──
 *
 * The foe stands on the right of the battle and should look left, toward the
 * player. Most of these were generated facing left or head-on and need
 * nothing; the seal was drawn facing right and is mirrored so it does not
 * fight with its back turned.
 */
export type WildParuu = {
  sheet: SheetId;
  /** Mirror the sprite so it faces the player across the arena. */
  flip?: boolean;
};

export const WILD_PARUU: Record<string, WildParuu> = {
  "az-900": { sheet: "wild-seal", flip: true },
  // AZ-104 shares the Archipelago with AZ-900 and shipped before it had a
  // creature of its own. A species roaming two routes of the same region is
  // ordinary; the Glitchling fallback would read as a missing asset.
  "az-104": { sheet: "wild-seal", flip: true },
  // AZ-140 and AZ-700 became playable on 2026-08-12 and share the Archipelago
  // too.
  "az-140": { sheet: "wild-seal", flip: true },
  "az-700": { sheet: "wild-seal", flip: true },
  "az-802": { sheet: "wild-seal", flip: true },
  "ai-901": { sheet: "wild-pufferfish" },
  // AI-103 and AI-300 became playable on 2026-08-12 and share their region
  // with AI-901.
  "ai-103": { sheet: "wild-pufferfish" },
  "ai-300": { sheet: "wild-pufferfish" },
  "dp-900": { sheet: "wild-otter" },
  // DP-700 and DP-300 share the Datastream Delta with DP-900.
  "dp-700": { sheet: "wild-otter" },
  "dp-300": { sheet: "wild-otter" },
  "dp-600": { sheet: "wild-bee" },
  "sc-900": { sheet: "wild-armadillo" },
  // SC-200 shares the Bastion Cliffs with SC-900.
  "sc-200": { sheet: "wild-armadillo" },
  // SC-300 and SC-401 became playable on 2026-08-12 and share the Bastion
  // Cliffs with SC-900 and SC-200.
  "sc-300": { sheet: "wild-armadillo" },
  "sc-401": { sheet: "wild-armadillo" },
  "sc-500": { sheet: "wild-armadillo" },
  "ab-900": { sheet: "wild-snail" },
  // AB-730 and AB-731 became playable on 2026-08-12 and share Agent Atoll with
  // AB-900. Same reuse as az-104 and the rest: without an entry here both would
  // fall back to the Glitchling, which is correct for a route with no art but
  // wrong for one whose region already has a species.
  "ab-730": { sheet: "wild-snail" },
  "ab-731": { sheet: "wild-snail" },
  "pl-900": { sheet: "wild-hedgehog" },
  // Same reuse as az-104: PL-300 and PL-400 share the Mangroves with PL-900.
  "pl-300": { sheet: "wild-hedgehog" },
  "pl-400": { sheet: "wild-hedgehog" },
};

/**
 * The Paruu roaming `examCode`, or null where none has been drawn.
 *
 * Null is a real answer, not a failure: the catalogue carries more exams than
 * there is art for, and every call site falls back to the Glitchling. That
 * keeps an unmapped route playable instead of rendering a missing sheet.
 */
export function wildParuuFor(examCode: string): WildParuu | null {
  return WILD_PARUU[examCode] ?? null;
}
