"use client";

import { GYM_SPRITE, GYM_PALETTE, GYM_LOCKED_PALETTE } from "@/lib/heroSprites";
import PixelSprite from "@/components/PixelSprite";
import { useSfx } from "@/components/AudioProvider";

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
 * The Monsoon Belt drawn as six regions — one per Microsoft exam series —
 * joined by a shipping route. Markers are buttons that select a region;
 * the exams inside it are listed by the catalog below the map.
 *
 * Marker labels are the short series codes: the full world names live in
 * the chip list and region panel, where they have room to breathe.
 */
export default function GymMap({
  stops,
  selectedId,
  onSelect,
}: {
  stops: RegionStop[];
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
                <PixelSprite
                  sprite={GYM_SPRITE}
                  palette={stop.playable ? GYM_PALETTE : GYM_LOCKED_PALETTE}
                  size={56}
                />
              </span>
              <span className="gym-marker-label">
                <span className="font-pixel text-label">
                  {stop.id.toUpperCase()}
                </span>
                <span className="block text-caption text-[var(--foreground-muted)]">
                  {stop.playable
                    ? `${stop.cleared}/${stop.playableCount} gym${stop.playableCount === 1 ? "" : "s"}`
                    : "Uncharted"}
                </span>
              </span>
              {stop.prioritised && (
                <span className="gym-flag" title="Your pinned route is here">
                  ★
                </span>
              )}
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
