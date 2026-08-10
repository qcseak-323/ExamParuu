"use client";

import { useSfx } from "@/components/AudioProvider";
import PalSprite from "@/components/PalSprite";
import { trainerMapSheet } from "@/lib/profile";

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
 * Fixed decorative wave marks, spread across the brine between islands.
 * Hand-placed rather than random so the chart doesn't shimmer on re-render.
 */
const WAVES: { x: number; y: number }[] = [
  { x: 8, y: 50 },
  { x: 34, y: 8 },
  { x: 38, y: 44 },
  { x: 62, y: 36 },
  { x: 68, y: 8 },
  { x: 90, y: 50 },
  { x: 12, y: 92 },
  { x: 40, y: 86 },
  { x: 70, y: 90 },
  { x: 94, y: 12 },
  { x: 50, y: 62 },
  { x: 5, y: 12 },
];

/**
 * The Monsoon Belt drawn as an estuary chart: one island landmass per region
 * — sand rendered under each marker, ringed by a dashed shore ripple — the
 * brine dotted with wave marks, a compass rose in the corner, and the
 * shipping route threaded island to island on top. All SVG in the theme's
 * palette, so the chart re-inks itself between Low Tide and Storm Watch.
 *
 * Markers are buttons that select a region; the exams inside it are listed
 * by the catalog below the map. Marker labels are the short series codes:
 * the full world names live in the chip list and region panel.
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
  const points = stops.map((s) => `${s.x},${s.y}`).join(" ");

  return (
    <div className="gym-map">
      <svg
        className="gym-map-route"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* Wave marks on the open brine. */}
        <g
          stroke="var(--map-wave)"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
          opacity="0.55"
          vectorEffect="non-scaling-stroke"
        >
          {WAVES.map((w, i) => (
            <path
              key={i}
              d={`M ${w.x - 2} ${w.y} q 1 -1.6 2 0 q 1 1.6 2 0`}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>

        {/* One island per region: a cluster of sand banks with a dashed
            shore ripple around the main mass. Drawn before the route so the
            shipping lane passes over the land, chart-style. */}
        {stops.map((stop) => (
          <g key={stop.id}>
            <ellipse
              cx={stop.x}
              cy={stop.y + 3}
              rx={16.5}
              ry={11.5}
              fill="none"
              stroke="var(--map-wave)"
              strokeWidth="1"
              strokeDasharray="2 3"
              opacity="0.6"
              vectorEffect="non-scaling-stroke"
            />
            <g fill="var(--map-island)" stroke="var(--map-shore)">
              <ellipse
                cx={stop.x}
                cy={stop.y + 3}
                rx={13.5}
                ry={9}
                strokeWidth="1.4"
                vectorEffect="non-scaling-stroke"
              />
              <ellipse
                cx={stop.x - 9}
                cy={stop.y + 7}
                rx={6}
                ry={4}
                strokeWidth="1.4"
                vectorEffect="non-scaling-stroke"
              />
              <ellipse
                cx={stop.x + 10}
                cy={stop.y + 6}
                rx={5}
                ry={3.5}
                strokeWidth="1.4"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          </g>
        ))}

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
        const label = `${stop.worldName} — ${stop.name}${
          stop.prioritised ? " (your pinned route is here)" : ""
        }`;

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
                    ★
                  </span>
                ))}
              {stop.badgeEarned && (
                <span className="gym-clear" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
