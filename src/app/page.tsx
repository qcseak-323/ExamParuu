import Link from "next/link";
import { catalog, getExamContent } from "@/lib/content";
import { getDisplayTier, getRetroLabel } from "@/lib/levels";

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
          ExamReady is a free, retro-styled practice platform for Microsoft
          certification exams. {totalQuestions} original practice questions,
          {" "}{totalFlashcards} flashcards, full study guides, and progress
          tracking — no account required, no paywall.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/catalog"
            className="pixel-button rounded-md bg-[var(--accent)] px-6 py-3 text-sm font-medium text-[var(--accent-foreground)]"
          >
            PRESS START ▶
          </Link>
          <Link
            href={`/exams/${catalog[0]?.code}/quiz`}
            className="pixel-button rounded-md bg-[var(--panel)] px-6 py-3 text-sm font-medium"
          >
            Try a demo quiz
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-pixel text-sm">Choose your route</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {catalog.map((exam) => (
            <Link
              key={exam.code}
              href={`/exams/${exam.code}`}
              className="pixel-panel flex flex-col gap-2 p-5 hover:-translate-y-0.5 transition-transform"
            >
              <span className="font-pixel text-xs text-[var(--accent)]">
                {exam.code.toUpperCase()}
              </span>
              <p className="text-sm font-medium">{exam.title}</p>
              <p className="text-xs text-[var(--foreground-muted)]">
                {getRetroLabel(exam.msLevel)} · {getDisplayTier(exam.msLevel)}
              </p>
            </Link>
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
            <h3 className="font-medium">2. Practice</h3>
            <p className="mt-2 text-sm text-[var(--foreground-muted)]">
              Take quizzes filtered by domain, get instant explanations, and
              use flashcards to lock in terminology.
            </p>
          </div>
          <div className="pixel-panel p-5">
            <h3 className="font-medium">3. Track</h3>
            <p className="mt-2 text-sm text-[var(--foreground-muted)]">
              Earn XP, gym badges, and a daily streak while your quiz scores
              and flashcard mastery are saved on your device.
            </p>
          </div>
        </div>
      </section>

      <section className="pixel-panel p-6 text-sm">
        <h2 className="mb-2 font-pixel text-xs">Not affiliated with Microsoft</h2>
        <p className="text-[var(--foreground-muted)]">
          ExamReady is an independent, unofficial study resource. All
          practice content is original, written from Microsoft&apos;s
          publicly published skills-measured outlines — never from real,
          NDA-protected exam questions.
        </p>
      </section>
    </div>
  );
}
