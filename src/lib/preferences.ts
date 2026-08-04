import { useSyncExternalStore } from "react";

export type Theme = "bright" | "dark";
export type TextScale = "sm" | "md" | "lg";

export type Preferences = {
  theme: Theme;
  readableFont: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  textScale: TextScale;
};

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "bright",
  readableFont: false,
  reducedMotion: false,
  highContrast: false,
  textScale: "md",
};

const PREFS_KEY = "examready-preferences";

// Mirrors the pre-hydration script in preferencesScript.ts. Both must agree,
// otherwise React overwrites the theme the script already picked and a
// dark-OS visitor gets a light flash followed by the wrong theme.
function systemTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES.theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "bright";
}

function readPrefs(): Preferences {
  const base: Preferences = { ...DEFAULT_PREFERENCES, theme: systemTheme() };
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return base;
    return { ...base, ...(JSON.parse(raw) as Partial<Preferences>) };
  } catch {
    return base;
  }
}

function writePrefs(prefs: Preferences): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

const listeners = new Set<() => void>();
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function emitChange(): void {
  for (const listener of listeners) listener();
}

let prefsCache: Preferences | null = null;
function getSnapshot(): Preferences {
  prefsCache ??= readPrefs();
  return prefsCache;
}
function getServerSnapshot(): Preferences {
  return DEFAULT_PREFERENCES;
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setPreference<K extends keyof Preferences>(
  key: K,
  value: Preferences[K],
): void {
  const updated = { ...getSnapshot(), [key]: value };
  prefsCache = updated;
  writePrefs(updated);
  emitChange();
}
