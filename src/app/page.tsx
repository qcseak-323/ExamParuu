import { PAL_SPECIES, PAL_TYPES } from "@/lib/pals";
import PixelSprite from "@/components/PixelSprite";
import HeroScene from "@/components/HeroScene";
import StartPrompt from "@/components/StartPrompt";

/**
 * The only page a signed-out visitor can reach.
 *
 * Built around a single action. Everything it could link to is gated, so
 * extra entry points would just bounce to /login — the job here is to say
 * what this is in one line and get the visitor to press START.
 */
export default function Home() {
  return (
    <div className="flex flex-col gap-12">
      {/* Hero: the scene fills the frame, the button sits on top of it. */}
      <section className="relative">
        <HeroScene />

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-4 text-center">
          <div className="hero-copy rounded-md px-5 py-3">
            <h1 className="font-pixel text-lg leading-relaxed sm:text-2xl">
              Pass exams while gaming
            </h1>
            <p className="mt-2 text-sm sm:text-base">
              Microsoft certification practice, played like a 90s adventure.
            </p>
          </div>

          <StartPrompt />
        </div>
      </section>

      {/* The hook: three creatures, three words each. */}
      <section>
        <h2 className="mb-4 text-center font-pixel text-sm">
          Pick a partner. Battle the exam.
        </h2>
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {PAL_TYPES.map((type) => {
            const species = PAL_SPECIES[type];
            const [starter] = species.stages;
            return (
              <div
                key={type}
                className="pixel-panel flex flex-col items-center gap-2 p-4 text-center"
              >
                <div className="pal-idle">
                  <PixelSprite
                    sprite={starter.sprite}
                    palette={species.palette}
                    size={64}
                    title={`${starter.name}, the ${species.label}-type starter`}
                  />
                </div>
                <p className="font-pixel text-[10px]">{starter.name}</p>
                <p className="text-xs text-[var(--accent)]">{species.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works, in three lines rather than three paragraphs. */}
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["1. Choose", "Pick a starter ExamPal and a certification route."],
          ["2. Battle", "Answer to attack. Miss and you take the hit."],
          ["3. Level up", "Earn XP, badges, and streaks. Your pal evolves."],
        ].map(([title, body]) => (
          <div key={title} className="pixel-panel p-4">
            <h3 className="font-pixel text-[10px] text-[var(--accent)]">
              {title}
            </h3>
            <p className="mt-2 text-sm text-[var(--foreground-muted)]">
              {body}
            </p>
          </div>
        ))}
      </section>

      <p className="text-center text-xs text-[var(--foreground-muted)]">
        Free, no paywall. Independent and not affiliated with Microsoft — all
        practice content is original, written from publicly published skills
        outlines.
      </p>
    </div>
  );
}
