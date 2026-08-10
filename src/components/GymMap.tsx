"use client";

import { useSfx } from "@/components/AudioProvider";
import PalSprite from "@/components/PalSprite";
import { trainerMapSheet } from "@/lib/profile";
import { SealGlyph, TickGlyph } from "@/components/Glyph";

/**
 * Which guardian's dungeon stands on each region marker.
 *
 * A region is a series, not an exam — the Delta holds every DP route — so the
 * marker shows the region's fundamentals dungeon as its representative. The
 * towers are generated art recoloured per guardian by
 * `scripts/build-dungeons.mjs`, which writes one per exam code; this picks the
 * one that stands for the whole region.
 *
 * These replaced `GYM_SPRITE`, a 16×16 matrix with hardcoded hex that ignored
 * the theme entirely. The trade is deliberate and is the reason for the rim
 * below: a matrix re-inks itself and a raster cannot.
 */
const REGION_DUNGEON: Record<string, string> = {
  az: "az-900",
  ai: "ai-901",
  dp: "dp-900",
  sc: "sc-900",
  ab: "ab-900",
  pl: "pl-900",
};

/**
 * 48, not the 56 the matrix used.
 *
 * The towers are cut at 96 and 48, and `image-rendering: pixelated` is
 * nearest-neighbour: 56 divides neither, so every marker would resample on a
 * fractional scale and shimmer. 48 is native and exact.
 */
const DUNGEON_PX = 48;

export type RegionStop = {
  id: string;
  /** In-world place name, e.g. "The Datastream Delta". */
  worldName: string;
  /** Real series name, e.g. "Data & Analytics (DP)". */
  name: string;
  /** At least one exam here has practice content. */
  playable: boolean;
  playableCount: number;
  cleared: number;
  /** Every playable gym in the region has been cleared. */
  badgeEarned: boolean;
  /** The trainer's pinned exam lives in this region. */
  prioritised: boolean;
  /** Percentage coordinates on the chart. */
  x: number;
  y: number;
};

/**
 * The Monsoon Belt as real terrain, with the chart's furniture drawn over it.
 *
 * The land used to be SVG: three ellipses per region, a dashed shore ripple,
 * and a dozen hand-placed wave marks on the brine. All of it re-inked with the
 * theme for free, and all of it read as a *diagram* of an archipelago rather
 * than one — the reference that started this rebuild makes the point plainly,
 * land is the figure and water is the ground, and six vector blobs are not
 * land.
 *
 * The islands, coastlines, forests, mountains, the lighthouse and the fort are
 * now a composited raster (`scripts/build-region-map.mjs`) set as the
 * container's background.
 *
 * ── What stayed vector, and why ──
 *
 * The shipping lane and the compass rose. Both are chart *annotation* rather
 * than terrain: they are drawn ON the map, not part of it, and keeping them in
 * SVG means they keep following the theme where the terrain beneath them
 * cannot. It also means the lane still redraws itself if a region moves.
 *
 * Markers are buttons that select a region; the exams inside it are listed by
 * the catalog below the map. Marker labels are the short series codes — the
 * full world names live in the chip list and region panel.
 */
export default function GymMap({
  stops,
  trainerAvatar,
  selectedId,
  onSelect,
}: {
  stops: RegionStop[];
  /** Which trainer to stand on the pinned route; null falls back to a star. */
  trainerAvatar: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const playSfx = useSfx();

  /**
   * The lane visits the regions in a ring, not in array order.
   *
   * `stops` arrives in the catalogue's order — az, ai, dp, sc, ab, pl — and
   * threading a polyline through that sequence sends it from the top-right
   * island back across the whole chart to the bottom-left and out again,
   * crossing itself twice. A shipping lane that crosses itself is not a route,
   * it is a scribble.
   *
   * Anything not named here is appended, so a new region still appears on the
   * lane rather than silently vanishing from it.
   */
  const LANE = ["az", "ai", "dp", "pl", "ab", "sc"];
  const ordered = [
    ...LANE.map((id) => stops.find((s) => s.id === id)).filter(
      (s): s is RegionStop => Boolean(s),
    ),
    ...stops.filter((s) => !LANE.includes(s.id)),
  ];
  const points = ordered.map((s) => `${s.x},${s.y}`).join(" ");

  return (
    <div className="gym-map">
      <svg
        className="gym-map-route"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* The shipping route, island to island. */}
        <polyline
          points={points}
          fill="none"
          stroke="var(--map-route)"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={points}
          fill="none"
          stroke="var(--map-route-dash)"
          strokeWidth="1"
          strokeDasharray="3 4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Compass rose. */}
        <g
          transform="translate(92 10)"
          stroke="var(--map-shore)"
          fill="var(--map-island)"
        >
          <polygon
            points="0,-6 1.6,-1.6 6,0 1.6,1.6 0,6 -1.6,1.6 -6,0 -1.6,-1.6"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <circle
            r="1.2"
            fill="var(--map-route-dash)"
            strokeWidth="0"
          />
        </g>
      </svg>

      {stops.map((stop) => {
        const selected = stop.id === selectedId;
        // The two badges below are `aria-hidden`, and have to be: an
        // `aria-label` on the button replaces everything inside it, so a
        // <title> on either sprite would never be read. What they show goes
        // into the name here instead.
        const label = `${stop.worldName} — ${stop.name}${
          stop.badgeEarned ? " (cleared)" : ""
        }${stop.prioritised ? " (your pinned route is here)" : ""}`;

        return (
          <div
            key={stop.id}
            className="gym-marker"
            style={{ left: `${stop.x}%`, top: `${stop.y}%` }}
          >
            <button
              type="button"
              aria-label={label}
              aria-pressed={selected}
              onClick={() => {
                playSfx("confirm");
                onSelect(stop.id);
              }}
              onMouseEnter={() => playSfx("cursor")}
              className={`gym-marker-hit ${selected ? "gym-marker-selected" : ""}`}
            >
              <span>
                {/* Pixel art must not be resampled by the image optimizer; it
                    ships as-authored, so a plain img is deliberate. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/scenery/v1/${DUNGEON_PX}/dungeon-${REGION_DUNGEON[stop.id] ?? "az-900"}.png`}
                  width={DUNGEON_PX}
                  height={DUNGEON_PX}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className={`gym-dungeon ${stop.playable ? "" : "gym-dungeon--locked"}`}
                />
              </span>
              <span className="gym-marker-label">
                <span className="font-pixel text-label">
                  {stop.id.toUpperCase()}
                </span>
                <span className="block text-caption text-[var(--foreground-muted)]">
                  {stop.playable
                    ? `${stop.cleared}/${stop.playableCount} dungeon${stop.playableCount === 1 ? "" : "s"}`
                    : "Uncharted"}
                </span>
              </span>
              {stop.prioritised &&
                (trainerMapSheet(trainerAvatar) ? (
                  /* The trainer stands on their own route. This is the map's
                     first player character — until now the chart showed where
                     you could go and never where you were. */
                  <span
                    className="gym-you"
                    title="You are here — your pinned route"
                  >
                    <PalSprite
                      sheet={trainerMapSheet(trainerAvatar)!}
                      size={32}
                    />
                  </span>
                ) : (
                  <span className="gym-flag" title="Your pinned route is here">
                    <SealGlyph />
                  </span>
                ))}
              {stop.badgeEarned && (
                <span className="gym-clear" aria-hidden="true">
                  <TickGlyph />
                </span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
