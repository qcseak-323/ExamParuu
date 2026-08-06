"use client";

/**
 * A combatant's status box. Shared by wild battles and the gym, where it also
 * does duty as the clock — see the `tone` prop.
 */

export function hpColor(ratio: number): string {
  if (ratio > 0.5) return "#3fa34d";
  if (ratio > 0.2) return "#e0a021";
  return "#c8402f";
}

export default function HpBar({
  label,
  current,
  max,
  level,
  /** "time" renders in a fixed blue so the clock never reads as damage. */
  tone = "hp",
  valueText,
}: {
  label: string;
  current: number;
  max: number;
  level?: number;
  tone?: "hp" | "time";
  valueText?: string;
}) {
  const ratio = max === 0 ? 0 : Math.max(0, current) / max;
  const fill = tone === "time" ? "#4d9fd6" : hpColor(ratio);

  return (
    <div className="pixel-panel min-w-[160px] flex-1 p-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-pixel text-label uppercase">{label}</span>
        {level !== undefined && (
          <span className="font-pixel text-label">Lv{level}</span>
        )}
      </div>
      <div className="hp-track mt-1">
        <div
          className="hp-fill"
          style={{ width: `${ratio * 100}%`, background: fill }}
        />
      </div>
      <p className="mt-1 text-right text-caption text-[var(--foreground-muted)]">
        {valueText ?? `${Math.max(0, current)}/${max}`}
      </p>
    </div>
  );
}
