import { catalog } from "@/lib/content";
import HomeHero from "@/components/HomeHero";

/**
 * The catalog's depth, as three tiers. The hero used to list the seven
 * playable exam codes as flat chips, which read as "seven exams" — the
 * portfolio is thirty, and the tiers are how Microsoft itself groups them.
 * Playable exams sort first so each box leads with one you can start today.
 */
const TIERS: { label: string; levels: string[] }[] = [
  { label: "Fundamentals", levels: ["Fundamentals"] },
  { label: "Intermediate", levels: ["Associate"] },
  { label: "Advanced", levels: ["Expert", "Specialty"] },
];

function tierSummaries() {
  return TIERS.map(({ label, levels }) => {
    const exams = catalog
      .filter((exam) => levels.includes(exam.msLevel))
      .sort((a, b) => Number(b.hasContent) - Number(a.hasContent));
    return {
      label,
      codes: exams.slice(0, 3).map((exam) => exam.code.toUpperCase()),
      total: exams.length,
    };
  });
}

/**
 * The home page, Landing v2: a playable hero (copy + one real demo battle),
 * the scene strips, the equation strip, then the loop in four numbered
 * cards. Everything else the app can do is gated behind an account, so
 * extra entry points would just bounce to /login — the job here is to let
 * the visitor feel the loop once and put a single start button in front of
 * them.
 */
export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <HomeHero tiers={tierSummaries()} />

      {/* The loop, in four numbered beats. */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            step: "01",
            title: "Battle real questions",
            body: "Correct answers land hits and earn XP.",
            glyph: "rotate-45 bg-[var(--verdant-2)]",
          },
          {
            step: "02",
            title: "Wrong answers open lessons",
            body: "Read the lesson to unlock the next question.",
            glyph: "rounded-[3px] bg-[var(--ember-2)]",
          },
          {
            step: "03",
            title: "Cards return on schedule",
            body: "Spaced repetition, timed before you forget.",
            glyph: "rounded-full bg-[var(--tide-2)]",
          },
          {
            step: "04",
            title: "Walk in ready",
            body: "Max your companion's level, then book the real thing.",
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

      {/* The exams themselves are listed as chips in the hero; the full
          non-affiliation disclaimer lives in the global footer. */}
      <p className="prose-measure mx-auto text-center text-caption text-[var(--foreground-muted)]">
        Free, no paywall. Email sign-in. Independent — not affiliated with
        Microsoft.
      </p>
    </div>
  );
}
