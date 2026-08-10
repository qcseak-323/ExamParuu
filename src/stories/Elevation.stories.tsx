import type { Meta, StoryObj } from "@storybook/nextjs-vite";

/**
 * The three elevation tiers, as a story rather than a screenshot.
 *
 * This is the seed story: it exists to prove the Storybook wiring works —
 * globals.css loaded, the theme attribute stamped on <html> rather than read
 * from `prefers-color-scheme`, the preference toolbars driving real tokens.
 * Switch Weather in the toolbar and the borders and stamps should change; if
 * they do not, `preview.tsx` is not applying the attribute.
 */

function Tiers() {
  return (
    <div style={{ display: "grid", gap: 24, maxWidth: 860 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 18,
          alignItems: "start",
        }}
      >
        <div>
          <p className="text-label font-semibold uppercase tracking-[0.1em] text-[var(--foreground-soft)]">
            Flat · default
          </p>
          <div className="pixel-panel mt-2 p-4">
            <h3 className="text-body font-semibold">Chart panel</h3>
            <p className="mt-1 text-caption text-[var(--foreground-muted)]">
              2px --line, no shadow. Containers get this, and most surfaces are
              containers.
            </p>
          </div>
        </div>

        <div>
          <p className="text-label font-semibold uppercase tracking-[0.1em] text-[var(--foreground-soft)]">
            Stamped · pressable
          </p>
          <button
            type="button"
            className="pixel-panel pixel-panel--stamped mt-2 w-full p-4 text-left"
          >
            <h3 className="text-body font-semibold">Answer option</h3>
            <p className="mt-1 text-caption text-[var(--foreground-muted)]">
              Ink border, hard stamp, and it moves under the press. Click it.
            </p>
          </button>
        </div>

        <div>
          <p className="text-label font-semibold uppercase tracking-[0.1em] text-[var(--foreground-soft)]">
            Raised · over the page
          </p>
          <div className="pixel-panel pixel-panel--raised mt-2 p-4">
            <h3 className="text-body font-semibold">Nav popover</h3>
            <p className="mt-1 text-caption text-[var(--foreground-muted)]">
              Deeper 4px stamp. Over the page rather than on it.
            </p>
          </div>
        </div>
      </div>

      <p className="prose-measure text-caption text-[var(--foreground-muted)]">
        The stamp means &ldquo;you can press this.&rdquo; Every surface used to
        carry it — panels, cards, chips and meters alike — and one treatment on
        everything flattens hierarchy: nothing recedes, so nothing is
        foreground.
      </p>
    </div>
  );
}

const meta = {
  title: "Foundations/Elevation",
  component: Tiers,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Tiers>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThreeTiers: Story = {};

/** The combination the design system calls out as nastiest. */
export const LargeTextHighContrast: Story = {
  globals: { textScale: "lg", contrast: "high" },
};
