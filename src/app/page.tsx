import Link from "next/link";
import { outline, questions, flashcards } from "@/lib/content";

export default function Home() {
  return (
    <div className="flex flex-col gap-14">
      <section className="flex flex-col items-start gap-4">
        <span className="rounded-full bg-indigo-600/10 px-3 py-1 text-xs font-medium text-indigo-600">
          {outline.examCode} · {outline.examName}
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Pass the DP-600 exam with focused practice.
        </h1>
        <p className="max-w-2xl text-base text-black/70 dark:text-white/70">
          ExamReady gives you a free study guide, {questions.length} original
          practice questions with explanations, {flashcards.length} flashcards,
          and progress tracking — all organized around the official DP-600
          skills areas. No account required, no paywall.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/quiz"
            className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Start a practice quiz
          </Link>
          <Link
            href="/study"
            className="rounded-md border border-black/15 px-5 py-2.5 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Read the study guide
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Exam skills areas</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {outline.domains.map((domain) => (
            <div
              key={domain.id}
              className="rounded-lg border border-black/10 p-5 dark:border-white/10"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium">{domain.name}</h3>
                <span className="shrink-0 rounded bg-black/5 px-2 py-0.5 text-xs text-black/60 dark:bg-white/10 dark:text-white/60">
                  {domain.weight}
                </span>
              </div>
              <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-black/70 dark:text-white/70">
                {domain.subtopics.map((topic) => (
                  <li key={topic}>{topic}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-black/50 dark:text-white/50">
          {outline.note}
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">How to use this site</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-black/10 p-5 dark:border-white/10">
            <h3 className="font-medium">1. Study</h3>
            <p className="mt-2 text-sm text-black/70 dark:text-white/70">
              Read the guide for each skills area to build a mental model of
              Fabric before you drill questions.
            </p>
          </div>
          <div className="rounded-lg border border-black/10 p-5 dark:border-white/10">
            <h3 className="font-medium">2. Practice</h3>
            <p className="mt-2 text-sm text-black/70 dark:text-white/70">
              Take quizzes filtered by domain, get instant explanations, and
              use flashcards to lock in terminology.
            </p>
          </div>
          <div className="rounded-lg border border-black/10 p-5 dark:border-white/10">
            <h3 className="font-medium">3. Track</h3>
            <p className="mt-2 text-sm text-black/70 dark:text-white/70">
              Your quiz scores and flashcard mastery are saved on your device
              so you can see which domains need more work.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
