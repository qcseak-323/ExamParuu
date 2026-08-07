import { catalog } from "@/lib/content";
import HomeHero from "@/components/HomeHero";

/**
 * The home page, Landing v2: a playable hero (copy + one real demo battle),
 * the scene strips, the equation strip, then the loop in four numbered
 * cards. Everything else the app can do is gated behind an account, so
 * extra entry points would just bounce to /login — the job here is to let
 * the visitor feel the loop once and put a single start button in front of
 * them.
 */
export default function Home() {
  const examCodes = catalog.filter((e) => e.hasContent).map((e) => e.code);

  return (
    <div className="flex flex-col gap-10">
      <HomeHero examCodes={examCodes} />

      {/* The loop, in four numbered beats. */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            step: "01",
            title: "Battle exam-style questions",
            body: "Every correct answer lands a hit and earns XP for your companion.",
            glyph: "rotate-45 bg-[var(--verdant-2)]",
          },
          {
            step: "02",
            title: "Wrong answers become lessons",
            body: "Miss one and the explanation opens — the next question doesn't exist until you've read it.",
            glyph: "rounded-[3px] bg-[var(--ember-2)]",
          },
          {
            step: "03",
            title: "Cards come back before you forget",
            body: "Spaced-repetition flashcards resurface each fact right on schedule.",
            glyph: "rounded-full bg-[var(--tide-2)]",
          },
          {
            step: "04",
            title: "Walk into the exam ready",
            body: "Your companion's level mirrors your readiness across the official skills outline. Max it out, then book the real thing.",
            glyph: "rotate-45 bg-[var(--accent)]",
          },
        ].map(({ step, title, body, glyph }) => (
          <div key={title} className="pixel-panel flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <div
                aria-hidden="true"
                className={`h-[18px] w-[18px] shrink-0 border-2 border-[var(--outline)] ${glyph}`}
              />
              <span className="text-caption font-semibold text-[var(--foreground-soft)]">
                {step}
              </span>
            </div>
            <div>
              <h3 className="text-body font-semibold">{title}</h3>
              <p className="prose-measure mt-1 text-caption text-[var(--foreground-muted)]">
                {body}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* Derived from the catalog so new content lists itself. The full
          non-affiliation disclaimer lives in the global footer. */}
      <p className="prose-measure mx-auto text-center text-caption text-[var(--foreground-muted)]">
        Free, no paywall. Email sign-in.{" "}
        {examCodes.map((c) => c.toUpperCase()).join(" · ")}.
      </p>
    </div>
  );
}
