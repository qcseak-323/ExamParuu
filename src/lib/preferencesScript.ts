const PREFS_KEY = "examready-preferences";

// Inlined into <head> so the correct theme/accessibility attributes apply
// before first paint, avoiding a flash of default styling. Kept in a
// separate module (no React import) so a Server Component like the root
// layout can import it without pulling in client-only hook code.
export const PREFERENCES_INIT_SCRIPT = `
(function () {
  try {
    var raw = window.localStorage.getItem(${JSON.stringify(PREFS_KEY)});
    var prefs = raw ? JSON.parse(raw) : {};
    var theme = prefs.theme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "bright");
    var root = document.documentElement;
    root.setAttribute("data-theme", theme);
    if (prefs.readableFont) root.setAttribute("data-readable-font", "true");
    if (prefs.reducedMotion) root.setAttribute("data-reduced-motion", "true");
    if (prefs.highContrast) root.setAttribute("data-contrast", "high");
    root.setAttribute("data-text-scale", prefs.textScale || "md");
  } catch (e) {}
})();
`;
