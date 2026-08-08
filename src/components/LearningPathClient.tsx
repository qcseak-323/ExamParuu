"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getExamContent } from "@/lib/content";
import {
  CARDS_PER_BITE,
  buildChallenge,
  moduleCards,
  shardsFor,
} from "@/lib/learningPath";
import { isPathCleared } from "@/lib/gamification";
import { buildEvent } from "@/lib/learning";
import { recordLearningEvent, useLearningEvents } from "@/lib/storage";
import { saveLearningEventToDb } from "@/lib/actions";
import MenuList from "@/components/MenuList";
import ChallengeCard from "@/components/path/ChallengeCard";
import { DialogueFrame } from "@/components/DialogueBox";
import { useSfx, useTrackControl } from "@/components/AudioProvider";
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
  initialPathId = null,
}: {
  examCode: string;
  paths: LearningPath[];
  /** From `?path=`, already validated server-side. Opens straight onto it. */
  initialPathId?: string | null;
}) {
  const [stage, setStage] = useState<Stage>(
    initialPathId
      ? { kind: "modules", pathId: initialPathId }
      : { kind: "paths" },
  );
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
            const sealed = isPathCleared(examCode, p, events);
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
                  {/* The seal is a text marker, not a border/box-shadow
                      modifier — those need a `:hover`-qualified twin to
                      survive `.menu-item:hover:not(:disabled)`. */}
                  {sealed && (
                    <span className="font-semibold text-[var(--accent-ink)]">
                      {" "}
                      · ★ path sealed
                    </span>
                  )}
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
  const setTrack = useTrackControl();
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
  /** Still true only while every checkpoint so far came back perfect. */
  const [flawless, setFlawless] = useState(true);
  /** A run with no checkpoints at all has proven nothing — not "perfect". */
  const [served, setServed] = useState(false);
  /** The last checkpoint's reward, re-popped by keying on its checkpoint. */
  const [lastGain, setLastGain] = useState<{
    amount: number;
    checkpoint: number;
  } | null>(null);

  // Drawn lazily per checkpoint so each one is fresh, and held in state so a
  // re-render doesn't reshuffle the challenge under the trainer's hands.
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [seen] = useState(() => new Set<string>());

  const totalCheckpoints = Math.max(
    1,
    Math.ceil(cards.length / CARDS_PER_BITE),
  );

  // The victory beat for finishing a module — same effect shape as the
  // battle screens' track switching, so leaving the runner mid-fanfare
  // still silences it via the cleanup.
  const done = step.kind === "done";
  useEffect(() => {
    if (!done) return;
    setTrack("victory");
    return () => setTrack(null);
  }, [done, setTrack]);

  function advanceFromCard(index: number) {
    playSfx("confirm");
    setRevealed(false);
    const next = index + 1;
    const hitCheckpoint = next % CARDS_PER_BITE === 0 || next >= cards.length;

    if (hitCheckpoint) {
      const checkpoint = Math.floor((next - 1) / CARDS_PER_BITE);
      const built = buildChallenge(examCode, mod, cards, checkpoint, seen);
      if (built) {
        setServed(true);
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
      completeModule(flawless && served);
      setStep({ kind: "done" });
      return;
    }
    setStep({ kind: "card", index: next });
  }

  function finishChallenge(correct: number, total: number) {
    const gained = shardsFor(correct, total);
    setShards((s) => s + gained);
    const perfect = correct === total;
    if (!perfect) setFlawless(false);
    setStreak((s) => {
      const next = perfect ? s + 1 : 0;
      setBest((b) => Math.max(b, next));
      return next;
    });
    setLastGain({
      amount: gained,
      checkpoint: step.kind === "challenge" ? step.checkpoint : 0,
    });
    playSfx(perfect ? "levelUp" : "confirm");

    const nextCardIndex = (step.kind === "challenge" ? step.checkpoint + 1 : 1) * CARDS_PER_BITE;
    setChallenge(null);
    if (nextCardIndex >= cards.length) {
      // `flawless` cannot be read alone here: this checkpoint's own verdict
      // hasn't committed to state yet, and it is the one most likely to have
      // broken the run. Fold it in locally instead.
      completeModule(flawless && perfect);
      setStep({ kind: "done" });
    } else {
      setStep({ kind: "card", index: nextCardIndex });
    }
  }

  function completeModule(perfectRun: boolean) {
    const event = buildEvent("moduleDone", examCode, mod.id);
    if (recordLearningEvent(event)) {
      saveLearningEventToDb(event).catch((err) =>
        console.error("Failed to sync module completion", err),
      );
    }
    // A flawless run records a second, separate event. Its `kind:` prefix
    // keeps the id distinct from moduleDone's, and day-scoping caps farming.
    // A duplicate (recordLearningEvent → false) deliberately gates nothing:
    // the done screen still celebrates a repeat run.
    if (perfectRun) {
      const bonus = buildEvent("modulePerfect", examCode, mod.id);
      if (recordLearningEvent(bonus)) {
        saveLearningEventToDb(bonus).catch((err) =>
          console.error("Failed to sync perfect-run bonus", err),
        );
      }
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
        <div className="flex items-center gap-2">
          <span className="relative text-caption text-[var(--foreground-muted)]">
            {/* Re-keyed per checkpoint so the pop restarts; the checkpoint
                index is the key on purpose — no Date.now() in render. */}
            {lastGain && (
              <span
                key={lastGain.checkpoint}
                aria-hidden="true"
                className="xp-pop absolute -top-4 right-0 text-caption font-bold text-[var(--success)]"
              >
                +{lastGain.amount} ◆
              </span>
            )}
            ◆ {shards} shards{streak > 1 ? ` · ${streak}× streak` : ""}
          </span>
          {/* 15 = shardsFor's ceiling per checkpoint: 10 base + 5 perfect. */}
          <div className="hp-track w-20 shrink-0" aria-hidden="true">
            <div
              className="hp-fill hp-fill--xp"
              style={{
                width: `${Math.min(
                  100,
                  Math.round((shards / (totalCheckpoints * 15)) * 100),
                )}%`,
              }}
            />
          </div>
        </div>
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
