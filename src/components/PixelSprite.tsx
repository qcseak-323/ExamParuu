import type { PalPalette, SpriteMatrix } from "@/lib/pals";
import { SPRITE_SIZE } from "@/lib/pals";

/**
 * Renders a character-matrix sprite as SVG.
 *
 * Horizontal runs of the same colour collapse into a single <rect>, which
 * takes a typical sprite from ~200 nodes to ~40. `shapeRendering="crispEdges"`
 * is what stops the browser antialiasing the pixel seams into a blur.
 */

type Props = {
  sprite: SpriteMatrix;
  palette: PalPalette;
  /** Rendered size in px. The sprite scales without blurring. */
  size?: number;
  /** Mirrors the sprite, so a pal can face its opponent across a battle. */
  flip?: boolean;
  className?: string;
  /** Accessible label; omit for sprites that are purely decorative. */
  title?: string;
};

function colorFor(char: string, palette: PalPalette): string | null {
  switch (char) {
    case " ":
      return null;
    // The outline is the one colour that has to follow the theme — a
    // near-black outline disappears against the dark theme's background.
    case "K":
      return "var(--sprite-outline)";
    case "W":
      return "#ffffff";
    case "B":
      return "#151019";
    case "a":
      return palette.a;
    case "b":
      return palette.b;
    case "c":
      return palette.c;
    case "d":
      return palette.d;
    case "e":
      return palette.e;
    default:
      return null;
  }
}

type Run = { x: number; y: number; width: number; fill: string };

function runsFor(sprite: SpriteMatrix, palette: PalPalette): Run[] {
  const runs: Run[] = [];

  sprite.forEach((row, y) => {
    let start = 0;
    let current: string | null = null;

    const flush = (endExclusive: number) => {
      if (current !== null) {
        runs.push({
          x: start,
          y,
          width: endExclusive - start,
          fill: current,
        });
      }
    };

    for (let x = 0; x < row.length; x += 1) {
      const fill = colorFor(row[x], palette);
      if (fill !== current) {
        flush(x);
        current = fill;
        start = x;
      }
    }
    flush(row.length);
  });

  return runs;
}

export default function PixelSprite({
  sprite,
  palette,
  size = 96,
  flip = false,
  className,
  title,
}: Props) {
  const runs = runsFor(sprite, palette);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${SPRITE_SIZE} ${SPRITE_SIZE}`}
      shapeRendering="crispEdges"
      className={className}
      style={flip ? { transform: "scaleX(-1)" } : undefined}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      {runs.map((run) => (
        <rect
          key={`${run.y}-${run.x}`}
          x={run.x}
          y={run.y}
          width={run.width}
          height={1}
          fill={run.fill}
        />
      ))}
    </svg>
  );
}
