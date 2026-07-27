"use client";

import { useMemo } from "react";
import { outline, getDomainName, getFlashcardsByDomain } from "@/lib/content";
import {
  useQuizAttempts,
  useFlashcardProgress,
  resetAllProgress,
} from "@/lib/storage";

function Bar({ pct }: { pct: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
      <div
        className="h-full rounded-full bg-indigo-600"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

export default function ProgressPage() {
  const attempts = useQuizAttempts();
  const flashcardProgress = useFlashcardProgress();

  const domainAccuracy = useMemo(() => {
    const totals: Record<string, { correct: number; total: number }> = {};
    for (const attempt of attempts) {
      for (const r of attempt.results) {
        totals[r.domain] ??= { correct: 0, total: 0 };
        totals[r.domain].total += 1;
        if (r.correct) totals[r.domain].correct += 1;
      }
    }
    return totals;
  }, [attempts]);

  const overall = useMemo(() => {
    const totalQuestions = attempts.reduce((s, a) => s + a.numQuestions, 0);
    const totalCorrect = attempts.reduce((s, a) => s + a.correctCount, 0);
    const avg =
      attempts.length === 0
        ? 0
        : Math.round(
            (attempts.reduce(
              (s, a) => s + a.correctCount / a.numQuestions,
              0,
            ) /
              attempts.length) *
              100,
          );
    const best =
      attempts.length === 0
        ? 0
        : Math.round(
            Math.max(
              ...attempts.map((a) => (a.correctCount / a.numQuestions) * 100),
            ),
          );
    return { totalQuestions, totalCorrect, avg, best };
  }, [attempts]);

  function handleReset() {
    if (
      typeof window !== "undefined" &&
      window.confirm(
        "This will clear all saved quiz history and flashcard mastery on this device. Continue?",
      )
    ) {
      resetAllProgress();
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your progress</h1>
        <p className="mt-2 text-sm text-black/70 dark:text-white/70">
          Stored locally in this browser only — nothing is sent anywhere.
        </p>
      </div>

      {attempts.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">
          You haven&apos;t taken a quiz yet. Head to the practice quiz to get
          started.
        </p>
      ) : (
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-black/10 p-5 dark:border-white/10">
            <p className="text-xs text-black/60 dark:text-white/60">
              Quizzes taken
            </p>
            <p className="mt-1 text-2xl font-semibold">{attempts.length}</p>
          </div>
          <div className="rounded-lg border border-black/10 p-5 dark:border-white/10">
            <p className="text-xs text-black/60 dark:text-white/60">
              Average score
            </p>
            <p className="mt-1 text-2xl font-semibold">{overall.avg}%</p>
          </div>
          <div className="rounded-lg border border-black/10 p-5 dark:border-white/10">
            <p className="text-xs text-black/60 dark:text-white/60">
              Best score
            </p>
            <p className="mt-1 text-2xl font-semibold">{overall.best}%</p>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-medium">Accuracy by skills area</h2>
        <div className="flex flex-col gap-4">
          {outline.domains.map((d) => {
            const stat = domainAccuracy[d.id];
            const pct = stat && stat.total > 0
              ? Math.round((stat.correct / stat.total) * 100)
              : null;
            return (
              <div key={d.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{d.name}</span>
                  <span className="text-black/60 dark:text-white/60">
                    {pct === null ? "No attempts yet" : `${pct}% (${stat.correct}/${stat.total})`}
                  </span>
                </div>
                <Bar pct={pct ?? 0} />
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-medium">Flashcard mastery</h2>
        <div className="flex flex-col gap-4">
          {outline.domains.map((d) => {
            const cards = getFlashcardsByDomain(d.id);
            const known = cards.filter(
              (c) => flashcardProgress[c.id] === "known",
            ).length;
            const pct =
              cards.length === 0 ? 0 : Math.round((known / cards.length) * 100);
            return (
              <div key={d.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{d.name}</span>
                  <span className="text-black/60 dark:text-white/60">
                    {known}/{cards.length} known
                  </span>
                </div>
                <Bar pct={pct} />
              </div>
            );
          })}
        </div>
      </section>

      {attempts.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-medium">Recent quizzes</h2>
          <div className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
            {[...attempts]
              .reverse()
              .slice(0, 10)
              .map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span>
                    {new Date(a.timestamp).toLocaleDateString()} ·{" "}
                    {a.domainFilter === "all"
                      ? "All domains"
                      : getDomainName(a.domainFilter)}
                  </span>
                  <span className="font-medium">
                    {a.correctCount}/{a.numQuestions} (
                    {Math.round((a.correctCount / a.numQuestions) * 100)}%)
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}

      <button
        onClick={handleReset}
        className="w-fit rounded-md border border-red-600 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-600/10"
      >
        Reset all progress
      </button>
    </div>
  );
}
