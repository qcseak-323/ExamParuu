"use client";

import { use, useMemo } from "react";
import { getCatalogEntry, getExamContent, getFlashcardsByDomain } from "@/lib/content";
import { useQuizAttempts, useFlashcardProgress } from "@/lib/storage";
import { computeBadges } from "@/lib/gamification";
import StorageNotice from "@/components/StorageNotice";

function Bar({ pct }: { pct: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
      <div
        className="h-full rounded-full bg-[var(--accent)]"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

export default function ExamProgressPage({
  params,
}: {
  params: Promise<{ examCode: string }>;
}) {
  const { examCode } = use(params);
  const exam = getCatalogEntry(examCode);
  const content = getExamContent(examCode);

  const allAttempts = useQuizAttempts();
  const flashcardProgress = useFlashcardProgress();

  const attempts = useMemo(
    () => allAttempts.filter((a) => a.examCode === examCode),
    [allAttempts, examCode],
  );

  const domains = useMemo(() => content?.outline.domains ?? [], [content]);

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

  const badges = useMemo(
    () => computeBadges(examCode, domains, attempts),
    [examCode, domains, attempts],
  );

  if (!exam || !content) {
    return (
      <p className="text-sm text-[var(--foreground-muted)]">
        No progress to show for this exam yet.
      </p>
    );
  }

  const overall =
    attempts.length === 0
      ? null
      : {
          avg: Math.round(
            (attempts.reduce((s, a) => s + a.correctCount / a.numQuestions, 0) /
              attempts.length) *
              100,
          ),
          best: Math.round(
            Math.max(...attempts.map((a) => (a.correctCount / a.numQuestions) * 100)),
          ),
        };

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-pixel text-xl">{exam.code.toUpperCase()} progress</h1>
        <StorageNotice />
      </div>

      {attempts.length === 0 ? (
        <p className="text-sm text-[var(--foreground-muted)]">
          You haven&apos;t taken a quiz for this exam yet.
        </p>
      ) : (
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="pixel-panel p-5">
            <p className="text-xs text-[var(--foreground-muted)]">Quizzes taken</p>
            <p className="mt-1 text-2xl font-semibold">{attempts.length}</p>
          </div>
          <div className="pixel-panel p-5">
            <p className="text-xs text-[var(--foreground-muted)]">Average score</p>
            <p className="mt-1 text-2xl font-semibold">{overall?.avg}%</p>
          </div>
          <div className="pixel-panel p-5">
            <p className="text-xs text-[var(--foreground-muted)]">Best score</p>
            <p className="mt-1 text-2xl font-semibold">{overall?.best}%</p>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 font-pixel text-sm">Gym badges</h2>
        <p className="mb-4 text-xs text-[var(--foreground-muted)]">
          Earned at 85%+ accuracy across at least 8 answered questions in a
          domain.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {badges.map((badge) => (
            <div
              key={badge.domainId}
              className={`pixel-panel flex items-center gap-3 p-4 ${
                badge.earned ? "" : "opacity-60"
              }`}
            >
              <span className="text-2xl">{badge.earned ? "🏅" : "⚪"}</span>
              <div>
                <p className="text-sm font-medium">{badge.domainName}</p>
                <p className="text-xs text-[var(--foreground-muted)]">
                  {badge.answered === 0
                    ? "No attempts yet"
                    : `${Math.round(badge.accuracy * 100)}% (${badge.correct}/${badge.answered})`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-pixel text-sm">Accuracy by skills area</h2>
        <div className="flex flex-col gap-4">
          {domains.map((d) => {
            const stat = domainAccuracy[d.id];
            const pct =
              stat && stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : null;
            return (
              <div key={d.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{d.name}</span>
                  <span className="text-[var(--foreground-muted)]">
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
        <h2 className="mb-4 font-pixel text-sm">Flashcard mastery</h2>
        <div className="flex flex-col gap-4">
          {domains.map((d) => {
            const cards = getFlashcardsByDomain(examCode, d.id);
            const known = cards.filter((c) => flashcardProgress[c.id] === "known").length;
            const pct = cards.length === 0 ? 0 : Math.round((known / cards.length) * 100);
            return (
              <div key={d.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{d.name}</span>
                  <span className="text-[var(--foreground-muted)]">
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
          <h2 className="mb-4 font-pixel text-sm">Recent quizzes</h2>
          <div className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
            {[...attempts]
              .reverse()
              .slice(0, 10)
              .map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{new Date(a.timestamp).toLocaleDateString()}</span>
                  <span className="font-medium">
                    {a.correctCount}/{a.numQuestions} (
                    {Math.round((a.correctCount / a.numQuestions) * 100)}%)
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
