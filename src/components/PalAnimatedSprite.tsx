import PalSprite from "@/components/PalSprite";
import {
  type ClipId,
  type SheetId,
  clipFrames,
  clipSrc,
  sourceFor,
} from "@/lib/assets";

/**
 * Plays one of the generated animation clips — the moving half of the cast.
 *
 * A clip ships as a horizontal strip: `frames` cells of `tier` px, written by
 * `scripts/import-pixellab.mjs`. This renders it as a background image behind
 * a one-cell window and steps the background position across, which is the
 * whole trick — no JS timer, no `requestAnimationFrame`, no state.
 *
 * ── Why there is no `"use client"` here ──
 *
 * `PalSprite`'s doc comment predicted this component would have to be a client
 * component "to read the reduced-motion preference". It does not, and that is
 * the point of the strip: **reduced motion falls out of the CSS for free.**
 * Both gates in globals.css collapse `animation-duration` to 0.001ms and
 * `animation-iteration-count` to 1, so the animation completes instantly and,
 * having no `forwards` fill, reverts to its base `background-position: 0 0` —
 * frame one, held still. A JS renderer would have had to reimplement that, and
 * would have dragged a client boundary into every server page that shows a
 * sprite.
 *
 * ── The two laws this has to obey ──
 *
 * **No `animation-delay`** (law 6). Variety between two runners comes from
 * different durations, never from staggering their start. A delayed animation
 * under a reduced-motion gate sits in its delay phase filling backwards and is
 * simply never seen.
 *
 * **`steps()`, not `ease`** (law 7). A sprite whose frames cross-fade reads as
 * a DOM element sliding; one that snaps reads as a game. `steps(frames)` lands
 * on exactly `frames` positions and never shows a half-frame.
 *
 * ── Sizing ──
 *
 * `sourceFor` picks the tier the same way it does for a still, so the render is
 * always an integer multiple of the source and nearest-neighbour scaling never
 * drops a pixel row. The strip is `frames × tier` wide on disk and is scaled to
 * `frames × size` here, which keeps that multiple exact across the whole strip
 * rather than per cell.
 *
 * A sheet with no such clip falls back to its still sprite, so a call site can
 * ask for an animation before the art exists and simply get the static one.
 */

type Props = {
  /** Sheet name, e.g. "trainer-boy". Checked against the manifest. */
  sheet: SheetId;
  /** Which clip to play. Falls back to the still sprite when absent. */
  clip: ClipId;
  /** Rendered CSS size in px. Snapped to an integer multiple of a source. */
  size?: number;
  /** Frames per second. 12 is the cast's cadence — fast enough to read as a
   *  stride, slow enough that each drawn frame is legible. */
  fps?: number;
  /** Mirrors the sprite, so a runner can face the direction it travels. */
  flip?: boolean;
  className?: string;
  /** Accessible label; omit for sprites that are purely decorative. */
  title?: string;
};

export default function PalAnimatedSprite({
  sheet,
  clip,
  size = 96,
  fps = 12,
  flip = false,
  className,
  title,
}: Props) {
  const frames = clipFrames(sheet, clip);

  // No clip for this sheet: show the still rather than a broken 404 strip.
  if (frames === null) {
    return (
      <PalSprite
        sheet={sheet}
        size={size}
        flip={flip}
        className={className}
        title={title}
      />
    );
  }

  const tier = sourceFor(sheet, size);

  return (
    <div
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={`pal-strip pal-raster select-none ${flip ? "-scale-x-100" : ""} ${className ?? ""}`}
      style={
        {
          width: size,
          height: size,
          backgroundImage: `url(${clipSrc(sheet, tier, clip)})`,
          backgroundSize: `${frames * size}px ${size}px`,
          animationDuration: `${(frames / fps).toFixed(3)}s`,
          // Set here rather than in the stylesheet: the step count is data, and
          // `steps(var(--x))` is the one place custom-property substitution is
          // not reliably supported.
          animationTimingFunction: `steps(${frames})`,
          "--pal-strip-travel": `-${frames * size}px`,
        } as React.CSSProperties
      }
    />
  );
}
