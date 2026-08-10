import PixelSprite from "@/components/PixelSprite";
import {
  SHARD_SPRITE,
  SHARD_PALETTE,
  SEAL_SPRITE,
  SEAL_PALETTE,
} from "@/lib/badgeSprites";
import {
  FORWARD_SPRITE,
  BACK_SPRITE,
  TICK_SPRITE,
  CROSS_SPRITE,
  SKIP_SPRITE,
} from "@/lib/uiSprites";

/**
 * Every sprite that is set inline with running text — the two earned marks
 * (shard, seal) and the five interface marks (forward, back, tick, cross,
 * skip).
 *
 * The data behind them is split the way the design system splits it:
 * `badgeSprites.ts` for things a trainer earns, `uiSprites.ts` for chrome.
 * The *components* are not split, because what they have in common is the
 * thing most easily got wrong — the size and the alignment below, which have
 * to agree for a tick and a shard to sit on the same line without one of them
 * floating.
 *
 * All of them were text glyphs — ◆ ★ ▶ ◀ ✓ ✗ — which is why they never looked
 * like part of the game. A glyph takes its shape from whatever font resolves,
 * ignores the pixel grid, and changes size with the reading preference while
 * the sprites beside it do not.
 *
 * ── Why 12px and nothing else ──
 *
 * Every matrix is 12×12, so 12px renders them 1:1. `PixelSprite` draws SVG
 * rects with `shapeRendering: crispEdges`, which survives a fractional scale
 * better than a raster would but still lands edges unevenly — a 12-cell grid
 * across 14px puts two cells on a half-pixel. The size is fixed here rather
 * than exposed, because every call site wants "the shard, inline", and the one
 * thing none of them wants is to pick a number that makes it blur.
 *
 * It follows that these do **not** grow with `data-text-scale`. That is the
 * point rather than a limitation: the complaint against the glyphs they
 * replaced was that they scaled and the sprites around them did not.
 *
 * ── Alignment ──
 *
 * `vertical-align: -0.1em` rather than `middle`. Both shapes are drawn to
 * fill their box, so aligning their centre to the x-height midpoint floats
 * them high against a lowercase word; nudging down from the baseline sits them
 * where the glyphs they replace used to sit.
 *
 * `inline-flex`, not `inline-block`, and this is load-bearing rather than
 * taste. Most of these marks end up inside a `.pixel-button`, which several
 * call sites make `display: flex` with a utility — so the wrapper is a *flex
 * item*, where `inline-block` is blockified to `block` and `vertical-align` is
 * ignored outright. The item then stretches to the line's full height (24.8px
 * on the nav button) with the 12px sprite pinned to its top, and the mark
 * rides visibly high. `inline-flex` survives both contexts: `align-items:
 * center` settles the sprite when the wrapper is stretched, and
 * `vertical-align` still applies when it is not.
 */

const INLINE = 12;

const style: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  flex: "none",
  verticalAlign: "-0.1em",
};

/**
 * The interface marks carry their own gap instead of taking a space character
 * from the call site, because whether a space *survives* depends on the
 * parent: a whitespace-only text node between two elements makes no box in a
 * flex container, and several of these buttons are flex. Writing
 * `Continue{" "}` at every site gave some a gap and the rest "Continue▶".
 *
 * So: **never put a space beside one of these marks** — put it on its own line
 * and let the margin do it. `em` rather than `px` so the gap tracks the type
 * around it even though the sprite itself does not.
 */
const markStyle: React.CSSProperties = { ...style, marginInline: "0.28em" };

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

/* ------------------------------------------------------------------ *
 * Interface marks
 *
 * No palette argument: these are drawn only in `C`, so they ink themselves
 * from the text they sit in and follow it onto brass, onto a panel, or into
 * a muted caption without being told.
 *
 * `title` is the accessibility switch. Left off — the common case — the mark
 * is decorative and `PixelSprite` hides it, because almost every one of these
 * sits beside a word that already says the same thing ("Chosen ✓", "✗ No
 * match"). Pass it only where the mark is the *only* thing carrying the
 * meaning, and only where an ancestor `aria-label` will not swallow it.
 * ------------------------------------------------------------------ */

/** Was ▶. Go on — the trailing mark on an advancing action. */
export function ForwardGlyph({ title }: { title?: string } = {}) {
  return (
    <span style={markStyle}>
      <PixelSprite sprite={FORWARD_SPRITE} size={INLINE} title={title} />
    </span>
  );
}

/** Was ◀. Back the way you came — the leading mark on a return. */
export function BackGlyph({ title }: { title?: string } = {}) {
  return (
    <span style={markStyle}>
      <PixelSprite sprite={BACK_SPRITE} size={INLINE} title={title} />
    </span>
  );
}

/** Was ✓. Done, read, correct, chosen. */
export function TickGlyph({ title }: { title?: string } = {}) {
  return (
    <span style={markStyle}>
      <PixelSprite sprite={TICK_SPRITE} size={INLINE} title={title} />
    </span>
  );
}

/** Was ✗. No match, wrong pick. */
export function CrossGlyph({ title }: { title?: string } = {}) {
  return (
    <span style={markStyle}>
      <PixelSprite sprite={CROSS_SPRITE} size={INLINE} title={title} />
    </span>
  );
}

/** Was ▶▶. Skip past something that is playing. */
export function SkipGlyph({ title }: { title?: string } = {}) {
  return (
    <span style={markStyle}>
      <PixelSprite sprite={SKIP_SPRITE} size={INLINE} title={title} />
    </span>
  );
}
