"use client";

import { useEffect } from "react";
import { usePreferences } from "@/lib/preferences";

/**
 * Mirrors preferences onto <html> attributes for CSS to key off.
 *
 * Values are set explicitly to the string "true" rather than via
 * `toggleAttribute`. `toggleAttribute(name, true)` produces `name=""`, which
 * does not match the `[data-reduced-motion="true"]` selectors in globals.css —
 * the pre-paint script set the right value and this effect then quietly
 * replaced it with an empty one, so both toggles stopped working the moment
 * React hydrated.
 */
export default function PreferencesEffect() {
  const prefs = usePreferences();

  useEffect(() => {
    const root = document.documentElement;

    const setFlag = (name: string, on: boolean) => {
      if (on) {
        root.setAttribute(name, "true");
      } else {
        root.removeAttribute(name);
      }
    };

    root.setAttribute("data-theme", prefs.theme);
    root.setAttribute("data-text-scale", prefs.textScale);
    setFlag("data-readable-font", prefs.readableFont);
    setFlag("data-reduced-motion", prefs.reducedMotion);

    if (prefs.highContrast) {
      root.setAttribute("data-contrast", "high");
    } else {
      root.removeAttribute("data-contrast");
    }
  }, [prefs]);

  return null;
}
