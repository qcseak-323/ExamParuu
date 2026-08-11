"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getCatalogEntry, getExamContent } from "@/lib/content";
import { wildXpFor } from "@/lib/gamification";
import { buildEvent } from "@/lib/learning";
import { recordLearningEvent } from "@/lib/storage";
import { saveLearningEventToDb } from "@/lib/actions";
import { GLITCHLING, GLITCHLING_PALETTE } from "@/lib/pals";
import PixelSprite from "@/components/PixelSprite";
import MenuList, { type MenuOption } from "@/components/MenuList";
import { useSfx } from "@/components/AudioProvider";
import { isSingleAnswer } from "@/lib/review";
import type { SingleAnswerQuestion } from "@/lib/types";

/**
 * Wild questions: while a trainer walks a route (any exam page that is NOT a
 * battle), one occasionally jumps out of the tall grass. A short clock runs —
 * 10/15/20 seconds by the exam's tier — and answering in time pays XP scaled
 * to the tier, recorded as a `wildWin` learning event (day-scoped id, so the
 * same question can't be farmed; the XP term is appended in gamification.ts).
 *
 * Deliberately a corner card rather than a modal: it interrupts like a wild
 * encounter, not like a system dialog, and "Run away" always works.
 */

const MIN_DELAY_MS = 25_000;
const MAX_DELAY_MS = 70_000;
const COOLDOWN_MS = 45_000;

/**
 * Surfaces where a wild question must never interrupt.
 *
 * `path` is here for a different reason than the battle routes. A learning
 * path already interrupts you on purpose — a checkpoint every few cards is
 * the whole mechanic — so a timed wild question landing on top of one is two
 * interruptions competing, and the drag-and-drop formats are precisely the
 * ones a clock in the corner makes unusable. Observed on production: a wild
 * question opened over an in-progress match grid.
 */
const BATTLE_SEGMENTS = /\/(quiz|gym|exam|path)(\/|$)/;

function timeLimitMs(examCode: string): number {
  const level = getCatalogEntry(examCode)?.msLevel;
  if (level === "Fundamentals") return 10_000;
  if (level === "Associate") return 15_000;
  return 20_000;
}

type Verdict = "correct" | "wrong" | "timeout" | null;

export default function WildEncounter({ examCode }: { examCode: string }) {
  const pathname = usePathname();
  const playSfx = useSfx();

  const [question, setQuestion] = useState<SingleAnswerQuestion | null>(null);
  const [verdict, setVerdict] = useState<Verdict>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const deadlineRef = useRef<number | null>(null);
  const armTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const battling = BATTLE_SEGMENTS.test(pathname);
  const totalMs = timeLimitMs(examCode);
  const xp = wildXpFor(examCode);

  const close = useCallback(() => {
    setQuestion(null);
    setVerdict(null);
    deadlineRef.current = null;
  }, []);

  // Navigating into a battle dismisses an open encounter. Adjusted during
  // render (the sanctioned derived-state pattern, as DialogueBox does) so
  // the effect below never has to set state synchronously.
  const [prevBattling, setPrevBattling] = useState(battling);
  if (prevBattling !== battling) {
    setPrevBattling(battling);
    if (battling) {
      // The stale deadline ref is harmless: the clock effect only runs
      // while a question is open, and arming a new one resets it.
      setQuestion(null);
      setVerdict(null);
    }
  }

  // Arm the next encounter whenever there isn't one showing and we're not on
  // a battle page.
  useEffect(() => {
    if (battling) return;
    if (question) return;

    // Single-answer only: a wild encounter answers through a four-option
    // menu inside a battle scene, which cannot hold a matching grid.
    const bank = (getExamContent(examCode)?.questions ?? []).filter(
      isSingleAnswer,
    );
    if (bank.length === 0) return;

    const delay =
      MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
    armTimerRef.current = setTimeout(() => {
      const drawn = bank[Math.floor(Math.random() * bank.length)];
      setQuestion(drawn);
      setVerdict(null);
      deadlineRef.current = Date.now() + totalMs;
      setRemainingMs(totalMs);
      playSfx("damage");
    }, delay);

    return () => {
      if (armTimerRef.current) clearTimeout(armTimerRef.current);
    };
  }, [battling, question, examCode, totalMs, playSfx, close]);

  // The encounter clock.
  useEffect(() => {
    if (!question || verdict) return;
    const tick = () => {
      const deadline = deadlineRef.current;
      if (deadline === null) return;
      const left = deadline - Date.now();
      setRemainingMs(left);
      if (left <= 0) {
        setVerdict("timeout");
        playSfx("back");
      }
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [question, verdict, playSfx]);

  // Cooldown after an encounter resolves and is closed: handled by the arm
  // effect's own delay — plus this extra hold so back-to-back pop-ups can't
  // happen right after a resolve.
  useEffect(() => {
    if (!verdict) return;
    const id = setTimeout(close, COOLDOWN_MS);
    return () => clearTimeout(id);
  }, [verdict, close]);

  if (!question) return null;

  function answer(optionIndex: number) {
    if (!question || verdict) return;
    if (optionIndex === question.correctIndex) {
      setVerdict("correct");
      playSfx("correct");
      const event = buildEvent("wildWin", examCode, question.id);
      if (recordLearningEvent(event)) {
        saveLearningEventToDb(event).catch((err) =>
          console.error("Failed to sync wild win", err),
        );
      }
    } else {
      setVerdict("wrong");
      playSfx("wrong");
    }
  }

  const options: MenuOption[] = question.options.map((option, i) => {
    let tone: MenuOption["tone"] = "default";
    if (verdict) {
      if (i === question.correctIndex) tone = "correct";
      else tone = "muted";
    }
    return { id: String(i), label: option, tone };
  });

  const ratio = Math.max(0, remainingMs) / totalMs;

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[min(24rem,calc(100vw-2rem))]">
      <div className="dialogue-frame">
        <span className="dialogue-tab dialogue-tab--danger">
          Wild question!
        </span>
        <div className="dialogue-frame-inner flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <PixelSprite
              sprite={GLITCHLING}
              palette={GLITCHLING_PALETTE}
              size={48}
              title="A wild question"
            />
            <div className="min-w-0 flex-1">
              <p className="text-caption font-semibold uppercase tracking-[0.08em]">
                {examCode.toUpperCase()} · worth {xp} XP
              </p>
              <div className="hp-track mt-1">
                <div
                  className={`hp-fill ${
                    ratio > 0.5
                      ? "hp-fill--good"
                      : ratio > 0.2
                        ? "hp-fill--warn"
                        : "hp-fill--low"
                  }`}
                  style={{ width: `${ratio * 100}%` }}
                />
              </div>
            </div>
          </div>

          <p className="text-body">{question.question}</p>

          <MenuList
            ariaLabel="Answer the wild question"
            options={options}
            onSelect={(id) => answer(Number(id))}
            disabled={verdict !== null}
          />

          {verdict && (
            <p
              className={`text-body font-semibold ${
                verdict === "correct"
                  ? "text-[var(--success)]"
                  : "text-[var(--danger)]"
              }`}
              aria-live="polite"
            >
              {verdict === "correct"
                ? `Caught it! +${xp} XP.`
                : verdict === "timeout"
                  ? "Too slow — it fled into the grass."
                  : `It got away. The answer was "${question.options[question.correctIndex]}".`}
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              playSfx("back");
              close();
            }}
            className="pixel-button w-fit rounded-md bg-[var(--panel)] px-4 py-1.5 text-caption font-semibold"
          >
            {verdict ? "Close" : "Run away"}
          </button>
        </div>
      </div>
    </div>
  );
}
