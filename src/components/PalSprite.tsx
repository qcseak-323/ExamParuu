/**
 * Renders one of the generated raster sprites (the Monsoon Belt cast).
 *
 * The art exists at three source resolutions — 32, 48 and 128 px — and every
 * render size here is an integer multiple of the file it picks, because
 * `image-rendering: pixelated` does nearest-neighbour scaling and a
 * fractional scale (128 → 96, say) drops pixel rows unevenly and shimmers.
 *
 * The PNGs bake in the shared dark outline (#12202B). On the dark theme that
 * colour *is* the surface, so the sprite would melt into any panel it sits
 * on; `.pal-raster` in globals.css adds a faint light rim there via
 * drop-shadow. That is the resolution of the V0.04 handoff's open question:
 * one PNG set, theme handled in CSS, `PixelSprite` kept for the few
 * characters that are still drawn from matrices (the Glitchling, the gym).
 */

type Props = {
  /** Path under /pals without size prefix, e.g. "fire-1". */
  sheet: string;
  /** Rendered CSS size in px. Snapped to an integer multiple of a source. */
  size?: number;
  /** Mirrors the sprite, so a pal can face its opponent across a battle. */
  flip?: boolean;
  className?: string;
  /** Accessible label; omit for sprites that are purely decorative. */
  title?: string;
};

/** Pick the source file whose pixel grid divides the render size cleanly. */
function sourceFor(size: number): 32 | 48 | 128 {
  if (size % 48 === 0) return 48;
  if (size % 32 === 0) return 32;
  return 128;
}

export default function PalSprite({
  sheet,
  size = 96,
  flip = false,
  className,
  title,
}: Props) {
  const source = sourceFor(size);

  return (
    /* Pixel art must not be resampled by the image optimizer; it ships
       as-authored, so a plain img is deliberate. */
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/pals/${source}/${sheet}.png`}
      width={size}
      height={size}
      alt={title ?? ""}
      aria-hidden={title ? undefined : true}
      draggable={false}
      className={`pal-raster pixelated select-none ${flip ? "-scale-x-100" : ""} ${className ?? ""}`}
    />
  );
}
