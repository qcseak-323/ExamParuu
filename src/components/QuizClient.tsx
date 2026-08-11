"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  getExamContent,
  getQuestionsByDomain,
  getDomainName,
  learnSearchUrlForQuestion,
  relatedFlashcardsForQuestion,
  studyHrefForQuestion,
  teachingLabelForQuestion,
} from "@/lib/content";
import { shuffle } from "@/lib/shuffle";
import {
  getReviewSummary,
  isSingleAnswer,
  selectReviewQuestions,
} from "@/lib/review";
import { saveQuizAttempt } from "@/lib/storage";
import { saveQuizAttemptToDb } from "@/lib/actions";
import { GLITCHLING, GLITCHLING_PALETTE, type PalType } from "@/lib/pals";
import { useQuizAttempts, useFlashcardProgress } from "@/lib/storage";
import { computeXp, computeLevel } from "@/lib/gamification";
import { fighterRoster } from "@/lib/guardians";
import { usePreferences } from "@/lib/preferences";
import PixelSprite from "@/components/PixelSprite";
import PalSprite from "@/components/PalSprite";
import { wildParuuFor } from "@/lib/wildParuu";
import FighterSprite from "@/components/battle/FighterSprite";
import BattleEntrance from "@/components/battle/BattleEntrance";
import { useBattleTransition } from "@/components/battle/BattleTransition";
import MenuList, { type MenuOption } from "@/components/MenuList";
import DialogueBox, { DialogueFrame } from "@/components/DialogueBox";
import { useSfx, useTrackControl } from "@/components/AudioProvider";
import type {
  Flashcard,
  QuizResultEntry,
  SingleAnswerQuestion,
} from "@/lib/types";
import { ForwardGlyph } from "@/components/Glyph";

const COUNT_OPTIONS = [5, 10, 20, "all"] as const;
const FEEDBACK_EMAIL = "qcseak@gmail.com";

/**
 * Sentinel stored in `QuizAttempt.domainFilter` for a review run. Safe because
 * nothing reads that field back — it is written for the record and never
 * branched on.
 */
const REVIEW_FILTER = "review";

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

type Phase = "setup" | "entering" | "battle" | "finished";
type Turn = "asking" | "resolved";
type Outcome = "victory" | "defeat" | "survived" | "fled";

/* Storm-glass liquid: verdant when healthy, brass when worn, ember when
   critical. Gradients live in globals.css so both themes share one tube. */
function hpFillClass(ratio: number): string {
  if (ratio > 0.5) return "hp-fill--good";
  if (ratio > 0.2) return "hp-fill--warn";
  return "hp-fill--low";
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
        <span className="font-pixel text-label uppercase">{label}</span>
        {level !== undefined && (
          <span className="font-pixel text-label">Lv{level}</span>
        )}
      </div>
      <div className="hp-track mt-1">
        <div
          className={`hp-fill ${hpFillClass(ratio)}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <p className="mt-1 text-right text-caption text-[var(--foreground-muted)]">
        {Math.max(0, current)}/{max}
      </p>
    </div>
  );
}

/**
 * The vocabulary insert for practice mode: after a miss, the flashcards whose
 * terms the question was actually using appear as tap-to-reveal cards. Keyed
 * on the question id by the caller so the reveals reset every turn.
 */
function VocabFlashcards({ cards }: { cards: Flashcard[] }) {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const playSfx = useSfx();

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-pixel text-label uppercase text-[var(--foreground-muted)]">
        Vocab check
      </h2>
      {cards.map((card) => {
        const open = Boolean(revealed[card.id]);
        return (
          <button
            key={card.id}
            type="button"
            aria-expanded={open}
            onClick={() => {
              playSfx("cursor");
              setRevealed((r) => ({ ...r, [card.id]: !r[card.id] }));
            }}
            className="pixel-panel pixel-panel--stamped tap-target p-4 text-left"
          >
            <p className="text-body font-medium">{card.front}</p>
            {open ? (
              <p className="prose-measure mt-1 text-body text-[var(--foreground-muted)]">
                {card.back}
              </p>
            ) : (
              <p className="mt-1 text-caption text-[var(--foreground-muted)]">
                Tap to reveal ▸
              </p>
            )}
          </button>
        );
      })}
    </section>
  );
}

/** The collapsed pre-answer vocab drawer for practice mode. */
function PreAnswerVocab({ cards }: { cards: Flashcard[] }) {
  const [open, setOpen] = useState(false);
  const playSfx = useSfx();

  if (cards.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          playSfx("cursor");
          setOpen((o) => !o);
        }}
        className="pixel-button w-fit rounded-md bg-[var(--panel)] px-4 py-2 text-caption font-semibold uppercase tracking-[0.06em]"
      >
        Vocab check {open ? "▾" : "▸"}
      </button>
      {open && <VocabFlashcards cards={cards} />}
    </div>
  );
}

export default function QuizClient({
  examCode,
  palType,
  palNickname,
  trainerAvatar,
  trainerName,
}: {
  examCode: string;
  palType: PalType;
  palNickname: string | null;
  /** Both are for the entrance beat only — nothing here branches on them. */
  trainerAvatar: string | null;
  trainerName: string | null;
}) {
  const content = getExamContent(examCode);
  const searchParams = useSearchParams();
  const playSfx = useSfx();
  const setTrack = useTrackControl();
  const prefs = usePreferences();

  const allAttempts = useQuizAttempts();
  const flashcardProgress = useFlashcardProgress();
  const { level } = computeLevel(computeXp(allAttempts, flashcardProgress));

  // Whoever the trainer sends out: the starter by default, or any guardian
  // whose dungeon they have cleared. Chosen per battle in the setup phase.
  const roster = fighterRoster(palType, level, palNickname, allAttempts);
  const [fighterId, setFighterId] = useState("starter");
  const fighter = roster.find((f) => f.id === fighterId) ?? roster[0];
  const palName = fighter.name;

  // `?mode=review` deep-links straight into the review deck, matching the
  // existing `?domain=` seam used by the study guide's practice links.
  const initialDomain =
    searchParams.get("mode") === "review"
      ? REVIEW_FILTER
      : (searchParams.get("domain") ?? "all");

  const reviewSummary = useMemo(
    () => getReviewSummary(examCode, allAttempts),
    [examCode, allAttempts],
  );

  /**
   * Practice mode always opens on its setup phase. It used to accept `?wild=N`
   * from the setup wizard and skip straight into an auto-started battle, but
   * that staged a *wild* encounter inside practice mode — the one place wild
   * questions are never supposed to appear (WildEncounter's BATTLE_SEGMENTS).
   * Setup now opens the learning path instead and this was its only caller.
   */
  const [phase, setPhase] = useState<Phase>("setup");
  /**
   * What the encounter now playing is going to draw, held across the entrance
   * so the questions aren't shuffled until the beat is over. `only` is the
   * redemption round's fixed set; `count` overrides the length picker.
   */
  const [pending, setPending] = useState<{
    only: SingleAnswerQuestion[] | null;
    count: number | null;
  }>({ only: null, count: null });
  const [domainFilter, setDomainFilter] = useState<string>(initialDomain);
  const [countChoice, setCountChoice] =
    useState<(typeof COUNT_OPTIONS)[number]>(10);

  const [activeQuestions, setActiveQuestions] = useState<SingleAnswerQuestion[]>([]);
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
  const [paused, setPaused] = useState(false);

  // One advance per resolved turn. Rapid clicks on "Next" used to each
  // increment the index — past question 5 that walked off the end of the
  // array and crashed the page. Re-armed when the next answer resolves.
  const advanceLockRef = useRef(false);

  // The stage-change fade + whoosh, fired whenever a battle begins.
  const { run: runTransition, overlay: transitionOverlay } =
    useBattleTransition();

  const correctCount = useMemo(
    () => results.filter((r) => r.correct).length,
    [results],
  );

  // Three themes, one per beat: the standoff has its own, and BATTLE arriving
  // underneath the first question is the release. The fanfare takes over at
  // the end. This is the chain the blackout's cue hands off into — cue, then
  // intro, then battle.
  useEffect(() => {
    if (phase === "entering") setTrack("intro");
    else if (phase === "battle") setTrack("battle");
    else if (phase === "setup") setTrack("town");
    return () => setTrack(null);
  }, [phase, setTrack]);

  // Clear the hit flash after it has played. 700ms covers the staggered
  // attack bolts of an Ultimate-form strike, not just the shake.
  useEffect(() => {
    if (!hitTarget) return;
    const id = setTimeout(() => setHitTarget(null), 700);
    return () => clearTimeout(id);
  }, [hitTarget]);

  const availableCount =
    domainFilter === REVIEW_FILTER
      ? reviewSummary.dueCount
      : getQuestionsByDomain(examCode, domainFilter).length;

  /**
   * Announce the encounter. The draw is deliberately NOT done here: the
   * entrance plays first and `startBattle` runs off the back of it, so the
   * questions are shuffled at the moment the battle actually begins.
   *
   * Every way into a battle goes through this, and every one of them is
   * already wrapped in a blackout — so the full beat is dark, cue, cast, fight.
   */
  function beginBattle(only?: SingleAnswerQuestion[], count?: number) {
    setPending({ only: only ?? null, count: count ?? null });
    setPhase("entering");
  }

  // Not memoized: it is only ever called from a click handler or the
  // entrance's own timer, and wrapping it opted the whole component out of
  // the React Compiler's optimization.
  //
  // `only` runs a battle against a specific set — used by the redemption round,
  // which re-fights exactly the questions just missed. `forcedCount` overrides
  // the length picker; `?wild=N` was its only caller and is gone, so it is
  // currently always null and kept as the seam for a fixed-length battle.
  function startBattle(only: SingleAnswerQuestion[] | null, forcedCount: number | null) {
    const wanted =
      forcedCount ??
      (countChoice === "all" ? Number.MAX_SAFE_INTEGER : countChoice);

    let pool: SingleAnswerQuestion[];
    if (only) {
      pool = shuffle(only);
    } else if (domainFilter === REVIEW_FILTER) {
      // Weighted by what the trainer keeps getting wrong, not by chance.
      pool = selectReviewQuestions(examCode, allAttempts, wanted).filter(
        isSingleAnswer,
      );
    } else {
      // Practice is a battle — HP, a foe, a four-option menu — so it serves
      // the same single-answer shape the other battles do. The formats that
      // need a drag surface are the Proving's.
      pool = shuffle(
        getQuestionsByDomain(examCode, domainFilter).filter(isSingleAnswer),
      );
    }

    const n = only ? pool.length : Math.min(wanted, pool.length);

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
    setPaused(false);
    advanceLockRef.current = false;
    setPhase("battle");
  }

  function finish(finalResults: QuizResultEntry[], result: Outcome) {
    const correct = finalResults.filter((r) => r.correct).length;

    // A surrender before any answer has nothing to record — a 0-question
    // attempt would only poison the per-exam averages.
    if (finalResults.length > 0) {
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
      // The whole app is behind a session now, so there is no signed-out
      // branch to guard here any more.
      saveQuizAttemptToDb(attempt).catch((err) =>
        console.error("Failed to sync battle result to account", err),
      );
    }

    setFinalOutcome(result);
    setPaused(false);
    setPhase("finished");
    if (result === "fled") {
      setTrack("town");
      playSfx("back");
    } else {
      setTrack(result === "defeat" ? "defeat" : "victory");
      playSfx(result === "defeat" ? "faint" : "levelUp");
    }
  }

  /** Practice mode's escape hatch: end the battle, keep what was answered. */
  function surrender() {
    finish(results, "fled");
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
        chosenIndex: optionIndex,
        at: Date.now(),
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
    advanceLockRef.current = false;
    setHitTarget(isCorrect ? "foe" : "pal");
    playSfx(isCorrect ? "correct" : "wrong");
    // A miss costs health, so it should land like one.
    if (!isCorrect) playSfx("damage");
  }

  function advance() {
    // Double-fire guard — see advanceLockRef. Without it a fast double
    // click advanced twice, and past the last question that meant reading
    // `activeQuestions[index]` off the end and a blank page.
    if (advanceLockRef.current || turn !== "resolved") return;
    advanceLockRef.current = true;

    if (outcome) {
      finish(results, outcome);
      return;
    }
    setIndex((i) => Math.min(i + 1, activeQuestions.length - 1));
    setSelected(null);
    setTurn("asking");
  }

  if (!content) {
    return (
      <p className="text-body text-[var(--foreground-muted)]">
        No practice content is available for this exam yet.
      </p>
    );
  }

  /**
   * The HP bar's label, which is shouty and carries its own "WILD" because it
   * is a nameplate, not a sentence.
   */
  const foeName =
    domainFilter === REVIEW_FILTER
      ? "YOUR WEAK SPOTS"
      : domainFilter === "all"
        ? `WILD ${examCode.toUpperCase()}`
        : `WILD ${getDomainName(examCode, domainFilter).toUpperCase()}`;

  /**
   * The same opponent as something you can put in a sentence. The entrance
   * banner says "A wild ___ appeared!", and handing it `foeName` produced
   * "A wild WILD DP-600 appeared!" on production. Built from the same source
   * rather than by stripping a prefix off the label — the label is free to
   * change its shouting without silently breaking the sentence.
   */
  const foeSubject =
    domainFilter === REVIEW_FILTER
      ? "weak spot"
      : domainFilter === "all"
        ? examCode.toUpperCase()
        : getDomainName(examCode, domainFilter);

  // --- Setup ---------------------------------------------------------------

  if (phase === "setup") {
    const domainOptions: MenuOption[] = [
      // Pinned above everything else: if there is work waiting, that is the
      // route worth taking.
      {
        id: REVIEW_FILTER,
        label:
          reviewSummary.dueCount > 0
            ? `⚠ Review — ${reviewSummary.dueCount} question${reviewSummary.dueCount === 1 ? "" : "s"} due`
            : "Review — nothing due yet",
        // No "◀ selected" hint any more: the sticky gold fill says which row
        // is chosen, and saying it twice was noise.
        hint:
          reviewSummary.dueCount === 0 ? "Battle a route first" : undefined,
        disabled: reviewSummary.dueCount === 0,
      },
      {
        id: "all",
        label: "All skills areas",
      },
      ...content.outline.domains.map((d) => ({
        id: d.id,
        label: d.name,
      })),
    ];

    const countOptions: MenuOption[] = COUNT_OPTIONS.map((c) => ({
      id: String(c),
      label: c === "all" ? `All (${availableCount})` : `${c} questions`,
    }));

    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-pixel text-display">Battle setup</h1>

        <DialogueFrame>
          <p className="prose-measure text-body-lg">
            Tall grass rustles ahead. Pick the route you want to train on and
            how long the encounter should run, then send out {palName}.
          </p>
        </DialogueFrame>

        {/* Only appears once there is a choice to make — a lone starter
            doesn't need a menu of one. */}
        {roster.length > 1 && (
          <section className="flex flex-col gap-4">
            <h2 className="font-pixel text-title">Your Paruu</h2>
            <div className="flex flex-wrap items-start gap-4">
              <div className="pal-idle shrink-0 pt-1">
                <FighterSprite fighter={fighter} size={64} title={fighter.title} />
              </div>
              <div className="min-w-[240px] flex-1">
                <MenuList
                  ariaLabel="Choose your Paruu"
                  options={roster.map((f) => ({
                    id: f.id,
                    label: f.name,
                    hint: f.hint,
                  }))}
                  selectedId={fighter.id}
                  onSelect={setFighterId}
                />
              </div>
            </div>
          </section>
        )}

        <section className="flex flex-col gap-4">
          <h2 className="font-pixel text-title">Route</h2>
          <MenuList
            ariaLabel="Choose a skills area"
            options={domainOptions}
            selectedId={domainFilter}
            onSelect={setDomainFilter}
          />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-pixel text-title">Encounter length</h2>
          <MenuList
            ariaLabel="Choose how many questions"
            columns={2}
            options={countOptions}
            selectedId={String(countChoice)}
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
          onClick={() => runTransition(() => beginBattle())}
          disabled={availableCount === 0}
          className="pixel-button tap-target w-fit rounded-md bg-[var(--accent)] px-5 py-2.5 text-body font-medium text-[var(--accent-foreground)] disabled:opacity-50"
        >
          Send out {palName}
          <ForwardGlyph />
        </button>

        {transitionOverlay}
      </div>
    );
  }

  // --- Entrance ------------------------------------------------------------

  // Nothing else renders: the entrance covers the screen, and the questions
  // for this run have not been drawn yet — that happens in `startBattle`,
  // which is what the entrance calls when it is done.
  if (phase === "entering") {
    return (
      <>
        <BattleEntrance
          fighter={fighter}
          trainerAvatar={trainerAvatar}
          trainerName={trainerName}
          foeName={foeSubject}
          foeParuu={wildParuuFor(examCode)}
          onDone={() => startBattle(pending.only, pending.count)}
        />
        {transitionOverlay}
      </>
    );
  }

  // --- Battle --------------------------------------------------------------

  if (phase === "battle") {
    const question = activeQuestions[index];
    const isCorrect = selected === question.correctIndex;

    // Opens in a new tab on purpose: reading mid-battle should not cost the run.
    const studyHref = studyHrefForQuestion(question);
    const teachingLabel = teachingLabelForQuestion(question);

    const mailtoHref = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(
      `ExamParuu question flag: ${question.id}`,
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

    /**
     * The teaching beat.
     *
     * On a miss this walks: what happened → why the right answer is right →
     * why the one you picked isn't. Spoken by your pal rather than narrated
     * at you, because being corrected by a companion lands differently from
     * being marked by a grader.
     */
    const resolvedLines: string[] = isCorrect
      ? [
          `${palName} used ${fighter.move}! It's super effective!`,
          question.explanation,
        ]
      : [
          `${palName}'s answer missed! ${foeName} struck back!`,
          `The move that lands here is "${question.options[question.correctIndex]}". ${question.explanation}`,
          selected !== null
            ? `"${question.options[selected]}" looked right, but it isn't what the question was asking for. Worth remembering — this one catches people out.`
            : "Take a moment with that one before pressing on.",
        ];

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 text-caption text-[var(--foreground-muted)]">
          <span>
            Turn {index + 1} of {activeQuestions.length}
          </span>
          <span className="flex items-center gap-3">
            <span>{getDomainName(examCode, question.domain)}</span>
            {/* Practice has no clock, so pausing is really about having a
                guilt-free way out mid-battle. */}
            <button
              type="button"
              onClick={() => {
                playSfx("back");
                setPaused(true);
              }}
              className="pixel-button rounded-md bg-[var(--panel)] px-3 py-1 text-caption font-semibold"
            >
              ❚❚ Pause
            </button>
          </span>
        </div>

        {paused && (
          <div className="start-overlay">
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Battle paused"
              className="pixel-panel flex w-full max-w-sm flex-col gap-4 p-6"
            >
              <p className="text-center font-pixel text-display">Paused</p>
              <p className="text-center text-body text-[var(--foreground-muted)]">
                The wild {foeName} waits. Nothing is lost while you&apos;re
                here.
              </p>
              <button
                type="button"
                onClick={() => {
                  playSfx("confirm");
                  setPaused(false);
                }}
                className="pixel-button rounded-md bg-[var(--accent)] px-5 py-2.5 text-body font-medium text-[var(--accent-foreground)]"
              >
                Resume battle
                <ForwardGlyph />
              </button>
              <button
                type="button"
                onClick={surrender}
                className="pixel-button rounded-md bg-[var(--panel)] px-5 py-2.5 text-body font-medium"
              >
                Surrender — got away safely
              </button>
            </div>
          </div>
        )}

        {/* Battle scene */}
        <div
          className={`battle-scene relative flex flex-col gap-6 p-4 ${
            hitTarget && !prefs.reducedMotion ? "scene-shake" : ""
          }`}
        >
          {/* The attack: bolts fly from your side to the foe's. Colour and
              shape follow the attacker's line; count and size follow its
              form — base, super, ultimate. */}
          {hitTarget === "foe" && !prefs.reducedMotion && (
            <span aria-hidden="true">
              {Array.from({ length: fighter.formIndex + 1 }).map((_, i) => (
                <span
                  key={i}
                  className={`attack-bolt attack-bolt--${fighter.fx}`}
                  style={{
                    /* 16 / 24 / 32 — each divides the 96px source exactly
                       (6x, 4x, 3x). The old 5px step gave 16/21/26, and a
                       fractional nearest-neighbour scale drops pixel rows
                       unevenly, which shimmers most on a moving sprite. */
                    width: `${16 + fighter.formIndex * 8}px`,
                    height: `${16 + fighter.formIndex * 8}px`,
                    animationDelay: `${i * 90}ms`,
                  }}
                />
              ))}
            </span>
          )}

          {/* Opponent: bar left, sprite right */}
          <div className="flex items-start justify-between gap-4">
            <HpBar label={foeName} current={foeHp} max={foeMaxHp} />
            <div
              className={`battle-platform ${
                hitTarget === "foe" && !prefs.reducedMotion ? "sprite-hit" : ""
              } ${
                outcome === "victory" && turn === "resolved" ? "foe-faint" : ""
              }`}
            >
              {/* The route's own Paruu where one has been drawn; the
                  Glitchling everywhere else, so an exam with no art yet stays
                  playable rather than rendering a missing sheet. */}
              {wildParuuFor(examCode) ? (
                <PalSprite
                  sheet={wildParuuFor(examCode)!.sheet}
                  flip={wildParuuFor(examCode)!.flip}
                  size={96}
                  title={`${foeName}, the wild opponent`}
                />
              ) : (
                <PixelSprite
                  sprite={GLITCHLING}
                  palette={GLITCHLING_PALETTE}
                  size={96}
                  title={`${foeName}, the wild opponent`}
                />
              )}
            </div>
          </div>

          {/* Yours: sprite left facing the opponent, bar right */}
          <div className="flex items-end justify-between gap-4">
            <div
              className={`battle-platform ${
                hitTarget === "pal" && !prefs.reducedMotion
                  ? "sprite-hit"
                  : prefs.reducedMotion
                    ? ""
                    : "pal-idle"
              }`}
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
              current={playerHp}
              max={PLAYER_MAX_HP}
              level={level}
            />
          </div>
        </div>

        {turn === "asking" ? (
          <>
            <DialogueFrame>
              <p className="prose-measure text-body-lg" aria-live="polite">
                {question.question}
              </p>
            </DialogueFrame>

            <MenuList
              ariaLabel="Choose your answer"
              columns={2}
              options={answerOptions}
              onSelect={(id) => answer(Number(id))}
            />

            {/* Practice-mode privilege: the vocabulary is available BEFORE
                committing an answer. Collapsed by default so it's a choice,
                not a spoiler. Keyed on the question so it re-collapses. */}
            <PreAnswerVocab
              key={`pre-${question.id}`}
              cards={relatedFlashcardsForQuestion(question)}
            />
          </>
        ) : (
          <>
            {/* The advance controls are the DialogueBox's `footer`, which it
                renders only once the final line has been read. That is what
                makes this a teaching beat rather than a footnote: there is no
                "Next" to press until the explanation has actually been seen. */}
            <DialogueBox
              key={question.id}
              speaker={palName.toUpperCase()}
              lines={resolvedLines}
              footer={
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex flex-wrap gap-3">
                    <a
                      href={studyHref}
                      target="_blank"
                      rel="noreferrer"
                      className="tap-target text-caption underline text-[var(--foreground-muted)] hover:text-[var(--accent-ink)]"
                    >
                      Read “{teachingLabel}” ↗
                    </a>
                    <a
                      href={learnSearchUrlForQuestion(question)}
                      target="_blank"
                      rel="noreferrer"
                      className="tap-target text-caption underline text-[var(--foreground-muted)] hover:text-[var(--accent-ink)]"
                    >
                      Microsoft Learn ↗
                    </a>
                  </span>
                  <button
                    onClick={advance}
                    className="pixel-button tap-target rounded-md bg-[var(--accent)] px-5 py-2 text-body font-medium text-[var(--accent-foreground)]"
                  >
                    {outcome ? "See results" : "Next"}
                    <ForwardGlyph />
                  </button>
                </div>
              }
            />

            {/* NOT keyed `question.id`: the DialogueBox above already owns
                that key, and duplicate sibling keys broke reconciliation —
                stale dialogue boxes stacked up instead of unmounting. */}
            {!isCorrect && (
              <VocabFlashcards
                key={`vocab-${question.id}`}
                cards={relatedFlashcardsForQuestion(question)}
              />
            )}

            <MenuList
              ariaLabel="Answer review"
              columns={2}
              options={answerOptions}
              onSelect={() => {}}
              disabled
            />

            <a
              href={mailtoHref}
              className="tap-target text-caption underline text-[var(--foreground-muted)] hover:text-[var(--accent-ink)]"
            >
              Report an issue with this question
            </a>
          </>
        )}

        <p className="text-caption text-[var(--foreground-muted)]">
          Score so far: {correctCount}/{results.length}
        </p>

        {transitionOverlay}
      </div>
    );
  }

  // --- Results -------------------------------------------------------------

  const answered = results.length;
  // Keyed on questionId rather than array position. The two agree today, but
  // pairing a question with someone's score by index is the kind of thing that
  // silently mismatches the moment anything reorders.
  const missedIds = new Set(
    results.filter((r) => !r.correct).map((r) => r.questionId),
  );
  const missed = activeQuestions.filter((q) => missedIds.has(q.id));
  const pct = answered === 0 ? 0 : Math.round((correctCount / answered) * 100);

  const HEADLINE: Record<Outcome, string> = {
    victory: `${foeName} fainted!`,
    defeat: `${palName} fainted!`,
    survived: `${foeName} fled!`,
    fled: "Got away safely!",
  };

  const SUBTITLE: Record<Outcome, string> = {
    victory: `${palName} saw it through. That's a passing run.`,
    defeat: `You ran out of health before the battle was won. ${palName} will be fine — take the review below and try again.`,
    survived: `You made it to the end but couldn't land the finishing blow. ${PASS_RATIO * 100}% is the mark to beat.`,
    fled: `You broke off the battle. Everything you answered still counts — come back when you're ready.`,
  };

  const result = finalOutcome ?? "survived";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className={result === "defeat" ? "opacity-50" : "pal-idle"}>
          <FighterSprite fighter={fighter} size={96} title={fighter.title} />
        </div>
        <h1 className="font-pixel text-display">{HEADLINE[result]}</h1>
        <p className="text-body-lg">
          You scored{" "}
          <span className="font-semibold text-[var(--accent-ink)]">
            {correctCount}/{answered}
          </span>{" "}
          ({pct}%)
        </p>
      </div>

      <DialogueFrame>
        <p className="prose-measure text-body-lg">{SUBTITLE[result]}</p>
      </DialogueFrame>

      {missed.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="font-pixel text-title">Review missed questions</h2>

          {/* The whole point of the results screen: turn a list of failures
              into somewhere to go. Previously this block rendered no links at
              all, so a missed question was simply a dead end. */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => runTransition(() => beginBattle(missed))}
              className="pixel-button tap-target rounded-md bg-[var(--accent)] px-5 py-2.5 text-body font-medium text-[var(--accent-foreground)]"
            >
              Redemption round ({missed.length})
              <ForwardGlyph />
            </button>
            <Link
              href={`/exams/${examCode}/study`}
              className="pixel-button tap-target rounded-md bg-[var(--panel)] px-5 py-2.5 text-body font-medium"
            >
              Study these topics
            </Link>
          </div>

          {missed.map((q) => (
            <div key={q.id} className="pixel-panel p-4 text-body">
              <p className="prose-measure font-medium">{q.question}</p>
              {/* Was `text-emerald-700 dark:text-emerald-400`. Raw palette
                  steps like that did not flip with the theme the way the rest
                  of the UI does; `--success` does. */}
              <p className="prose-measure mt-2 text-[var(--success)]">
                Correct answer: {q.options[q.correctIndex]}
              </p>
              <p className="prose-measure mt-1 text-[var(--foreground-muted)]">
                {q.explanation}
              </p>
              <span className="mt-2 flex flex-wrap gap-3">
                <Link
                  href={studyHrefForQuestion(q)}
                  className="tap-target inline-flex text-caption underline text-[var(--foreground-muted)] hover:text-[var(--accent-ink)]"
                >
                  Read “{teachingLabelForQuestion(q)}” →
                </Link>
                <a
                  href={learnSearchUrlForQuestion(q)}
                  target="_blank"
                  rel="noreferrer"
                  className="tap-target inline-flex text-caption underline text-[var(--foreground-muted)] hover:text-[var(--accent-ink)]"
                >
                  Microsoft Learn ↗
                </a>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => runTransition(() => beginBattle())}
          className="pixel-button tap-target rounded-md bg-[var(--accent)] px-5 py-2.5 text-body font-medium text-[var(--accent-foreground)]"
        >
          Battle again
        </button>
        <button
          onClick={() => setPhase("setup")}
          className="pixel-button tap-target rounded-md bg-[var(--panel)] px-5 py-2.5 text-body font-medium"
        >
          Change route
        </button>
      </div>

      {transitionOverlay}
    </div>
  );
}
