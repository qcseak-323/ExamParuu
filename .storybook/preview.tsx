import type { Preview, Decorator } from "@storybook/nextjs-vite";
import React from "react";
import "../src/app/globals.css";

/**
 * Storybook wired to The Monsoon Belt.
 *
 * Two things make this useful rather than inert, and both are non-obvious:
 *
 * 1. **globals.css must be imported here.** Every component in this app is
 *    styled by tokens and component classes that live in one stylesheet, so a
 *    story without it renders unstyled HTML and looks broken in a way that has
 *    nothing to do with the component.
 *
 * 2. **The theme is an attribute on <html>, not a media query.** The app
 *    deliberately does NOT use `prefers-color-scheme` — design law 1 — so
 *    Storybook's own dark-mode switch would do nothing. The globals below
 *    stamp the real attributes on the document element, which is exactly what
 *    `preferencesScript.ts` does before first paint in the app.
 *
 * The five preference axes are exposed as toolbar globals because the nastiest
 * bug in this system is a combination — large text on a narrow phone, or a
 * high-contrast dark theme — and those are invisible unless you can switch
 * them without editing a story.
 */

/**
 * A real component, not an effect inside the decorator.
 *
 * A decorator is a plain function, so calling a hook directly inside one trips
 * `react-hooks/rules-of-hooks` — and in this project that fails the build
 * rather than warning.
 */
function PreferenceShell({
  theme,
  textScale,
  contrast,
  readableFont,
  reducedMotion,
  children,
}: {
  theme: string;
  textScale: string;
  contrast: string;
  readableFont: string;
  reducedMotion: string;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-text-scale", textScale);
    // These three are presence-based in the app: the attribute exists or it
    // does not. Setting them to "false" would switch them ON.
    const toggle = (name: string, on: boolean, value = "true") => {
      if (on) root.setAttribute(name, value);
      else root.removeAttribute(name);
    };
    toggle("data-contrast", contrast === "high", "high");
    toggle("data-readable-font", readableFont === "on");
    toggle("data-reduced-motion", reducedMotion === "on");
  }, [theme, textScale, contrast, readableFont, reducedMotion]);

  return (
    <div
      style={{
        background: "var(--background)",
        color: "var(--foreground)",
        padding: "24px",
        minHeight: "100vh",
      }}
    >
      {children}
    </div>
  );
}

const withPreferences: Decorator = (Story, context) => {
  const { theme, textScale, contrast, readableFont, reducedMotion } =
    context.globals;

  return (
    <PreferenceShell
      theme={theme}
      textScale={textScale}
      contrast={contrast}
      readableFont={readableFont}
      reducedMotion={reducedMotion}
    >
      <Story />
    </PreferenceShell>
  );
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Weather",
      toolbar: {
        title: "Weather",
        icon: "sun",
        items: [
          { value: "bright", title: "Low Tide" },
          { value: "dark", title: "Storm Watch" },
        ],
        dynamicTitle: true,
      },
    },
    textScale: {
      description: "Text size preference (15 / 16 / 19px root)",
      toolbar: {
        title: "Text",
        icon: "typography",
        items: [
          { value: "sm", title: "Small · 15px" },
          { value: "md", title: "Medium · 16px" },
          { value: "lg", title: "Large · 19px" },
        ],
        dynamicTitle: true,
      },
    },
    contrast: {
      description: "High contrast",
      toolbar: {
        title: "Contrast",
        icon: "contrast",
        items: [
          { value: "normal", title: "Normal" },
          { value: "high", title: "High" },
        ],
        dynamicTitle: true,
      },
    },
    readableFont: {
      description: "Swap the pixel display face for a readable one",
      toolbar: {
        title: "Font",
        icon: "paragraph",
        items: [
          { value: "off", title: "Pixel display" },
          { value: "on", title: "Readable" },
        ],
        dynamicTitle: true,
      },
    },
    reducedMotion: {
      description: "Reduced motion",
      toolbar: {
        title: "Motion",
        icon: "play",
        items: [
          { value: "off", title: "Motion on" },
          { value: "on", title: "Reduced" },
        ],
        dynamicTitle: true,
      },
    },
  },

  initialGlobals: {
    theme: "bright",
    textScale: "md",
    contrast: "normal",
    readableFont: "off",
    reducedMotion: "off",
  },

  decorators: [withPreferences],

  parameters: {
    // The app has its own theme attribute, so Storybook's backgrounds addon
    // would fight it — the decorator paints --background instead.
    backgrounds: { disable: true },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
  },
};

export default preview;
