"use client";

import Link from "next/link";
import { GYM_SPRITE, GYM_PALETTE, GYM_LOCKED_PALETTE } from "@/lib/heroSprites";
import PixelSprite from "@/components/PixelSprite";
import { useSfx } from "@/components/AudioProvider";

export type GymStop = {
  code: string;
  title: string;
  /** Retro tier label, e.g. "Starter Route". */
  tier: string;
  /** False for catalogue entries with no content written yet. */
  playable: boolean;
  /** Route ribbons earned out of total skills areas for this exam. */
  badgesEarned: number;
  badgesTotal: number;
  /** The mock exam has been passed. */
  gymCleared: boolean;
  /** The route the trainer pinned during setup. */
  prioritised: boolean;
};

/**
 * Exam selection drawn as a region map: a route winding between towns, each
 * with a gym on it.
 *
 * Positions are laid out along a fixed serpentine path rather than stored per
 * exam, so adding a certification to the catalogue drops onto the map without
 * anyone hand-placing it. The path is drawn behind the markers as an SVG
 * polyline through the same coordinates, so the road always actually connects
 * the stops it should.
 */

/** Percentage coordinates, walked in order. Wraps for longer catalogues. */
const STOPS: { x: number; y: number }[] = [
  { x: 14, y: 68 },
  { x: 36, y: 34 },
  { x: 58, y: 66 },
  { x: 80, y: 30 },
  { x: 92, y: 62 },
];

function positionFor(index: number) {
  return STOPS[index % STOPS.length];
}

export default function GymMap({ stops }: { stops: GymStop[] }) {
  const playSfx = useSfx();
  const points = stops
    .map((_, i) => {
      const p = positionFor(i);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  return (
    <div className="gym-map">
      {/* The route. preserveAspectRatio="none" lets the percentage viewBox
          stretch with the container, which keeps the line under the markers
          at any width. */}
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

      {stops.map((stop, index) => {
        const pos = positionFor(index);
        // The ✓ now means "gym cleared", which is a far more meaningful map
        // state than "collected every ribbon".
        const complete = stop.gymCleared;

        const marker = (
          <>
            <span className="gym-marker-sprite">
              <PixelSprite
                sprite={GYM_SPRITE}
                palette={stop.playable ? GYM_PALETTE : GYM_LOCKED_PALETTE}
                size={56}
              />
            </span>
            <span className="gym-marker-label">
              <span className="font-pixel text-label">
                {stop.code.toUpperCase()}
              </span>
              <span className="block text-caption text-[var(--foreground-muted)]">
                {stop.playable
                  ? `${stop.badgesEarned}/${stop.badgesTotal} ribbons`
                  : "Coming soon"}
              </span>
            </span>
            {stop.prioritised && (
              <span className="gym-flag" title="Your chosen route">
                ★
              </span>
            )}
            {complete && (
              <span className="gym-clear" aria-hidden="true">
                ✓
              </span>
            )}
          </>
        );

        const label = `${stop.code.toUpperCase()} — ${stop.title}${
          stop.prioritised ? " (your chosen route)" : ""
        }`;

        return (
          <div
            key={stop.code}
            className="gym-marker"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            {stop.playable ? (
              <Link
                href={`/exams/${stop.code}`}
                aria-label={label}
                onClick={() => playSfx("confirm")}
                onMouseEnter={() => playSfx("cursor")}
                className="gym-marker-hit"
              >
                {marker}
              </Link>
            ) : (
              <span
                className="gym-marker-hit gym-marker-locked"
                aria-label={`${label} — no content yet`}
              >
                {marker}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
