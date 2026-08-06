"use client";

import { usePreferences, setPreference } from "@/lib/preferences";
import { useSfx } from "@/components/AudioProvider";

/**
 * Music on/off, always one click away in the nav. Deliberately not buried in
 * preferences — background music that starts on its own needs an obvious way
 * to stop it.
 */
export default function SoundToggle() {
  const prefs = usePreferences();
  const playSfx = useSfx();

  const on = prefs.bgmEnabled;

  return (
    <button
      type="button"
      onClick={() => {
        // The click that turns music on is itself the gesture that unlocks
        // audio, so the confirmation blip lands only when switching on.
        setPreference("bgmEnabled", !on);
        if (!on) playSfx("confirm");
      }}
      aria-pressed={on}
      title={on ? "Turn music off" : "Turn music on"}
      className="tap-target rounded-md px-2 py-1.5 text-body text-[var(--foreground-muted)] hover:bg-black/5 dark:hover:bg-white/10"
    >
      <span aria-hidden="true">{on ? "♪" : "🔇"}</span>
      <span className="sr-only">
        {on ? "Music on — turn off" : "Music off — turn on"}
      </span>
    </button>
  );
}
