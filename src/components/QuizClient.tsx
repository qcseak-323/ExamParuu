"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  getExamContent,
  getQuestionsByDomain,
  getDomainName,
} from "@/lib/content";
import { shuffle } from "@/lib/shuffle";
import { saveQuizAttempt } from "@/lib/storage";
import { saveQuizAttemptToDb } from "@/lib/actions";
import type { Question, QuizResultEntry } from "@/lib/types";

const COUNT_OPTIONS = [5, 10, 20, "all"] as const;
const FEEDBACK_EMAIL = "qcseak@gmail.com";

type Phase = "setup" | "active" | "finished";

export default function QuizClient({ examCode }: { examCode: string }) {
  const content = getExamContent(examCode);
  const searchParams = useSearchParams();
  const { status: sessionStatus } = useSession();
  const initialDomain = searchParams.get("domain") ?? "all";

  const [phase, setPhase] = useState<Phase>("setup");
  const [domainFilter, setDomainFilter] = useState<string>(initialDomain);
  const [countChoice, setCountChoice] =
    useState<(typeof COUNT_OPTIONS)[number]>(10);

  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<QuizResultEntry[]>([]);

  const correctCount = useMemo(
    () => results.filter((r) => r.correct).length,
    [results],
  );

  if (!content) {
    return (
      <p className="text-sm text-[var(--foreground-muted)]">
        No practice content is available for this exam yet.
      </p>
    );
  }

  const availableCount = getQuestionsByDomain(examCode, domainFilter).length;

  function startQuiz() {
    const pool = shuffle(getQuestionsByDomain(examCode, domainFilter));
    const n = countChoice === "all" ? pool.length : Math.min(countChoice, pool.length);
    setActiveQuestions(pool.slice(0, n));
    setIndex(0);
    setSelected(null);
    setResults([]);
    setPhase("active");
  }

  function chooseOption(optionIndex: number) {
    if (selected !== null) return;
    setSelected(optionIndex);
    const q = activeQuestions[index];
    setResults((prev) => [
      ...prev,
      {
        questionId: q.id,
        domain: q.domain,
        correct: optionIndex === q.correctIndex,
      },
    ]);
  }

  function next() {
    if (index + 1 < activeQuestions.length) {
      setIndex(index + 1);
      setSelected(null);
    } else {
      finish();
    }
  }

  function finish() {
    const correctCount = results.filter((r) => r.correct).length;
    const attempt = {
      id: `${Date.now()}`,
      examCode,
      timestamp: Date.now(),
      domainFilter,
      numQuestions: activeQuestions.length,
      correctCount,
      results,
    };
    saveQuizAttempt(attempt);
    if (sessionStatus === "authenticated") {
      saveQuizAttemptToDb(attempt).catch((err) =>
        console.error("Failed to sync quiz attempt to account", err),
      );
    }
    setPhase("finished");
  }

  if (phase === "setup") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-pixel text-xl">Practice quiz</h1>
          <p className="mt-3 max-w-xl text-sm text-[var(--foreground-muted)]">
            Pick a skills area and a question count, then work through each
            question one at a time. You&apos;ll see the correct answer and an
            explanation immediately after each pick.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Skills area</label>
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="w-full max-w-sm rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
          >
            <option value="all">All domains</option>
            {content.outline.domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Number of questions</label>
          <div className="flex flex-wrap gap-2">
            {COUNT_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => setCountChoice(c)}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  countChoice === c
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                    : "border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/10"
                }`}
              >
                {c === "all" ? `All (${availableCount})` : c}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={startQuiz}
          disabled={availableCount === 0}
          className="pixel-button w-fit rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-50"
        >
          Start quiz
        </button>
      </div>
    );
  }

  if (phase === "active") {
    const q = activeQuestions[index];
    const mailtoHref = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(
      `ExamReady question flag: ${q.id}`,
    )}&body=${encodeURIComponent(
      `Question (${q.id}): ${q.question}\n\nWhat's wrong with this question?\n`,
    )}`;

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between text-sm text-[var(--foreground-muted)]">
          <span>
            Question {index + 1} of {activeQuestions.length}
          </span>
          <span>{getDomainName(examCode, q.domain)}</span>
        </div>

        <h2 className="text-xl font-medium leading-relaxed">{q.question}</h2>

        <div className="flex flex-col gap-2">
          {q.options.map((option, i) => {
            const isCorrect = i === q.correctIndex;
            const isSelected = i === selected;
            let style =
              "border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/10";
            if (selected !== null) {
              if (isCorrect) {
                style =
                  "border-emerald-600 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300";
              } else if (isSelected) {
                style = "border-red-600 bg-red-600/10 text-red-800 dark:text-red-300";
              } else {
                style = "border-black/10 opacity-60 dark:border-white/10";
              }
            }
            return (
              <button
                key={i}
                onClick={() => chooseOption(i)}
                disabled={selected !== null}
                className={`rounded-md border px-4 py-3 text-left text-sm transition-colors ${style}`}
              >
                {option}
              </button>
            );
          })}
        </div>

        {selected !== null && (
          <div className="pixel-panel p-4 text-sm">
            <p className="font-medium">
              {selected === q.correctIndex ? "Correct." : "Not quite."}
            </p>
            <p className="mt-1 text-[var(--foreground-muted)]">
              {q.explanation}
            </p>
            <a
              href={mailtoHref}
              className="mt-2 inline-block text-xs underline text-[var(--foreground-muted)] hover:text-[var(--accent)]"
            >
              Report an issue with this question
            </a>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-sm text-[var(--foreground-muted)]">
            Score so far: {correctCount}/{results.length}
          </span>
          <button
            onClick={next}
            disabled={selected === null}
            className="pixel-button rounded-md bg-[var(--accent)] px-5 py-2 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-50"
          >
            {index + 1 < activeQuestions.length ? "Next question" : "See results"}
          </button>
        </div>
      </div>
    );
  }

  // finished
  const missed = activeQuestions.filter((q, i) => !results[i]?.correct);
  const pct = Math.round((correctCount / activeQuestions.length) * 100);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-pixel text-xl">Quiz complete</h1>
        <p className="mt-3 text-lg">
          You scored{" "}
          <span className="font-semibold text-[var(--accent)]">
            {correctCount}/{activeQuestions.length}
          </span>{" "}
          ({pct}%)
        </p>
      </div>

      {missed.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Review missed questions</h2>
          {missed.map((q) => (
            <div key={q.id} className="pixel-panel p-4 text-sm">
              <p className="font-medium">{q.question}</p>
              <p className="mt-2 text-emerald-700 dark:text-emerald-400">
                Correct answer: {q.options[q.correctIndex]}
              </p>
              <p className="mt-1 text-[var(--foreground-muted)]">
                {q.explanation}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={startQuiz}
          className="pixel-button rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--accent-foreground)]"
        >
          Practise again
        </button>
        <button
          onClick={() => setPhase("setup")}
          className="pixel-button rounded-md bg-[var(--panel)] px-5 py-2.5 text-sm font-medium"
        >
          Change settings
        </button>
      </div>
    </div>
  );
}
