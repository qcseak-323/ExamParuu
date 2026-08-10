import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import LessonCard from "@/components/path/LessonCard";

/**
 * The learning-path flashcard, in isolation.
 *
 * `/exams/[examCode]/path` is gated on `requireTrainer`, so neither the
 * screenshot harness nor a browser without a login can reach this card. This
 * story is the only way to look at it — and looking is the point, because the
 * concept marks were added to stop the card reading as a wall of text.
 *
 * The `domain` strings are real ids from `content/<exam>/flashcards.json`, so
 * if `lessonSprites.ts` stops covering one of them the fallback bulb shows up
 * here rather than in production.
 */

const meta = {
  title: "Screens/Lesson card",
  component: LessonCard,
  parameters: { layout: "padded" },
  args: { onActivate: () => {} },
} satisfies Meta<typeof LessonCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The card from the AI-901 responsible-AI module, revealed. */
export const Revealed: Story = {
  args: {
    front: "Reliability and safety",
    back: "The system works dependably even in unexpected conditions — rigorous testing before release, especially where errors cause real harm. Keyword: testing.",
    domain: "ai-concepts",
    revealed: true,
  },
};

/** Before the tap. The mark is the only thing carrying the card. */
export const Unrevealed: Story = {
  args: {
    front: "Reliability and safety",
    back: "Not shown yet.",
    domain: "ai-concepts",
    revealed: false,
  },
};

/** Storm Watch — the mark inks itself from the muted foreground, no rim. */
export const StormWatch: Story = {
  args: { ...Revealed.args },
  globals: { theme: "dark" },
};

/**
 * Four domains in a column, which is the real test: the marks have to be
 * distinguishable from each other, not just legible one at a time. The
 * cylinder and the clipboard were redrawn after failing exactly this.
 */
export const MarkRange: Story = {
  args: { ...Revealed.args },
  render: () => (
    <div style={{ display: "grid", gap: "1rem", maxWidth: 780 }}>
      <LessonCard
        front="Relational data"
        back="Data organised into tables of rows and columns, with keys linking one table to another. Keyword: schema."
        domain="relational-data"
        revealed
        onActivate={() => {}}
      />
      <LessonCard
        front="Compliance solutions"
        back="Tools for meeting regulatory obligations — retention, eDiscovery, and audit across the Microsoft 365 estate. Keyword: retention."
        domain="compliance-solutions"
        revealed
        onActivate={() => {}}
      />
      <LessonCard
        front="Power Automate"
        back="Builds flows that move work between services without code, triggered by an event or a schedule. Keyword: trigger."
        domain="power-automate"
        revealed
        onActivate={() => {}}
      />
      <LessonCard
        front="Non-relational data"
        back="Data stored without a fixed table schema — documents, key-value pairs, and graphs. Keyword: schema-less."
        domain="nonrelational-data"
        revealed
        onActivate={() => {}}
      />
    </div>
  ),
};
