"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getExamContent } from "@/lib/content";
import {
  CARDS_PER_BITE,
  buildChallenge,
  moduleCards,
  shardsFor,
} from "@/lib/learningPath";
import { buildEvent } from "@/lib/learning";
import { recordLearningEvent, useLearningEvents } from "@/lib/storage";
import { saveLearningEventToDb } from "@/lib/actions";
import MenuList from "@/components/MenuList";
import ChallengeCard from "@/components/path/ChallengeCard";
import { DialogueFrame } from "@/components/DialogueBox";
import { useSfx } from "@/components/AudioProvider";
import { useBattleTransition } from "@/components/battle/BattleTransition";
import type { Challenge, LearningModule, LearningPath } from "@/lib/types";

/**
 * The learning path: pick a path, pick a module, then alternate between a few
 * flashcards and a challenge until the module is done.
 *
 * The structure — which paths exist, which modules are in them, and what they
 * are called — mirrors Microsoft Learn, so someone following the official
 * route can find their place here. The teaching is this project's own.
 *
 * Completion is recorded as a `moduleDone` learning event, which is
 * append-only and day-scoped like every other event, so finishing the same
 * module twice in an afternoon pays once. Nothing here touches the existing
 * XP terms; it appends a new one, which is the only way to add to a monotone
 * fold without breaking it.
 */

type Stage =
  | { kind: "paths" }
  | { kind: "modules"; pathId: string }
  | { kind: "module"; pathId: string; moduleId: string };

export default function LearningPathClient({
  examCode,
  paths,
}: {
  examCode: string;
  paths: LearningPath[];
}) {
  const [stage, setStage] = useState<Stage>({ kind: "paths" });
  const { run: runTransition, overlay: transitionOverlay } =
    useBattleTransition();
  const events = useLearningEvents();

  const path =
    stage.kind === "paths"
      ? null
      : (paths.find((p) => p.id === stage.pathId) ?? null);

  if (paths.length === 0) {
    return (
      <p className="text-body text-[var(--foreground-muted)]">
        No learning path has been written for this exam yet.
      </p>
    );
  }

  // --- Pick a path --------------------------------------------------------
  if (stage.kind === "paths" || !path) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-pixel text-display">Learning path</h1>
          <p className="prose-measure mt-2 text-body text-[var(--foreground-muted)]">
            The same route Microsoft Learn lays out, taught in bite-sized
            cards with a challenge every few. Pick where to start.
          </p>
        </div>

        <div className="grid gap-3">
          {paths.map((p) => {
            const done = p.modules.filter((m) =>
              moduleIsDone(events, examCode, m),
            ).length;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setStage({ kind: "modules", pathId: p.id })}
                className="menu-item flex flex-col items-start gap-1 px-4 py-3 text-left"
              >
                <span className="text-body font-medium">{p.title}</span>
                <span className="text-caption text-[var(--foreground-muted)]">
                  {p.modules.length} modules · {done} done
                </span>
              </button>
            );
          })}
        </div>

        {transitionOverlay}
      </div>
    );
  }

  // --- Pick a module ------------------------------------------------------
  if (stage.kind === "modules") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <button
            type="button"
            onClick={() => setStage({ kind: "paths" })}
            className="tap-target text-caption underline text-[var(--foreground-muted)]"
          >
            ◀ All paths
          </button>
          <h1 className="mt-2 font-pixel text-display">{path.title}</h1>
          {path.msLearnUrl && (
            <a
              href={path.msLearnUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-caption underline text-[var(--foreground-muted)] hover:text-[var(--accent-ink)]"
            >
              This path on Microsoft Learn ↗
            </a>
          )}
        </div>

        <MenuList
          ariaLabel={`Modules in ${path.title}`}
          options={path.modules.map((m) => ({
            id: m.id,
            label: m.title,
            hint: moduleIsDone(events, examCode, m)
              ? "✓ done"
              : `${m.cardIds.length} cards`,
            disabled: m.cardIds.length === 0,
          }))}
          onSelect={(moduleId) =>
            runTransition(() =>
              setStage({ kind: "module", pathId: path.id, moduleId }),
            )
          }
        />

        {transitionOverlay}
      </div>
    );
  }

  // --- Run a module -------------------------------------------------------
  const mod = path.modules.find((m) => m.id === stage.moduleId);
  if (!mod) {
    return (
      <button
        type="button"
        onClick={() => setStage({ kind: "modules", pathId: path.id })}
        className="text-body underline"
      >
        ◀ Back to modules
      </button>
    );
  }

  return (
    <ModuleRunner
      key={mod.id}
      examCode={examCode}
      path={path}
      mod={mod}
      onExit={() => setStage({ kind: "modules", pathId: path.id })}
      overlay={transitionOverlay}
    />
  );
}

function moduleIsDone(
  events: ReturnType<typeof useLearningEvents>,
  examCode: string,
  mod: LearningModule,
): boolean {
  return events.some(
    (e) => e.examCode === examCode && e.kind === "moduleDone" && e.refId === mod.id,
  );
}

/* --- The module itself ---------------------------------------------------- */

/** A card to read, or a checkpoint to clear. */
type Step =
  | { kind: "card"; index: number }
  | { kind: "challenge"; checkpoint: number }
  | { kind: "done" };

function ModuleRunner({
  examCode,
  path,
  mod,
  onExit,
  overlay,
}: {
  examCode: string;
  path: LearningPath;
  mod: LearningModule;
  onExit: () => void;
  overlay: React.ReactNode;
}) {
  const playSfx = useSfx();
  const cards = useMemo(() => moduleCards(examCode, mod), [examCode, mod]);
  const sections = useMemo(() => {
    const guide = getExamContent(examCode)?.studyGuide ?? [];
    const all = guide.flatMap((d) => d.sections);
    return mod.sectionIds
      .map((id) => all.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => !!s);
  }, [examCode, mod]);

  const [step, setStep] = useState<Step>(
    cards.length > 0 ? { kind: "card", index: 0 } : { kind: "done" },
  );
  const [revealed, setRevealed] = useState(false);
  const [shards, setShards] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);

  // Drawn lazily per checkpoint so each one is fresh, and held in state so a
  // re-render doesn't reshuffle the challenge under the trainer's hands.
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [seen] = useState(() => new Set<string>());

  const totalCheckpoints = Math.max(
    1,
    Math.ceil(cards.length / CARDS_PER_BITE),
  );

  function advanceFromCard(index: number) {
    playSfx("confirm");
    setRevealed(false);
    const next = index + 1;
    const hitCheckpoint = next % CARDS_PER_BITE === 0 || next >= cards.length;

    if (hitCheckpoint) {
      const checkpoint = Math.floor((next - 1) / CARDS_PER_BITE);
      const built = buildChallenge(examCode, mod, cards, checkpoint, seen);
      if (built) {
        setChallenge(built);
        setStep({ kind: "challenge", checkpoint });
        return;
      }
    }

    // Falling through means no challenge could be built — a one-card module
    // has nothing to match or multi-select against. The module is still
    // finished, and it still has to be RECORDED here: routing this case
    // straight to "done" without completing it is how a module could be read
    // and never counted.
    if (next >= cards.length) {
      completeModule();
      setStep({ kind: "done" });
      return;
    }
    setStep({ kind: "card", index: next });
  }

  function finishChallenge(correct: number, total: number) {
    const gained = shardsFor(correct, total);
    setShards((s) => s + gained);
    const perfect = correct === total;
    setStreak((s) => {
      const next = perfect ? s + 1 : 0;
      setBest((b) => Math.max(b, next));
      return next;
    });
    playSfx(perfect ? "levelUp" : "confirm");

    const nextCardIndex = (step.kind === "challenge" ? step.checkpoint + 1 : 1) * CARDS_PER_BITE;
    setChallenge(null);
    if (nextCardIndex >= cards.length) {
      completeModule();
      setStep({ kind: "done" });
    } else {
      setStep({ kind: "card", index: nextCardIndex });
    }
  }

  function completeModule() {
    const event = buildEvent("moduleDone", examCode, mod.id);
    if (recordLearningEvent(event)) {
      saveLearningEventToDb(event).catch((err) =>
        console.error("Failed to sync module completion", err),
      );
    }
  }

  const progress =
    step.kind === "done"
      ? 1
      : step.kind === "card"
        ? step.index / Math.max(cards.length, 1)
        : (step.checkpoint + 1) / totalCheckpoints;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <button
          type="button"
          onClick={onExit}
          className="tap-target text-caption underline text-[var(--foreground-muted)]"
        >
          ◀ {path.title}
        </button>
        <span className="text-caption text-[var(--foreground-muted)]">
          ◆ {shards} shards{streak > 1 ? ` · ${streak}× streak` : ""}
        </span>
      </div>

      <div>
        <h1 className="font-pixel text-display">{mod.title}</h1>
        <div className="hp-track mt-2">
          <div
            className="hp-fill hp-fill--good"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>

      {step.kind === "card" && (
        <>
          <p className="text-caption text-[var(--foreground-muted)]">
            Card {step.index + 1} of {cards.length}
          </p>
          <button
            type="button"
            onClick={() => {
              if (!revealed) {
                playSfx("cursor");
                setRevealed(true);
              } else {
                advanceFromCard(step.index);
              }
            }}
            className="pixel-panel flex min-h-[9rem] flex-col justify-center gap-3 p-6 text-left"
          >
            <span className="text-body-lg font-semibold">
              {cards[step.index].front}
            </span>
            {revealed ? (
              <span className="prose-measure text-body text-[var(--foreground-muted)]">
                {cards[step.index].back}
              </span>
            ) : (
              <span className="text-caption text-[var(--foreground-muted)]">
                Tap to reveal ▸
              </span>
            )}
          </button>
          {revealed && (
            <button
              type="button"
              onClick={() => advanceFromCard(step.index)}
              className="pixel-button tap-target w-fit rounded-md bg-[var(--accent)] px-5 py-2.5 text-body font-medium text-[var(--accent-foreground)]"
            >
              Got it ▶
            </button>
          )}
        </>
      )}

      {step.kind === "challenge" && challenge && (
        <DialogueFrame>
          <span className="dialogue-tab">Checkpoint</span>
          <div className="dialogue-frame-inner">
            <ChallengeCard challenge={challenge} onDone={finishChallenge} />
          </div>
        </DialogueFrame>
      )}

      {step.kind === "done" && (
        <div className="flex flex-col gap-4">
          <DialogueFrame>
            <p className="prose-measure text-body-lg">
              Module cleared — <strong>◆ {shards} shards</strong>
              {best > 1 ? `, best streak ${best}×` : ""}. That one is logged
              against your route.
            </p>
          </DialogueFrame>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onExit}
              className="pixel-button tap-target rounded-md bg-[var(--accent)] px-5 py-2.5 text-body font-medium text-[var(--accent-foreground)]"
            >
              Next module ▶
            </button>
            <Link
              href={`/exams/${examCode}/quiz?domain=${path.domainId}`}
              className="pixel-button tap-target rounded-md bg-[var(--panel)] px-5 py-2.5 text-body font-medium"
            >
              Battle this skills area
            </Link>
          </div>
        </div>
      )}

      {sections.length > 0 && step.kind !== "done" && (
        <details className="pixel-panel p-4">
          <summary className="cursor-pointer text-caption font-semibold uppercase tracking-[0.08em]">
            Read the lesson behind this module
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            {sections.map((s) => (
              <Link
                key={s.id}
                href={`/exams/${examCode}/study/${s.id}`}
                className="tap-target text-body underline text-[var(--foreground-muted)] hover:text-[var(--accent-ink)]"
              >
                {s.heading} →
              </Link>
            ))}
          </div>
        </details>
      )}

      {overlay}
    </div>
  );
}
