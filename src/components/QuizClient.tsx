"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { outline, getQuestionsByDomain, getDomainName } from "@/lib/content";
import { shuffle } from "@/lib/shuffle";
import { saveQuizAttempt } from "@/lib/storage";
import type { Question, QuizResultEntry } from "@/lib/types";

const COUNT_OPTIONS = [5, 10, 20, "all"] as const;

type Phase = "setup" | "active" | "finished";

export default function QuizClient() {
  const searchParams = useSearchParams();
  const initialDomain = searchParams.get("domain") ?? "all";

  const [phase, setPhase] = useState<Phase>("setup");
  const [domainFilter, setDomainFilter] = useState<string>(initialDomain);
  const [countChoice, setCountChoice] =
    useState<(typeof COUNT_OPTIONS)[number]>(10);

  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<QuizResultEntry[]>([]);

  const availableCount = getQuestionsByDomain(domainFilter).length;

  function startQuiz() {
    const pool = shuffle(getQuestionsByDomain(domainFilter));
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
    saveQuizAttempt({
      id: `${Date.now()}`,
      timestamp: Date.now(),
      domainFilter,
      numQuestions: activeQuestions.length,
      correctCount,
      results,
    });
    setPhase("finished");
  }

  const correctCount = useMemo(
    () => results.filter((r) => r.correct).length,
    [results],
  );

  if (phase === "setup") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Practice quiz</h1>
          <p className="mt-2 max-w-xl text-sm text-black/70 dark:text-white/70">
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
            className="w-full max-w-sm rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
          >
            <option value="all">All domains</option>
            {outline.domains.map((d) => (
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
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
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
          className="w-fit rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Start quiz
        </button>
      </div>
    );
  }

  if (phase === "active") {
    const q = activeQuestions[index];
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between text-sm text-black/60 dark:text-white/60">
          <span>
            Question {index + 1} of {activeQuestions.length}
          </span>
          <span>{getDomainName(q.domain)}</span>
        </div>

        <h2 className="text-xl font-medium leading-relaxed">{q.question}</h2>

        <div className="flex flex-col gap-2">
          {q.options.map((option, i) => {
            const isCorrect = i === q.correctIndex;
            const isSelected = i === selected;
            let style =
              "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10";
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
          <div className="rounded-md bg-black/5 p-4 text-sm dark:bg-white/10">
            <p className="font-medium">
              {selected === q.correctIndex ? "Correct." : "Not quite."}
            </p>
            <p className="mt-1 text-black/80 dark:text-white/80">
              {q.explanation}
            </p>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-sm text-black/60 dark:text-white/60">
            Score so far: {correctCount}/{results.length}
          </span>
          <button
            onClick={next}
            disabled={selected === null}
            className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {index + 1 < activeQuestions.length ? "Next question" : "See results"}
          </button>
        </div>
      </div>
    );
  }

  // finished
  const missed = activeQuestions.filter(
    (q, i) => !results[i]?.correct,
  );
  const pct = Math.round((correctCount / activeQuestions.length) * 100);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quiz complete</h1>
        <p className="mt-2 text-lg">
          You scored{" "}
          <span className="font-semibold text-indigo-600">
            {correctCount}/{activeQuestions.length}
          </span>{" "}
          ({pct}%)
        </p>
      </div>

      {missed.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Review missed questions</h2>
          {missed.map((q) => (
            <div
              key={q.id}
              className="rounded-md border border-black/10 p-4 text-sm dark:border-white/10"
            >
              <p className="font-medium">{q.question}</p>
              <p className="mt-2 text-emerald-700 dark:text-emerald-400">
                Correct answer: {q.options[q.correctIndex]}
              </p>
              <p className="mt-1 text-black/70 dark:text-white/70">
                {q.explanation}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={startQuiz}
          className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Retake this quiz
        </button>
        <button
          onClick={() => setPhase("setup")}
          className="rounded-md border border-black/15 px-5 py-2.5 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Change settings
        </button>
      </div>
    </div>
  );
}
