"use client";

import { useEffect } from "react";
import { usePreferences } from "@/lib/preferences";

export default function PreferencesEffect() {
  const prefs = usePreferences();

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", prefs.theme);
    root.toggleAttribute("data-readable-font", prefs.readableFont);
    root.toggleAttribute("data-reduced-motion", prefs.reducedMotion);
    if (prefs.highContrast) {
      root.setAttribute("data-contrast", "high");
    } else {
      root.removeAttribute("data-contrast");
    }
    root.setAttribute("data-text-scale", prefs.textScale);
  }, [prefs]);

  return null;
}
