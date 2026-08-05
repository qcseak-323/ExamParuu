/**
 * Shared pixel-sprite primitives.
 *
 * Sprites are authored as character matrices rather than image files: no
 * asset pipeline, they re-colour per theme, and they scale to any size
 * without blurring. This module holds the plumbing; the creatures live in
 * `pals.ts` and the trainer and map pieces in `heroSprites.ts`.
 */

export type SpriteMatrix = readonly string[];

export type SpriteSize = { width: number; height: number };

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
  /** Extra accent — straps, trim, roof tiles. */
  f?: string;
  /** Extra light — shoes, windows, highlights. */
  g?: string;
};

/**
 * Fails loudly on a ragged matrix. These are hand-authored, and a row one
 * character short renders as a subtly sheared sprite that is genuinely hard
 * to spot by eye — much easier to catch here.
 *
 * Dimensions come from the data rather than a fixed constant, so a 24x24
 * trainer and a 16x16 creature can coexist.
 */
export function sprite(name: string, rows: readonly string[]): SpriteMatrix {
  if (process.env.NODE_ENV !== "production") {
    if (rows.length === 0) {
      throw new Error(`Sprite "${name}" has no rows`);
    }
    const width = rows[0].length;
    rows.forEach((row, i) => {
      if (row.length !== width) {
        throw new Error(
          `Sprite "${name}" row ${i} is ${row.length} chars, expected ${width} (row 0's width)`,
        );
      }
    });
  }
  return rows;
}

export function spriteSize(matrix: SpriteMatrix): SpriteSize {
  return { width: matrix[0]?.length ?? 0, height: matrix.length };
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
