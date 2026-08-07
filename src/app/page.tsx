import { catalog } from "@/lib/content";
import HomeHero from "@/components/HomeHero";

/**
 * The home page: one dominating estuary canvas (HomeHero) and a short
 * "how it works" underneath. Everything else the app can do is gated behind
 * an account, so extra entry points would just bounce to /login — the job
 * here is to be welcoming, say what this is in one line, and put a single
 * start button in front of the visitor.
 */
export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <HomeHero />

      {/* How it works, in three lines rather than three paragraphs. */}
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          {
            title: "Battle exam-style questions",
            body: "Every correct answer lands a hit and earns XP for your companion.",
            glyph: "rotate-45 bg-[var(--verdant-2)]",
          },
          {
            title: "Wrong answers become lessons",
            body: "Miss one and the explanation opens — the next question doesn't exist until you've read it.",
            glyph: "rounded-[3px] bg-[var(--ember-2)]",
          },
          {
            title: "Cards come back before you forget",
            body: "Spaced-repetition flashcards resurface each fact right on schedule.",
            glyph: "rounded-full bg-[var(--tide-2)]",
          },
        ].map(({ title, body, glyph }) => (
          <div key={title} className="pixel-panel flex gap-3 p-4">
            <div
              aria-hidden="true"
              className={`mt-1 h-[18px] w-[18px] shrink-0 border-2 border-[var(--outline)] ${glyph}`}
            />
            <div>
              <h3 className="text-body font-semibold">{title}</h3>
              <p className="prose-measure mt-1 text-caption text-[var(--foreground-muted)]">
                {body}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* Derived from the catalog so new content lists itself. */}
      <p className="prose-measure mx-auto text-center text-caption text-[var(--foreground-muted)]">
        Free, no paywall. Email sign-in.{" "}
        {catalog
          .filter((e) => e.hasContent)
          .map((e) => e.code.toUpperCase())
          .join(" · ")}
        . Independent and not affiliated with Microsoft — all practice content
        is original, written from publicly published skills outlines.
      </p>
    </div>
  );
}
