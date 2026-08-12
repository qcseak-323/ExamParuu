"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getCatalogEntry, getExamContent } from "@/lib/content";
import {
  EXAM_PAPER_SIZE,
  buildExamPaper,
  gradeQuestion,
  scoreByDomain,
  storedAnswer,
} from "@/lib/review";
import QuestionCard from "@/components/question/QuestionCard";
import { draftToAnswer, isAnswered } from "@/components/question/draft";
import { saveQuizAttempt } from "@/lib/storage";
import { saveQuizAttemptToDb } from "@/lib/actions";
import DialogueBox, { DialogueFrame } from "@/components/DialogueBox";
import ProfessorPortrait from "@/components/ProfessorPortrait";
import { useSfx, useTrackControl } from "@/components/AudioProvider";
import type { Question, QuizResultEntry } from "@/lib/types";
import { BackGlyph, ForwardGlyph } from "@/components/Glyph";

/**
 * The Proving — the real certification format, simulated.
 *
 * Where the Dungeon is a training bout (short paper, scaled clock), the
 * Proving is the exam as Microsoft runs it: the full paper, the real clock
 * from the catalog's `durationMinutes`, no feedback of any kind until the
 * end, and a scaled score out of 1000 with the real 700 pass mark.
 * Unanswered questions score as wrong, exactly as they would on the day.
 *
 * Recorded with the `"exam"` sentinel in `domainFilter` — like `"mock"` and
 * `"review"`, nothing reads the field back. Only answered questions go into
 * `results`, so the review deck and XP see the same shapes they always have;
 * the displayed score divides by the full paper length regardless.
 */

/** Sentinel in `domainFilter` — verified nothing reads that field back. */
const EXAM_FILTER = "exam";
const DEFAULT_MINUTES = 45;
const DEFAULT_PASS = 700;

/** Microsoft-style scaled score: linear 100–1000 over the full paper. */
function scaledScore(correct: number, paperLength: number): number {
  if (paperLength === 0) return 100;
  return 100 + Math.round((correct / paperLength) * 900);
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Phase = "briefing" | "exam" | "debrief";

export default function ExamSimClient({ examCode }: { examCode: string }) {
  const content = getExamContent(examCode);
  const exam = getCatalogEntry(examCode);
  const playSfx = useSfx();
  const setTrack = useTrackControl();

  const [phase, setPhase] = useState<Phase>("briefing");
  const [paper, setPaper] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  /**
   * One draft per paper question, `undefined` while untouched.
   *
   * Drafts rather than graded answers because the paper is not marked until it
   * ends, and drafts rather than component state because the navigator
   * unmounts a question whenever you jump away from it. The shape of each
   * entry belongs to whichever body rendered it — see components/question/draft.ts.
   */
  const [drafts, setDrafts] = useState<unknown[]>([]);
  const [remainingMs, setRemainingMs] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  // Absolute deadline in a ref; the display derives from Date.now() so a
  // backgrounded tab resumes with the correct time, not extra time.
  const deadlineRef = useRef<number | null>(null);
  const finishedRef = useRef(false);

  const bankSize = content?.questions.length ?? 0;
  /**
   * How long the paper will actually be. The Proving asks for
   * EXAM_PAPER_SIZE, but a bank with fewer single-answer questions than that
   * yields what it has — so the briefing must promise the real number rather
   * than the target or the bank size.
   */
  const paperLength = Math.min(EXAM_PAPER_SIZE, bankSize);
  const totalMs = (exam?.durationMinutes ?? DEFAULT_MINUTES) * 60_000;
  const passMark = exam?.passingScore ?? DEFAULT_PASS;

  useEffect(() => {
    if (phase === "exam") setTrack("battle");
    else setTrack(null);
    return () => setTrack(null);
  }, [phase, setTrack]);

  useEffect(() => {
    if (phase !== "exam") return;
    const tick = () => {
      const deadline = deadlineRef.current;
      if (deadline === null) return;
      const left = deadline - Date.now();
      setRemainingMs(left);
      if (left <= 0 && !finishedRef.current) {
        finishedRef.current = true;
        setTimedOut(true);
        setPhase("debrief");
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Only answered questions become result entries — the review deck and XP
  // keep seeing the shapes they always have. `at` is 0 in this render-time
  // copy (render must stay pure); the persist effect stamps the real time.
  const finalResults: QuizResultEntry[] = useMemo(
    () =>
      paper.flatMap((q, i) => {
        const answer = draftToAnswer(q, drafts[i]);
        if (!answer) return [];
        return [
          {
            questionId: q.id,
            domain: q.domain,
            correct: gradeQuestion(q, answer),
            ...storedAnswer(answer),
            at: 0,
          },
        ];
      }),
    [paper, drafts],
  );

  // Persist once, when the debrief is reached.
  useEffect(() => {
    if (phase !== "debrief" || finalResults.length === 0) return;
    const stamped = finalResults.map((r) => ({ ...r, at: Date.now() }));
    const attempt = {
      id: `${Date.now()}`,
      examCode,
      timestamp: Date.now(),
      domainFilter: EXAM_FILTER,
      numQuestions: stamped.length,
      correctCount: stamped.filter((r) => r.correct).length,
      results: stamped,
    };
    saveQuizAttempt(attempt);
    saveQuizAttemptToDb(attempt).catch((err) =>
      console.error("Failed to sync Proving result to account", err),
    );
    // Keyed on phase alone: exactly once per run; answers are frozen here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const attemptsUnused = useMemo(() => [], []);

  function begin() {
    // A fixed-length paper ordered by blueprint weight. Shorter than
    // EXAM_PAPER_SIZE while a bank has fewer questions than that; once a bank
    // exceeds it, buildExamPaper samples and retakes differ.
    //
    // Every authored format, not just four-option items: the bodies are
    // controlled and silent under `reveal={false}`, which is what the Proving
    // needs.
    const built = buildExamPaper(examCode, attemptsUnused, EXAM_PAPER_SIZE);
    setPaper(built);
    setIndex(0);
    setDrafts(Array<unknown>(built.length).fill(undefined));
    setTimedOut(false);
    finishedRef.current = false;
    deadlineRef.current = Date.now() + totalMs;
    setRemainingMs(totalMs);
    setPhase("exam");
    playSfx("confirm");
  }

  function setDraft(at: number, draft: unknown) {
    setDrafts((prev) => {
      const next = [...prev];
      next[at] = draft;
      return next;
    });
  }

  function go(to: number) {
    if (to < 0 || to >= paper.length) return;
    playSfx("cursor");
    setIndex(to);
  }

  function endPaper() {
    finishedRef.current = true;
    playSfx("confirm");
    setPhase("debrief");
  }

  if (!content || !exam) {
    return (
      <p className="text-body text-[var(--foreground-muted)]">
        This exam has no practice content yet, so the Proving isn&apos;t open.
      </p>
    );
  }

  // --- Briefing ------------------------------------------------------------

  if (phase === "briefing") {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <h1 className="font-pixel text-display">
          The Proving · {exam.code.toUpperCase()}
        </h1>

        {/* The terms of the paper, as chips. They used to be a paragraph of
            the professor's dialogue, where they were read once and forgotten. */}
        <div className="flex flex-wrap gap-2">
          {[
            `${paperLength} questions`,
            `${Math.round(totalMs / 60_000)} minutes`,
            `${passMark} to pass`,
            "No feedback until the end",
          ].map((fact) => (
            <span
              key={fact}
              className="rounded-md border-2 border-[var(--border)] bg-[var(--panel)] px-2 py-1 text-caption font-semibold"
            >
              {fact}
            </span>
          ))}
        </div>

        <DialogueBox
          speaker="Prof. Sequel"
          portrait={<ProfessorPortrait />}
          lines={[
            "This one runs the way the real paper runs. Unanswered questions count against you.",
            "I'll be here with the score report when you walk out.",
          ]}
          footer={
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={begin} className="start-button tap-target">
                Begin the Proving
                <ForwardGlyph />
              </button>
              <Link
                href={`/exams/${examCode}`}
                className="pixel-button rounded-md bg-[var(--panel)] px-5 py-2.5 text-body font-medium"
              >
                Not yet
              </Link>
            </div>
          }
        />

        <p className="text-caption text-[var(--foreground-muted)]">
          A pass here means readiness, not a guarantee — the real exam draws
          from a larger pool.
        </p>
      </div>
    );
  }

  // --- Exam ----------------------------------------------------------------

  if (phase === "exam") {
    const question = paper[index];
    if (!question) return null;

    const lowTime = remainingMs < 5 * 60_000;
    const answeredCount = paper.filter((q, i) => isAnswered(q, drafts[i])).length;
    const unanswered = paper.length - answeredCount;

    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="flex items-center justify-between text-caption text-[var(--foreground-muted)]">
          <span>
            Question {index + 1} of {paper.length}
          </span>
          <span
            className={
              lowTime ? "font-semibold text-[var(--danger)]" : undefined
            }
          >
            {formatClock(remainingMs)} left
          </span>
        </div>

        {/* `key` is load-bearing: without it React keeps one QuestionCard
            mounted across a jump and the next question inherits the previous
            one's internal state. The draft itself lives in `drafts`, so
            remounting costs nothing. */}
        <div className="pixel-panel p-5">
          <QuestionCard
            key={question.id}
            question={question}
            reveal={false}
            draft={drafts[index]}
            onDraftChange={(draft) => setDraft(index, draft)}
            onAnswered={() => {}}
          />
        </div>

        {/* The real paper moves on a button, not on a click into an answer:
            a multi-select or an ordering grid is not finished the moment it
            is first touched. */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => go(index - 1)}
            className="pixel-button tap-target rounded-md bg-[var(--panel)] px-4 py-2 text-body font-medium disabled:opacity-40"
          >
            <BackGlyph />
            Previous
          </button>
          <button
            type="button"
            disabled={index + 1 >= paper.length}
            onClick={() => go(index + 1)}
            className="pixel-button tap-target rounded-md bg-[var(--accent)] px-4 py-2 text-body font-medium text-[var(--accent-foreground)] disabled:opacity-40"
          >
            Next
            <ForwardGlyph />
          </button>
        </div>

        {/* The review screen every real exam has: jump to any question,
            change any answer, end the paper when you choose to. */}
        <section className="pixel-panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-caption font-semibold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
              Question navigator · {answeredCount}/{paper.length} answered
            </p>
            <button
              type="button"
              onClick={endPaper}
              className="pixel-button rounded-md bg-[var(--accent)] px-4 py-1.5 text-caption font-semibold text-[var(--accent-foreground)]"
            >
              End exam{unanswered > 0 ? ` (${unanswered} unanswered)` : ""}
              <ForwardGlyph />
            </button>
          </div>
          <div
            className="mt-3 grid grid-cols-8 gap-1.5 sm:grid-cols-10"
            role="group"
            aria-label="Jump to question"
          >
            {paper.map((q, i) => {
              const answered = isAnswered(q, drafts[i]);
              const current = i === index;
              return (
                <button
                  key={q.id}
                  type="button"
                  aria-label={`Question ${i + 1}${answered ? ", answered" : ", unanswered"}`}
                  aria-current={current ? "true" : undefined}
                  onClick={() => go(i)}
                  className={`min-h-9 rounded border-2 text-caption font-semibold ${
                    current
                      ? "border-[var(--focus)] ring-2 ring-[var(--focus)]"
                      : "border-[var(--border)]"
                  } ${
                    answered
                      ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                      : "bg-[var(--panel)] text-[var(--foreground-muted)]"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  // --- Debrief: the score report -------------------------------------------

  const correct = finalResults.filter((r) => r.correct).length;
  const score = scaledScore(correct, paper.length);
  const passed = score >= passMark;
  const breakdown = scoreByDomain(examCode, finalResults);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-label font-semibold uppercase tracking-[0.12em] text-[var(--foreground-soft)]">
          Score report · {exam.code.toUpperCase()}
        </p>
        <p className="font-pixel text-hero">{score}</p>
        <p
          className={`text-body-lg font-semibold ${
            passed ? "text-[var(--success)]" : "text-[var(--danger)]"
          }`}
        >
          {passed ? `Pass — the ${exam.code.toUpperCase()} seal is yours` : `Below the ${passMark} pass mark`}
        </p>
        <div className="hp-track w-full max-w-md">
          <div
            className={`hp-fill ${passed ? "hp-fill--good" : "hp-fill--low"}`}
            style={{ width: `${((score - 100) / 900) * 100}%` }}
          />
        </div>
        <p className="text-caption text-[var(--foreground-muted)]">
          {correct} of {paper.length} correct
          {timedOut
            ? ` — the clock ended the paper with ${paper.length - finalResults.length} unanswered`
            : ""}
        </p>
      </div>

      <DialogueFrame>
        <span className="dialogue-tab">Prof. Sequel</span>
        <div className="flex items-center gap-3">
          <ProfessorPortrait />
          <p className="dialogue-text flex-1">
            {passed
              ? "A real pass, under real conditions. Book the exam while it's fresh."
              : timedOut
                ? "The clock is half the exam. Run the dungeon for pace, then come back."
                : "Not this time. The report below says where the marks went."}
          </p>
        </div>
      </DialogueFrame>

      <section>
        <h2 className="mb-3 font-pixel text-title">By skills area</h2>
        <div className="flex flex-col gap-3">
          {breakdown.map((d) => {
            const ratio = d.total === 0 ? 0 : d.correct / d.total;
            return (
              <div key={d.id}>
                <div className="flex items-baseline justify-between gap-3 text-caption">
                  <span className="font-semibold">{d.name}</span>
                  <span className="text-[var(--foreground-muted)]">
                    {d.weight} of the exam ·{" "}
                    {d.total === 0 ? "—" : `${d.correct}/${d.total}`}
                  </span>
                </div>
                <div className="hp-track mt-1">
                  <div
                    className={`hp-fill ${
                      ratio >= 0.7
                        ? "hp-fill--good"
                        : ratio >= 0.5
                          ? "hp-fill--warn"
                          : "hp-fill--low"
                    }`}
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setPhase("briefing")}
          className="pixel-button rounded-md bg-[var(--accent)] px-5 py-2.5 text-body font-medium text-[var(--accent-foreground)]"
        >
          Take it again
        </button>
        <Link
          href={`/exams/${examCode}/quiz?mode=review`}
          className="pixel-button rounded-md bg-[var(--panel)] px-5 py-2.5 text-body font-medium"
        >
          Redeem what you missed
        </Link>
        <Link
          href={`/exams/${examCode}`}
          className="pixel-button rounded-md bg-[var(--panel)] px-5 py-2.5 text-body font-medium"
        >
          Back to the route
        </Link>
      </div>
    </div>
  );
}
