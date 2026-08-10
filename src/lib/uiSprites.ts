import { sprite, type SpriteMatrix } from "@/lib/sprite";

/**
 * Interface marks — the chrome half of the sprite set.
 *
 * `badgeSprites.ts` holds the things a trainer *earns*; this file holds the
 * things the interface *says*. Go forward, go back, yes, no, skip. They were
 * the text characters ▶ ◀ ✓ ✗ ▶▶, which is the one thing this app's design
 * system forbids: a glyph resolves through whatever font the browser picks,
 * so it ignores the pixel grid every sprite beside it is drawn to, and it
 * grows with the reading-size preference while those sprites do not. At
 * `data-text-scale="lg"` a ▶ on a button was visibly larger than the seal on
 * the chip next to it.
 *
 * ── Every cell is `C` ──
 *
 * `PixelSprite` resolves `C` to `currentColor`, so each mark takes the colour
 * of whatever it is set in and needs no palette at all. That matters more here
 * than it does for the shard and the seal: these sit on brass buttons, on
 * `--panel` buttons, inside `--success-fill` discs and in muted caption text,
 * and a fixed fill would have to be wrong in at least one of those. It is also
 * why there is no `K` outline — an outline is a second colour, and a second
 * colour cannot follow the surface.
 *
 * ── All 12×12 ──
 *
 * Same reason `Glyph.tsx` renders at 12px and nothing else: a 12-cell grid
 * across 12px is 1:1, and any other size puts cell edges on half-pixels where
 * even `shapeRendering: crispEdges` cannot save them. The marks are drawn
 * within that box rather than filling it, so `TICK` and `CROSS` share a centre
 * row and read as a pair when they sit side by side — which, on the flashcard
 * judgement buttons, they do.
 */

/** Was ▶ — go on, the affirmative direction. */
export const FORWARD_SPRITE: SpriteMatrix = sprite("ui-forward", [
  "            ",
  " CC         ",
  " CCCC       ",
  " CCCCCC     ",
  " CCCCCCCC   ",
  " CCCCCCCCCC ",
  " CCCCCCCCCC ",
  " CCCCCCCC   ",
  " CCCCCC     ",
  " CCCC       ",
  " CC         ",
  "            ",
]);

/** Was ◀ — back the way you came. */
export const BACK_SPRITE: SpriteMatrix = sprite("ui-back", [
  "            ",
  "         CC ",
  "       CCCC ",
  "     CCCCCC ",
  "   CCCCCCCC ",
  " CCCCCCCCCC ",
  " CCCCCCCCCC ",
  "   CCCCCCCC ",
  "     CCCCCC ",
  "       CCCC ",
  "         CC ",
  "            ",
]);

/**
 * Was ✓ — done, read, correct, chosen.
 *
 * Three cells thick rather than two. It is the one mark that has to survive
 * inside `.gym-clear`, a 20px disc with a 2px border, where a hairline check
 * on `--success-fill` turned to mush.
 */
export const TICK_SPRITE: SpriteMatrix = sprite("ui-tick", [
  "            ",
  "            ",
  "            ",
  "         CCC",
  "        CCC ",
  "       CCC  ",
  " CC   CCC   ",
  " CCC CCC    ",
  "  CCCCC     ",
  "   CCC      ",
  "            ",
  "            ",
]);

/** Was ✗ — no match, wrong pick. Centred on the same row as TICK. */
export const CROSS_SPRITE: SpriteMatrix = sprite("ui-cross", [
  "            ",
  "            ",
  " CC      CC ",
  " CCC    CCC ",
  "  CCC  CCC  ",
  "   CCCCCC   ",
  "    CCCC    ",
  "   CCCCCC   ",
  "  CCC  CCC  ",
  " CCC    CCC ",
  " CC      CC ",
  "            ",
]);

/**
 * Was ▶▶ — skip past the battle entrance.
 *
 * One sprite rather than two `FORWARD`s side by side: the pair needs a gap
 * tighter than the 1px an inline-block seam would give, and two SVGs where one
 * will do is two accessibility nodes to hide instead of one.
 */
export const SKIP_SPRITE: SpriteMatrix = sprite("ui-skip", [
  "            ",
  "            ",
  " C    C     ",
  " CC   CC    ",
  " CCC  CCC   ",
  " CCCC CCCC  ",
  " CCCC CCCC  ",
  " CCC  CCC   ",
  " CC   CC    ",
  " C    C     ",
  "            ",
  "            ",
]);
