"use client";

import { usePreferences, setPreference } from "@/lib/preferences";
import { useSfx } from "@/components/AudioProvider";

/**
 * Light/dark switch, always one click away in the nav. The full preferences
 * page still owns the rest of the display options; this only flips the one
 * people reach for most.
 */
export default function ThemeToggle() {
  const prefs = usePreferences();
  const playSfx = useSfx();

  const dark = prefs.theme === "dark";

  return (
    <button
      type="button"
      onClick={() => {
        setPreference("theme", dark ? "bright" : "dark");
        playSfx("confirm");
      }}
      aria-pressed={dark}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="tap-target rounded-md px-2 py-1.5 text-body text-[var(--foreground-muted)] hover:bg-black/5 dark:hover:bg-white/10"
    >
      <span aria-hidden="true">{dark ? "☾" : "☀"}</span>
      <span className="sr-only">
        {dark ? "Dark mode on — switch to light" : "Light mode on — switch to dark"}
      </span>
    </button>
  );
}
