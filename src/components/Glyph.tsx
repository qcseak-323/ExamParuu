import PixelSprite from "@/components/PixelSprite";
import {
  SHARD_SPRITE,
  SHARD_PALETTE,
  SEAL_SPRITE,
  SEAL_PALETTE,
} from "@/lib/badgeSprites";

/**
 * The shard and the seal, set inline with running text.
 *
 * Both were text glyphs — ◆ and ★ — which is why they never looked like part
 * of the game. A glyph takes its shape from whatever font resolves, ignores
 * the pixel grid, and changes size with the reading preference while the
 * sprites beside it do not.
 *
 * ── Why 12px and nothing else ──
 *
 * Both matrices are 12×12, so 12px renders them 1:1. `PixelSprite` draws SVG
 * rects with `shapeRendering: crispEdges`, which survives a fractional scale
 * better than a raster would but still lands edges unevenly — a 12-cell grid
 * across 14px puts two cells on a half-pixel. The size is fixed here rather
 * than exposed, because every call site wants "the shard, inline", and the one
 * thing none of them wants is to pick a number that makes it blur.
 *
 * ── Alignment ──
 *
 * `vertical-align: -0.1em` rather than `middle`. Both shapes are drawn to
 * fill their box, so aligning their centre to the x-height midpoint floats
 * them high against a lowercase word; nudging down from the baseline sits them
 * where the glyphs they replace used to sit.
 */

const INLINE = 12;

const style: React.CSSProperties = {
  display: "inline-block",
  verticalAlign: "-0.1em",
};

/** Was ◆. The currency a module pays out. */
export function ShardGlyph({ title }: { title?: string }) {
  return (
    <span style={style}>
      <PixelSprite
        sprite={SHARD_SPRITE}
        palette={SHARD_PALETTE}
        size={INLINE}
        title={title}
      />
    </span>
  );
}

/** Was ★. A sealed path, and the route the trainer has pinned. */
export function SealGlyph({ title }: { title?: string }) {
  return (
    <span style={style}>
      <PixelSprite
        sprite={SEAL_SPRITE}
        palette={SEAL_PALETTE}
        size={INLINE}
        title={title}
      />
    </span>
  );
}
