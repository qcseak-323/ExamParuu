import { PAL_SPECIES, PAL_TYPES } from "@/lib/pals";
import PalSprite from "@/components/PalSprite";
import HeroScene from "@/components/HeroScene";
import StartPrompt from "@/components/StartPrompt";

/**
 * The only page a signed-out visitor can reach.
 *
 * Built around a single action. Everything it could link to is gated, so
 * extra entry points would just bounce to /login — the job here is to say
 * what this is in one line and get the visitor to choose a companion.
 */
export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      {/* Hero: copy first, the estuary scene beside it from lg up. */}
      <section className="grid items-center gap-6 lg:grid-cols-[minmax(0,30rem)_1fr] lg:gap-12">
        <div>
          <p className="text-label font-semibold uppercase tracking-[0.12em] text-[var(--foreground-soft)]">
            Free Microsoft cert prep
          </p>
          <h1 className="font-pixel mt-2 text-hero lg:text-[3.5rem] lg:leading-none">
            Revision is a battle.
            <br />
            Bring a companion.
          </h1>
          <p className="prose-measure mt-3 text-body-lg text-[var(--foreground-muted)]">
            ExamParuu turns certification prep into a creature-collecting RPG.
            Battle real practice questions, earn XP, and raise a companion from
            the Monsoon Belt while you learn.
          </p>
          <div className="mt-5">
            <StartPrompt />
          </div>
          <p className="mt-3 text-caption text-[var(--foreground-soft)]">
            Free. Email sign-in. DP-600 · AB-900.
          </p>
        </div>

        <div className="pixel-panel p-2">
          <HeroScene />
        </div>
      </section>

      {/* The hook: three companions, one line each. */}
      <section>
        <h2 className="mb-4 text-center font-pixel text-display">
          Choose your companion
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {PAL_TYPES.map((type) => {
            const species = PAL_SPECIES[type];
            const [starter] = species.stages;
            return (
              <div
                key={type}
                className="pixel-panel flex items-center gap-4 p-4 text-left sm:flex-col sm:gap-2 sm:text-center"
              >
                <div className="pal-idle shrink-0">
                  <PalSprite
                    sheet={starter.image}
                    size={64}
                    title={`${starter.name}, the ${species.label}-line starter`}
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-1 sm:items-center">
                  <p className="text-body font-bold tracking-wide uppercase">
                    {starter.name}
                  </p>
                  <p className="text-caption text-[var(--foreground-muted)]">
                    {species.tagline}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

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

      <p className="prose-measure mx-auto text-center text-caption text-[var(--foreground-muted)]">
        Free, no paywall. Independent and not affiliated with Microsoft — all
        practice content is original, written from publicly published skills
        outlines.
      </p>
    </div>
  );
}
