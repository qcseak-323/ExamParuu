"use client";

import { usePreferences, setPreference } from "@/lib/preferences";
import type { Theme, TextScale } from "@/lib/preferences";

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="pixel-panel flex items-start justify-between gap-4 p-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs text-[var(--foreground-muted)]">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0"
      />
    </label>
  );
}

export default function PreferencesPage() {
  const prefs = usePreferences();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-pixel text-xl">Preferences</h1>
        <p className="mt-3 max-w-xl text-sm text-[var(--foreground-muted)]">
          These settings apply everywhere, including inside the practice
          quiz, and are saved on this device.
        </p>
      </div>

      <section>
        <h2 className="mb-3 font-pixel text-xs">Theme</h2>
        <div className="flex gap-3">
          {(["bright", "dark"] as Theme[]).map((theme) => (
            <button
              key={theme}
              onClick={() => setPreference("theme", theme)}
              className={`pixel-button rounded-md px-4 py-2 text-sm capitalize ${
                prefs.theme === theme
                  ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                  : "bg-[var(--panel)]"
              }`}
            >
              {theme}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-pixel text-xs">Text size</h2>
        <div className="flex gap-3">
          {(["sm", "md", "lg"] as TextScale[]).map((scale) => (
            <button
              key={scale}
              onClick={() => setPreference("textScale", scale)}
              className={`pixel-button rounded-md px-4 py-2 text-sm uppercase ${
                prefs.textScale === scale
                  ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                  : "bg-[var(--panel)]"
              }`}
            >
              {scale}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-pixel text-xs">Accessibility</h2>
        <ToggleRow
          label="Readable font everywhere"
          description="Replaces the pixel display font in headings and navigation with the regular sans-serif font."
          checked={prefs.readableFont}
          onChange={(v) => setPreference("readableFont", v)}
        />
        <ToggleRow
          label="Reduce motion"
          description="Disables sprite bobbing, transitions, and other decorative motion, regardless of your OS setting."
          checked={prefs.reducedMotion}
          onChange={(v) => setPreference("reducedMotion", v)}
        />
        <ToggleRow
          label="High contrast text"
          description="Removes muted/secondary text tones so all text renders at full contrast."
          checked={prefs.highContrast}
          onChange={(v) => setPreference("highContrast", v)}
        />
      </section>
    </div>
  );
}
