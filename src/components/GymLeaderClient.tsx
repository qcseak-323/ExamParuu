"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  getCatalogEntry,
  getExamContent,
  studyHrefForQuestion,
  teachingLabelForQuestion,
} from "@/lib/content";
import { buildExamPaper, scoreByDomain } from "@/lib/review";
import { saveQuizAttempt, useQuizAttempts, useFlashcardProgress } from "@/lib/storage";
import { saveQuizAttemptToDb } from "@/lib/actions";
import {
  computeXp,
  computeLevel,
  computeBadges,
  isGymCleared,
} from "@/lib/gamification";
import { GLITCHLING, GLITCHLING_PALETTE, type PalType } from "@/lib/pals";
import { fighterRoster, getGuardian, guardianFighter } from "@/lib/guardians";
import { usePreferences } from "@/lib/preferences";
import PixelSprite from "@/components/PixelSprite";
import FighterSprite from "@/components/battle/FighterSprite";
import { useBattleTransition } from "@/components/battle/BattleTransition";
import MenuList, { type MenuOption } from "@/components/MenuList";
import DialogueBox, { DialogueFrame } from "@/components/DialogueBox";
import HpBar from "@/components/battle/HpBar";
import { useSfx, useTrackControl } from "@/components/AudioProvider";
import type { Question, QuizResultEntry } from "@/lib/types";

/**
 * The Gym Leader — a timed, blueprint-weighted mock exam.
 *
 * Deliberately a separate component from QuizClient rather than a mode flag on
 * it. The rules differ in almost every respect: a clock, no explanations until
 * the end, one attempt, a blueprint-weighted paper, and a debrief instead of a
 * results list. Threading all of that through the wild-battle component would
 * have made both harder to read.
 */

/** Passing is 70%, matching `catalog.passingScore` of 700/1000. */
const PASS_RATIO = 0.7;
/** Below this the result isn't a meaningful signal, so it can't be a pass. */
const MIN_PAPER = 10;
const DEFAULT_MINUTES_PER_QUESTION = 1.5;
/** Sentinel in `domainFilter` — verified nothing reads that field back. */
const MOCK_FILTER = "mock";

type Phase = "briefing" | "exam" | "debrief";

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function GymLeaderClient({
  examCode,
  palType,
  palNickname,
  paperSize,
}: {
  examCode: string;
  palType: PalType;
  palNickname: string | null;
  paperSize: number;
}) {
  const content = getExamContent(examCode);
  const exam = getCatalogEntry(examCode);
  const attempts = useQuizAttempts();
  const flashcards = useFlashcardProgress();
  const prefs = usePreferences();
  const playSfx = useSfx();
  const setTrack = useTrackControl();

  const { level } = computeLevel(computeXp(attempts, flashcards));

  // The dungeon's guardian: the opponent across the scene, and the prize for
  // a first clear. Older exams without a defined guardian fall back to the
  // Glitchling as the dungeon master.
  const guardian = getGuardian(examCode);

  // Whoever the trainer brings: starter by default, or any guardian already
  // caught. Chosen in the briefing.
  const roster = fighterRoster(palType, level, palNickname, attempts);
  const [fighterId, setFighterId] = useState("starter");
  const fighter = roster.find((f) => f.id === fighterId) ?? roster[0];
  const palName = fighter.name;

  const { run: runTransition, overlay: transitionOverlay } =
    useBattleTransition();

  const [phase, setPhase] = useState<Phase>("briefing");
  const [paper, setPaper] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<QuizResultEntry[]>([]);
  const [remainingMs, setRemainingMs] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  // Absolute deadline in a ref, with the display derived from Date.now().
  // Counting down by decrementing on a timer drifts badly once the tab is
  // backgrounded and the interval is throttled.
  const deadlineRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  // Whether the dungeon was already cleared when this run began — captured at
  // start so the debrief can tell a *first* clear (guardian joins) from a
  // repeat clear, even after the attempt persists and the predicate flips.
  // State rather than a ref because the debrief renders from it.
  const [wasClearedAtStart, setWasClearedAtStart] = useState(false);

  const totalMs = useMemo(() => {
    const minutes =
      exam?.durationMinutes ?? Math.round(paperSize * DEFAULT_MINUTES_PER_QUESTION);
    // Scale the real exam's clock to the length of paper we can actually set.
    const scaled =
      exam?.durationMinutes && content
        ? (minutes * paperSize) / Math.max(content.questions.length, 1)
        : minutes;
    return Math.max(5, Math.round(scaled)) * 60_000;
  }, [exam, paperSize, content]);

  const ribbons = useMemo(() => {
    const domains = content?.outline.domains ?? [];
    return computeBadges(examCode, domains, attempts);
  }, [examCode, content, attempts]);
  const ribbonsEarned = ribbons.filter((r) => r.earned).length;

  useEffect(() => {
    if (phase === "exam") setTrack("battle");
    else if (phase === "debrief") setTrack(null);
    return () => setTrack(null);
  }, [phase, setTrack]);

  // The clock. Reads the deadline rather than decrementing, so a throttled or
  // suspended tab resumes with the correct time instead of extra time.
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

  // Persist once, when the debrief is reached.
  useEffect(() => {
    if (phase !== "debrief" || results.length === 0) return;

    const attempt = {
      id: `${Date.now()}`,
      examCode,
      timestamp: Date.now(),
      domainFilter: MOCK_FILTER,
      numQuestions: results.length,
      correctCount: results.filter((r) => r.correct).length,
      results,
    };
    saveQuizAttempt(attempt);
    saveQuizAttemptToDb(attempt).catch((err) =>
      console.error("Failed to sync gym result to account", err),
    );
    // Intentionally keyed on phase alone: this must run exactly once per run,
    // and `results` is frozen by the time the debrief renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function beginExam() {
    setWasClearedAtStart(isGymCleared(examCode, attempts));
    const built = buildExamPaper(examCode, attempts, paperSize);
    setPaper(built);
    setIndex(0);
    setResults([]);
    setTimedOut(false);
    finishedRef.current = false;
    deadlineRef.current = Date.now() + totalMs;
    setRemainingMs(totalMs);
    setPhase("exam");
    playSfx("confirm");
  }

  function answer(optionIndex: number) {
    const question = paper[index];
    const correct = optionIndex === question.correctIndex;

    const next = [
      ...results,
      {
        questionId: question.id,
        domain: question.domain,
        correct,
        chosenIndex: optionIndex,
        at: Date.now(),
      },
    ];
    setResults(next);
    // No feedback mid-exam — that is the structural difference from a wild
    // battle, and it is what makes the debrief worth reading.
    playSfx("cursor");

    if (index + 1 >= paper.length) {
      finishedRef.current = true;
      setPhase("debrief");
    } else {
      setIndex((i) => i + 1);
    }
  }

  if (!content || !exam) {
    return (
      <p className="text-body text-[var(--foreground-muted)]">
        This exam has no content yet, so there is no dungeon to challenge.
      </p>
    );
  }

  // --- Briefing ------------------------------------------------------------

  if (phase === "briefing") {
    const readiness =
      ribbonsEarned === ribbons.length && ribbons.length > 0
        ? `You carry all ${ribbons.length} route ribbons. You look ready.`
        : `You carry ${ribbonsEarned} of ${ribbons.length} route ribbons. You can face me regardless — but the ribbons you're missing are usually the topics that cost people the exam.`;

    const alreadyOwned = isGymCleared(examCode, attempts);
    const guardianLine = guardian
      ? alreadyOwned
        ? `${guardian.name} guards this door — but you two have already met. This run is for the record.`
        : `${guardian.name} guards this door. ${guardian.tagline} Clear the dungeon and it joins your team.`
      : null;

    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <h1 className="font-pixel text-display">
          {exam.code.toUpperCase()} Dungeon Challenge
        </h1>

        {guardian && (
          <div className="pixel-panel flex items-center gap-4 p-4">
            <FighterSprite
              fighter={guardianFighter(guardian)}
              size={64}
              title={`${guardian.name}, guardian of this dungeon`}
            />
            <div>
              <p className="font-pixel text-label uppercase">{guardian.name}</p>
              <p className="text-caption text-[var(--foreground-muted)]">
                Guardian of the {exam.code.toUpperCase()} dungeon
                {alreadyOwned ? " · on your team" : ""}
              </p>
            </div>
          </div>
        )}

        {roster.length > 1 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-pixel text-title">Bring your Paruu</h2>
            <MenuList
              ariaLabel="Choose your Paruu"
              options={roster.map((f) => ({
                id: f.id,
                label: f.name,
                hint: fighter.id === f.id ? "◀ selected" : f.hint,
              }))}
              onSelect={setFighterId}
            />
          </section>
        )}

        <DialogueBox
          speaker="Dungeon Master"
          lines={[
            `So. You want the ${exam.code.toUpperCase()} badge.`,
            ...(guardianLine ? [guardianLine] : []),
            readiness,
            `${paperSize} questions, weighted the way the real paper is weighted. ${Math.round(totalMs / 60_000)} minutes on the clock. No explanations until we're done — that's what makes it an exam and not a practice bout.`,
            `${Math.round(PASS_RATIO * 100)}% to earn the badge. Whenever you're ready.`,
          ]}
          footer={
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => runTransition(beginExam)}
                className="pixel-button rounded-md bg-[var(--accent)] px-5 py-2.5 text-body font-medium text-[var(--accent-foreground)]"
              >
                Begin the challenge ▶
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
          Our question bank is {content.questions.length} questions strong, so a
          full-length paper isn&apos;t possible yet — treat this as a solid dress
          rehearsal rather than a simulation of the real exam.
        </p>

        {transitionOverlay}
      </div>
    );
  }

  // --- Exam ----------------------------------------------------------------

  if (phase === "exam") {
    const question = paper[index];
    if (!question) return null;

    const options: MenuOption[] = question.options.map((option, i) => ({
      id: String(i),
      label: option,
    }));

    const lowTime = remainingMs < 60_000;

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between text-caption text-[var(--foreground-muted)]">
          <span>
            Question {index + 1} of {paper.length}
          </span>
          <span className={lowTime ? "text-[var(--danger)]" : undefined}>
            {formatClock(remainingMs)} left
          </span>
        </div>

        <div className="battle-scene relative flex flex-col gap-6 p-4">
          <div className="flex items-start justify-between gap-4">
            {/* The clock is the leader's second bar, so it reads as part of
                the fight rather than as an anxiety widget bolted on top. */}
            <HpBar
              label={guardian ? guardian.name.toUpperCase() : "DUNGEON MASTER"}
              current={remainingMs}
              max={totalMs}
              tone="time"
              valueText={formatClock(remainingMs)}
            />
            <div className="battle-platform">
              {guardian ? (
                <FighterSprite
                  fighter={guardianFighter(guardian)}
                  size={96}
                  title={`${guardian.name}, guardian of this dungeon`}
                />
              ) : (
                <PixelSprite
                  sprite={GLITCHLING}
                  palette={GLITCHLING_PALETTE}
                  size={96}
                  title="The dungeon master"
                />
              )}
            </div>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div
              className={`battle-platform ${prefs.reducedMotion ? "" : "pal-idle"}`}
            >
              <FighterSprite
                fighter={fighter}
                size={96}
                flip
                title={fighter.title}
              />
            </div>
            <HpBar
              label={palName}
              current={index}
              max={paper.length}
              level={level}
              valueText={`${index}/${paper.length} answered`}
            />
          </div>
        </div>

        <DialogueFrame>
          <p className="text-body" aria-live="polite">
            {question.question}
          </p>
        </DialogueFrame>

        <MenuList
          ariaLabel="Choose your answer"
          columns={2}
          options={options}
          onSelect={(id) => answer(Number(id))}
        />
      </div>
    );
  }

  // --- Debrief -------------------------------------------------------------

  const correct = results.filter((r) => r.correct).length;
  const answered = results.length;
  const pct = answered === 0 ? 0 : Math.round((correct / answered) * 100);
  const passed =
    !timedOut && answered >= Math.min(MIN_PAPER, paper.length) &&
    correct / Math.max(answered, 1) >= PASS_RATIO;

  const breakdown = scoreByDomain(examCode, results);
  const weakest = [...breakdown]
    .filter((d) => d.total > 0)
    .sort((a, b) => a.correct / a.total - b.correct / b.total)[0];

  const missedQuestions = paper.filter((q) =>
    results.some((r) => r.questionId === q.id && !r.correct),
  );

  // De-duplicated reading list, in the order the topics were missed.
  const plan: { href: string; label: string }[] = [];
  const seenLabels = new Set<string>();
  for (const q of missedQuestions) {
    const label = teachingLabelForQuestion(q);
    if (seenLabels.has(label)) continue;
    seenLabels.add(label);
    plan.push({ href: studyHrefForQuestion(q), label });
  }

  // The catch moment: this run is the trainer's first clear of this dungeon.
  const guardianJoins = passed && guardian && !wasClearedAtStart;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className={passed ? "pal-idle" : "opacity-60"}>
          <FighterSprite fighter={fighter} size={96} title={fighter.title} />
        </div>
        <h1 className="font-pixel text-display">
          {passed ? "Dungeon Badge earned!" : timedOut ? "Time!" : "Not this time."}
        </h1>
        <p className="text-body-lg">
          <span className="font-semibold text-[var(--accent-ink)]">
            {correct}/{answered}
          </span>{" "}
          ({pct}%) — {Math.round(PASS_RATIO * 100)}% to pass
        </p>
      </div>

      {guardianJoins && (
        <div className="pixel-panel flex flex-col items-center gap-3 p-6 text-center">
          <div className="pal-idle">
            <FighterSprite
              fighter={guardianFighter(guardian)}
              size={96}
              title={`${guardian.name}, guardian of this dungeon`}
            />
          </div>
          <p className="font-pixel text-title">{guardian.name} joins your team!</p>
          <p className="prose-measure text-body text-[var(--foreground-muted)]">
            {guardian.tagline} You can send it into any battle from now on.
          </p>
        </div>
      )}

      <DialogueFrame>
        <p className="text-body">
          {passed
            ? `That's the badge. ${palName} held up under a full paper — you're in good shape for the real thing.`
            : timedOut
              ? `The clock beat you. You answered ${answered} of ${paper.length}. Pace is part of the exam — try the same paper again and watch the timer.`
              : `Close, but not yet. Work the list below and come back — the badge isn't going anywhere.`}
        </p>
      </DialogueFrame>

      <section>
        <h2 className="mb-3 font-pixel text-title">Score by skills area</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead>
              <tr className="text-left text-caption text-[var(--foreground-muted)]">
                <th className="pb-2">Skills area</th>
                <th className="pb-2">Exam weight</th>
                <th className="pb-2 text-right">Your score</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((d) => (
                <tr key={d.id} className="border-t border-black/10 dark:border-white/10">
                  <td className="py-2 pr-3">{d.name}</td>
                  <td className="py-2 pr-3 text-[var(--foreground-muted)]">
                    {d.weight}
                  </td>
                  <td className="py-2 text-right">
                    {d.total === 0 ? "—" : `${d.correct}/${d.total}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {weakest && weakest.correct / weakest.total < PASS_RATIO && (
          <p className="mt-3 text-body text-[var(--foreground-muted)]">
            Weakest area: <strong>{weakest.name}</strong> — and it carries{" "}
            {weakest.weight} of the real exam.
          </p>
        )}
      </section>

      {plan.length > 0 && (
        <section>
          <h2 className="mb-3 font-pixel text-title">
            The dungeon master recommends {plan.length} lesson
            {plan.length === 1 ? "" : "s"}
          </h2>
          <ul className="flex flex-col gap-2">
            {plan.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="pixel-panel block p-3 text-body hover:-translate-y-0.5 transition-transform"
                >
                  {item.label} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setPhase("briefing")}
          className="pixel-button rounded-md bg-[var(--accent)] px-5 py-2.5 text-body font-medium text-[var(--accent-foreground)]"
        >
          Challenge again
        </button>
        <Link
          href={`/exams/${examCode}/study`}
          className="pixel-button rounded-md bg-[var(--panel)] px-5 py-2.5 text-body font-medium"
        >
          Back to lessons
        </Link>
      </div>
    </div>
  );
}
