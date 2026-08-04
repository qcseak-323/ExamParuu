import Link from "next/link";
import { catalog, getExamContent } from "@/lib/content";
import { getDisplayTier, getRetroLabel } from "@/lib/levels";
import { PAL_SPECIES, PAL_TYPES } from "@/lib/pals";
import PixelSprite from "@/components/PixelSprite";

/**
 * The one page a signed-out visitor can reach. Everything it links to is
 * gated, so its job is to explain the app and sell the account rather than
 * to hand out entry points that will just bounce to /login.
 */
export default function Home() {
  const totalQuestions = catalog.reduce(
    (sum, exam) => sum + (getExamContent(exam.code)?.questions.length ?? 0),
    0,
  );
  const totalFlashcards = catalog.reduce(
    (sum, exam) => sum + (getExamContent(exam.code)?.flashcards.length ?? 0),
    0,
  );

  return (
    <div className="flex flex-col gap-16">
      <section className="pixel-panel flex flex-col items-start gap-4 p-8">
        <span className="font-pixel text-[10px] text-[var(--accent)]">
          A trainer&apos;s journey through Microsoft certification
        </span>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Train your way to a passing score.
        </h1>
        <p className="max-w-2xl text-base text-[var(--foreground-muted)]">
          ExamReady turns Microsoft certification prep into a turn-based
          adventure. Pick a starter ExamPal, battle wild exam topics with{" "}
          {totalQuestions} original practice questions and {totalFlashcards}{" "}
          flashcards, and level up as you go. Free, no paywall — just an email
          address to keep your progress.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/login"
            className="pixel-button rounded-md bg-[var(--accent)] px-6 py-3 text-sm font-medium text-[var(--accent-foreground)]"
          >
            PRESS START ▶
          </Link>
        </div>
        <p className="text-xs text-[var(--foreground-muted)]">
          Sign in with a magic link — no password to remember.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-pixel text-sm">Choose your first partner</h2>
        <p className="mb-4 max-w-2xl text-sm text-[var(--foreground-muted)]">
          Every trainer starts by picking one of three ExamPals. Yours appears
          at your side in every battle and evolves as you level up.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {PAL_TYPES.map((type) => {
            const species = PAL_SPECIES[type];
            const [starter] = species.stages;
            return (
              <div
                key={type}
                className="pixel-panel flex flex-col items-center gap-2 p-5 text-center"
              >
                <div className="pal-idle">
                  <PixelSprite
                    sprite={starter.sprite}
                    palette={species.palette}
                    size={72}
                    title={`${starter.name}, the ${species.label}-type starter`}
                  />
                </div>
                <p className="font-pixel text-[10px]">{starter.name}</p>
                <p className="text-xs text-[var(--accent)]">{species.label}</p>
                <p className="text-xs text-[var(--foreground-muted)]">
                  {species.tagline}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-pixel text-sm">Routes you can train on</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {catalog.map((exam) => (
            <div key={exam.code} className="pixel-panel flex flex-col gap-2 p-5">
              <span className="font-pixel text-xs text-[var(--accent)]">
                {exam.code.toUpperCase()}
              </span>
              <p className="text-sm font-medium">{exam.title}</p>
              <p className="text-xs text-[var(--foreground-muted)]">
                {getRetroLabel(exam.msLevel)} · {getDisplayTier(exam.msLevel)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-pixel text-sm">How it works</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="pixel-panel p-5">
            <h3 className="font-medium">1. Study</h3>
            <p className="mt-2 text-sm text-[var(--foreground-muted)]">
              Read the guide for each skills area to build a mental model
              before you drill questions.
            </p>
          </div>
          <div className="pixel-panel p-5">
            <h3 className="font-medium">2. Battle</h3>
            <p className="mt-2 text-sm text-[var(--foreground-muted)]">
              Face a wild topic in a turn-based battle. Right answers land a
              hit; wrong ones cost your ExamPal health — and you always get the
              explanation.
            </p>
          </div>
          <div className="pixel-panel p-5">
            <h3 className="font-medium">3. Level up</h3>
            <p className="mt-2 text-sm text-[var(--foreground-muted)]">
              Earn XP, gym badges, and a daily streak. Hit the right level and
              your ExamPal evolves.
            </p>
          </div>
        </div>
      </section>

      <section className="pixel-panel p-6 text-sm">
        <h2 className="mb-2 font-pixel text-xs">Why an account?</h2>
        <p className="text-[var(--foreground-muted)]">
          Your ExamPal, XP, badges, and streak are tied to your trainer
          profile so they follow you between devices. Signing in takes one
          click from an emailed link — there is no password and nothing to pay.
        </p>
      </section>

      <section className="pixel-panel p-6 text-sm">
        <h2 className="mb-2 font-pixel text-xs">
          Not affiliated with Microsoft
        </h2>
        <p className="text-[var(--foreground-muted)]">
          ExamReady is an independent, unofficial study resource. All practice
          content is original, written from Microsoft&apos;s publicly published
          skills-measured outlines — never from real, NDA-protected exam
          questions.
        </p>
      </section>
    </div>
  );
}
