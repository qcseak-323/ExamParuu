"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getExamContent,
  getQuestionsByDomain,
  getDomainName,
} from "@/lib/content";
import { shuffle } from "@/lib/shuffle";
import { saveQuizAttempt } from "@/lib/storage";
import { saveQuizAttemptToDb } from "@/lib/actions";
import {
  PAL_SPECIES,
  GLITCHLING,
  GLITCHLING_PALETTE,
  stageForLevel,
  type PalType,
} from "@/lib/pals";
import { useQuizAttempts, useFlashcardProgress } from "@/lib/storage";
import { computeXp, computeLevel } from "@/lib/gamification";
import { usePreferences } from "@/lib/preferences";
import PixelSprite from "@/components/PixelSprite";
import MenuList, { type MenuOption } from "@/components/MenuList";
import { DialogueFrame } from "@/components/DialogueBox";
import { useSfx, useTrackControl } from "@/components/AudioProvider";
import type { Question, QuizResultEntry } from "@/lib/types";

const COUNT_OPTIONS = [5, 10, 20, "all"] as const;
const FEEDBACK_EMAIL = "qcseak@gmail.com";

/**
 * Battle maths.
 *
 * The opponent's health is scaled so that reaching the pass mark knocks it
 * out — winning the battle and passing the practice run are deliberately the
 * same event. Your own health allows a proportional number of misses before
 * fainting, with a floor so a five-question run isn't lost to two slips.
 */
const PLAYER_MAX_HP = 100;
const DAMAGE_PER_CORRECT = 10;
const PASS_RATIO = 0.7;
const MISS_RATIO = 0.35;
const MIN_ALLOWED_MISSES = 2;

function foeMaxHpFor(questionCount: number): number {
  return Math.max(1, Math.ceil(questionCount * PASS_RATIO)) * DAMAGE_PER_CORRECT;
}

function damagePerWrongFor(questionCount: number): number {
  const allowed = Math.max(
    MIN_ALLOWED_MISSES,
    Math.ceil(questionCount * MISS_RATIO),
  );
  return Math.ceil(PLAYER_MAX_HP / (allowed + 1));
}

type Phase = "setup" | "battle" | "finished";
type Turn = "asking" | "resolved";
type Outcome = "victory" | "defeat" | "survived";

function hpColor(ratio: number): string {
  if (ratio > 0.5) return "#3fa34d";
  if (ratio > 0.2) return "#e0a021";
  return "#c8402f";
}

function HpBar({
  label,
  current,
  max,
  level,
}: {
  label: string;
  current: number;
  max: number;
  level?: number;
}) {
  const ratio = max === 0 ? 0 : Math.max(0, current) / max;

  return (
    <div className="pixel-panel min-w-[160px] flex-1 p-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-pixel text-[9px] uppercase">{label}</span>
        {level !== undefined && (
          <span className="font-pixel text-[9px]">Lv{level}</span>
        )}
      </div>
      <div className="hp-track mt-1">
        <div
          className="hp-fill"
          style={{ width: `${ratio * 100}%`, background: hpColor(ratio) }}
        />
      </div>
      <p className="mt-1 text-right text-[10px] text-[var(--foreground-muted)]">
        {Math.max(0, current)}/{max}
      </p>
    </div>
  );
}

export default function QuizClient({
  examCode,
  palType,
  palNickname,
}: {
  examCode: string;
  palType: PalType;
  palNickname: string | null;
}) {
  const content = getExamContent(examCode);
  const searchParams = useSearchParams();
  const playSfx = useSfx();
  const setTrack = useTrackControl();
  const prefs = usePreferences();

  const allAttempts = useQuizAttempts();
  const flashcardProgress = useFlashcardProgress();
  const { level } = computeLevel(computeXp(allAttempts, flashcardProgress));

  const species = PAL_SPECIES[palType];
  const stage = stageForLevel(palType, level);
  const palName = palNickname ?? stage.name;

  const initialDomain = searchParams.get("domain") ?? "all";

  const [phase, setPhase] = useState<Phase>("setup");
  const [domainFilter, setDomainFilter] = useState<string>(initialDomain);
  const [countChoice, setCountChoice] =
    useState<(typeof COUNT_OPTIONS)[number]>(10);

  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<QuizResultEntry[]>([]);

  const [playerHp, setPlayerHp] = useState(PLAYER_MAX_HP);
  const [foeHp, setFoeHp] = useState(0);
  const [foeMaxHp, setFoeMaxHp] = useState(0);
  const [turn, setTurn] = useState<Turn>("asking");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [finalOutcome, setFinalOutcome] = useState<Outcome | null>(null);
  const [hitTarget, setHitTarget] = useState<"pal" | "foe" | null>(null);

  const correctCount = useMemo(
    () => results.filter((r) => r.correct).length,
    [results],
  );

  // Battle music while fighting; the fanfare takes over at the end.
  useEffect(() => {
    if (phase === "battle") setTrack("battle");
    else if (phase === "setup") setTrack("town");
    return () => setTrack(null);
  }, [phase, setTrack]);

  // Clear the hit flash after it has played.
  useEffect(() => {
    if (!hitTarget) return;
    const id = setTimeout(() => setHitTarget(null), 450);
    return () => clearTimeout(id);
  }, [hitTarget]);

  const availableCount = getQuestionsByDomain(examCode, domainFilter).length;

  // Not memoized: it is only ever called from a click handler, and wrapping it
  // opted the whole component out of the React Compiler's optimization.
  function startBattle() {
    const pool = shuffle(getQuestionsByDomain(examCode, domainFilter));
    const n =
      countChoice === "all"
        ? pool.length
        : Math.min(countChoice, pool.length);

    setActiveQuestions(pool.slice(0, n));
    setIndex(0);
    setSelected(null);
    setResults([]);
    setPlayerHp(PLAYER_MAX_HP);
    setFoeMaxHp(foeMaxHpFor(n));
    setFoeHp(foeMaxHpFor(n));
    setTurn("asking");
    setOutcome(null);
    setFinalOutcome(null);
    setPhase("battle");
  }

  function finish(finalResults: QuizResultEntry[], result: Outcome) {
    const correct = finalResults.filter((r) => r.correct).length;
    const attempt = {
      id: `${Date.now()}`,
      examCode,
      timestamp: Date.now(),
      domainFilter,
      // What was actually answered, which is not the same as what was drawn
      // when a battle ends early. Recording the drawn count instead would
      // understate the score of every run that ended in a faint.
      numQuestions: finalResults.length,
      correctCount: correct,
      results: finalResults,
    };

    saveQuizAttempt(attempt);
    // The whole app is behind a session now, so there is no signed-out branch
    // to guard here any more.
    saveQuizAttemptToDb(attempt).catch((err) =>
      console.error("Failed to sync battle result to account", err),
    );

    setFinalOutcome(result);
    setPhase("finished");
    setTrack(result === "defeat" ? "defeat" : "victory");
    playSfx(result === "defeat" ? "faint" : "levelUp");
  }

  function answer(optionIndex: number) {
    if (turn !== "asking") return;

    const question = activeQuestions[index];
    const isCorrect = optionIndex === question.correctIndex;

    const nextResults: QuizResultEntry[] = [
      ...results,
      {
        questionId: question.id,
        domain: question.domain,
        correct: isCorrect,
      },
    ];

    const nextFoeHp = isCorrect
      ? Math.max(0, foeHp - DAMAGE_PER_CORRECT)
      : foeHp;
    const nextPlayerHp = isCorrect
      ? playerHp
      : Math.max(0, playerHp - damagePerWrongFor(activeQuestions.length));

    let nextOutcome: Outcome | null = null;
    if (nextFoeHp <= 0) nextOutcome = "victory";
    else if (nextPlayerHp <= 0) nextOutcome = "defeat";
    else if (index + 1 >= activeQuestions.length) nextOutcome = "survived";

    setSelected(optionIndex);
    setResults(nextResults);
    setFoeHp(nextFoeHp);
    setPlayerHp(nextPlayerHp);
    setOutcome(nextOutcome);
    setTurn("resolved");
    setHitTarget(isCorrect ? "foe" : "pal");
    playSfx(isCorrect ? "correct" : "wrong");
  }

  function advance() {
    if (outcome) {
      finish(results, outcome);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setTurn("asking");
  }

  if (!content) {
    return (
      <p className="text-sm text-[var(--foreground-muted)]">
        No practice content is available for this exam yet.
      </p>
    );
  }

  const foeName =
    domainFilter === "all"
      ? `WILD ${examCode.toUpperCase()}`
      : `WILD ${getDomainName(examCode, domainFilter).toUpperCase()}`;

  // --- Setup ---------------------------------------------------------------

  if (phase === "setup") {
    const domainOptions: MenuOption[] = [
      {
        id: "all",
        label: "All skills areas",
        hint: domainFilter === "all" ? "◀ selected" : undefined,
      },
      ...content.outline.domains.map((d) => ({
        id: d.id,
        label: d.name,
        hint: domainFilter === d.id ? "◀ selected" : undefined,
      })),
    ];

    const countOptions: MenuOption[] = COUNT_OPTIONS.map((c) => ({
      id: String(c),
      label: c === "all" ? `All (${availableCount})` : `${c} questions`,
      hint: String(countChoice) === String(c) ? "◀ selected" : undefined,
    }));

    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-pixel text-xl">Battle setup</h1>

        <DialogueFrame>
          <p className="text-sm leading-relaxed">
            Tall grass rustles ahead. Pick the route you want to train on and
            how long the encounter should run, then send out {palName}.
          </p>
        </DialogueFrame>

        <section className="flex flex-col gap-2">
          <h2 className="font-pixel text-xs">Route</h2>
          <MenuList
            ariaLabel="Choose a skills area"
            options={domainOptions}
            onSelect={setDomainFilter}
          />
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-pixel text-xs">Encounter length</h2>
          <MenuList
            ariaLabel="Choose how many questions"
            columns={2}
            options={countOptions}
            onSelect={(id) =>
              setCountChoice(
                id === "all"
                  ? "all"
                  : (Number(id) as (typeof COUNT_OPTIONS)[number]),
              )
            }
          />
        </section>

        <button
          onClick={startBattle}
          disabled={availableCount === 0}
          className="pixel-button w-fit rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-50"
        >
          Send out {palName} ▶
        </button>
      </div>
    );
  }

  // --- Battle --------------------------------------------------------------

  if (phase === "battle") {
    const question = activeQuestions[index];
    const isCorrect = selected === question.correctIndex;

    const mailtoHref = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(
      `ExamReady question flag: ${question.id}`,
    )}&body=${encodeURIComponent(
      `Question (${question.id}): ${question.question}\n\nWhat's wrong with this question?\n`,
    )}`;

    const answerOptions: MenuOption[] = question.options.map((option, i) => {
      let tone: MenuOption["tone"] = "default";
      if (turn === "resolved") {
        if (i === question.correctIndex) tone = "correct";
        else if (i === selected) tone = "wrong";
        else tone = "muted";
      }
      return { id: String(i), label: option, tone };
    });

    let message: string;
    if (turn === "asking") {
      message = question.question;
    } else if (isCorrect) {
      message = `${palName} used ${species.move}! It's super effective!`;
    } else {
      message = `${palName}'s answer missed! ${foeName} struck back!`;
    }

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
          <span>
            Turn {index + 1} of {activeQuestions.length}
          </span>
          <span>{getDomainName(examCode, question.domain)}</span>
        </div>

        {/* Battle scene */}
        <div
          className={`battle-scene relative flex flex-col gap-6 p-4 ${
            hitTarget && !prefs.reducedMotion ? "scene-shake" : ""
          }`}
        >
          {/* Opponent: bar left, sprite right */}
          <div className="flex items-start justify-between gap-4">
            <HpBar label={foeName} current={foeHp} max={foeMaxHp} />
            <div
              className={
                hitTarget === "foe" && !prefs.reducedMotion ? "sprite-hit" : ""
              }
            >
              <PixelSprite
                sprite={GLITCHLING}
                palette={GLITCHLING_PALETTE}
                size={96}
                title={`${foeName}, the wild opponent`}
              />
            </div>
          </div>

          {/* Yours: sprite left facing the opponent, bar right */}
          <div className="flex items-end justify-between gap-4">
            <div
              className={
                hitTarget === "pal" && !prefs.reducedMotion
                  ? "sprite-hit"
                  : prefs.reducedMotion
                    ? ""
                    : "pal-idle"
              }
            >
              <PixelSprite
                sprite={stage.sprite}
                palette={species.palette}
                size={96}
                flip
                title={`${palName}, your ${species.label}-type ExamPal`}
              />
            </div>
            <HpBar
              label={palName}
              current={playerHp}
              max={PLAYER_MAX_HP}
              level={level}
            />
          </div>
        </div>

        {/* The question, or what just happened */}
        <DialogueFrame>
          <p className="text-sm leading-relaxed" aria-live="polite">
            {message}
          </p>
          {turn === "resolved" && (
            <p className="mt-2 text-sm text-[var(--foreground-muted)]">
              {question.explanation}
            </p>
          )}
        </DialogueFrame>

        {turn === "asking" ? (
          <MenuList
            ariaLabel="Choose your answer"
            columns={2}
            options={answerOptions}
            onSelect={(id) => answer(Number(id))}
          />
        ) : (
          <>
            <MenuList
              ariaLabel="Answer review"
              columns={2}
              options={answerOptions}
              onSelect={() => {}}
              disabled
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <a
                href={mailtoHref}
                className="text-xs underline text-[var(--foreground-muted)] hover:text-[var(--accent)]"
              >
                Report an issue with this question
              </a>
              <button
                onClick={advance}
                autoFocus
                className="pixel-button rounded-md bg-[var(--accent)] px-5 py-2 text-sm font-medium text-[var(--accent-foreground)]"
              >
                {outcome ? "See results ▶" : "Next ▶"}
              </button>
            </div>
          </>
        )}

        <p className="text-xs text-[var(--foreground-muted)]">
          Score so far: {correctCount}/{results.length}
        </p>
      </div>
    );
  }

  // --- Results -------------------------------------------------------------

  const answered = results.length;
  const missed = activeQuestions
    .slice(0, answered)
    .filter((_, i) => !results[i]?.correct);
  const pct = answered === 0 ? 0 : Math.round((correctCount / answered) * 100);

  const HEADLINE: Record<Outcome, string> = {
    victory: `${foeName} fainted!`,
    defeat: `${palName} fainted!`,
    survived: `${foeName} fled!`,
  };

  const SUBTITLE: Record<Outcome, string> = {
    victory: `${palName} saw it through. That's a passing run.`,
    defeat: `You ran out of health before the battle was won. ${palName} will be fine — take the review below and try again.`,
    survived: `You made it to the end but couldn't land the finishing blow. ${PASS_RATIO * 100}% is the mark to beat.`,
  };

  const result = finalOutcome ?? "survived";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className={result === "defeat" ? "opacity-50" : "pal-idle"}>
          <PixelSprite
            sprite={stage.sprite}
            palette={species.palette}
            size={96}
            title={`${palName}, your ${species.label}-type ExamPal`}
          />
        </div>
        <h1 className="font-pixel text-lg">{HEADLINE[result]}</h1>
        <p className="text-lg">
          You scored{" "}
          <span className="font-semibold text-[var(--accent)]">
            {correctCount}/{answered}
          </span>{" "}
          ({pct}%)
        </p>
      </div>

      <DialogueFrame>
        <p className="text-sm leading-relaxed">{SUBTITLE[result]}</p>
      </DialogueFrame>

      {missed.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="font-pixel text-sm">Review missed questions</h2>
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
          onClick={startBattle}
          className="pixel-button rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--accent-foreground)]"
        >
          Battle again
        </button>
        <button
          onClick={() => setPhase("setup")}
          className="pixel-button rounded-md bg-[var(--panel)] px-5 py-2.5 text-sm font-medium"
        >
          Change route
        </button>
      </div>
    </div>
  );
}
