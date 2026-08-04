/**
 * Shared pixel-sprite primitives.
 *
 * Sprites are authored as character matrices rather than image files: no
 * asset pipeline, they re-colour per theme, and they scale to any size
 * without blurring. This module holds the plumbing; the actual creatures
 * live in `pals.ts` and the landing-page runner in `heroSprites.ts`.
 */

export const SPRITE_SIZE = 16;

export type SpriteMatrix = readonly string[];

export type SpritePalette = {
  /** Dark shade, used for shading and undersides. */
  a: string;
  /** Main colour. */
  b: string;
  /** Light highlight. */
  c: string;
  /** Belly / secondary surface. */
  d: string;
  /** Crest, flame, fin, leaf, or other accent. */
  e: string;
};

/**
 * Fails loudly on a miscounted row. These matrices are hand-authored, and a
 * row that is 15 or 17 characters long renders as a subtly sheared sprite
 * that is genuinely hard to spot by eye — much easier to catch here.
 */
export function sprite(name: string, rows: readonly string[]): SpriteMatrix {
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
 * Evolved pal forms share a body silhouette and differ by the crest they
 * wear, so the crest is authored once per element rather than once per form.
 */
export function compose(
  base: SpriteMatrix,
  overlay: SpriteMatrix,
): SpriteMatrix {
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
