"use client";

import { useState } from "react";
import PalSprite from "@/components/PalSprite";
import { useSfx } from "@/components/AudioProvider";

/**
 * The landing page's try-before-you-sign-up battle: one real-style question,
 * fully playable. A correct pick lands a hit (+XP pop); a wrong pick opens
 * the lesson, exactly like the real loop — the demo *is* the pitch.
 *
 * The question is original demo content that never leaves this file; it is
 * deliberately not drawn from the AZ-900 bank so the bank stays a surprise.
 */

const QUESTION =
  "Your team needs to run event-driven code without managing any servers. Which Azure service fits?";

const ANSWERS = [
  { letter: "A", text: "Azure Virtual Machines", correct: false },
  { letter: "B", text: "Azure Functions", correct: true },
  { letter: "C", text: "Azure Kubernetes Service", correct: false },
  { letter: "D", text: "Azure Bastion", correct: false },
];

const LESSON =
  "Azure Functions is serverless: you deploy code and Azure manages the servers. VMs and AKS still leave server management to you.";

type Phase = "idle" | "hit" | "wrong";

export default function BattleDemo() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [wrongPick, setWrongPick] = useState<number | null>(null);
  const playSfx = useSfx();

  function pick(i: number) {
    if (phase !== "idle") return;
    if (ANSWERS[i].correct) {
      setPhase("hit");
      playSfx("correct");
    } else {
      setPhase("wrong");
      setWrongPick(i);
      playSfx("wrong");
    }
  }

  function reset() {
    playSfx("confirm");
    setPhase("idle");
    setWrongPick(null);
  }

  return (
    <div>
      <p className="mb-2 text-label font-semibold uppercase tracking-[0.14em] text-[var(--foreground-soft)]">
        ▼ Try one — click an answer
      </p>

      <div className="pixel-panel overflow-hidden p-0">
        <div className="flex items-center justify-between gap-2 bg-[var(--outline)] px-4 py-2 text-caption font-semibold uppercase tracking-[0.08em] text-[#EAF2ED]">
          <span>Wild question appeared!</span>
          <span>AZ-900 · Q12/20</span>
        </div>

        <div className="p-4">
          <div className="flex items-baseline justify-between text-caption font-semibold uppercase tracking-[0.08em]">
            <span>Serverless compute</span>
            <span className="text-[var(--foreground-muted)]">Question HP</span>
          </div>
          <div className="hp-track mt-1">
            <div
              className={`hp-fill ${phase === "hit" ? "hp-fill--low" : "hp-fill--good"}`}
              style={{
                width: phase === "hit" ? "6%" : "58%",
                transition: "width 0.6s ease",
              }}
            />
          </div>

          <p className="prose-measure mt-4 text-body">{QUESTION}</p>

          <div className="mt-3 grid gap-2" role="group" aria-label="Demo answers">
            {ANSWERS.map((a, i) => {
              const resolved = phase !== "idle";
              const isWrongPick = phase === "wrong" && i === wrongPick;
              const highlight = resolved && a.correct;
              const dimmed = resolved && !a.correct && !isWrongPick;

              return (
                <button
                  key={a.letter}
                  type="button"
                  onClick={() => pick(i)}
                  disabled={resolved}
                  className={`pixel-button flex w-full items-baseline gap-3 rounded-md px-3 py-2 text-left text-body ${
                    highlight
                      ? "bg-[var(--panel)] text-[var(--success)] ring-2 ring-[var(--success-fill)]"
                      : isWrongPick
                        ? "bg-[var(--panel)] text-[var(--danger)] ring-2 ring-[var(--danger-fill)]"
                        : "bg-[var(--panel)]"
                  } ${dimmed ? "opacity-40" : ""}`}
                >
                  <span className="text-caption font-bold">
                    {highlight ? "✓" : isWrongPick ? "✗" : a.letter}
                  </span>
                  {a.text}
                </button>
              );
            })}
          </div>

          {phase === "wrong" && (
            <div className="mt-3 rounded-md border-2 border-[var(--danger-fill)] bg-black/5 p-3 dark:bg-white/5">
              <p className="text-caption font-semibold uppercase tracking-[0.08em] text-[var(--danger)]">
                Lesson unlocked
              </p>
              <p className="prose-measure mt-1 text-body text-[var(--foreground-muted)]">
                {LESSON}
              </p>
              <button
                type="button"
                onClick={reset}
                className="pixel-button mt-3 rounded-md bg-[var(--panel)] px-4 py-2 text-caption font-semibold uppercase tracking-[0.06em]"
              >
                Got it — next question ▸
              </button>
              <p className="mt-2 text-caption text-[var(--foreground-muted)]">
                The next question doesn&apos;t exist until you&apos;ve read
                this.
              </p>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3 border-t-2 border-dashed border-[var(--line)] pt-3">
            <PalSprite sheet="fire-1" size={48} title="Your companion" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between text-caption font-semibold uppercase tracking-[0.08em]">
                <span>Paruu · Lv 4</span>
                <span className="text-[var(--foreground-muted)]">XP</span>
              </div>
              <div className="hp-track mt-1">
                <div
                  className="hp-fill hp-fill--xp"
                  style={{
                    width: phase === "hit" ? "74%" : "46%",
                    transition: "width 0.6s ease 0.2s",
                  }}
                />
              </div>
              <p className="mt-1 min-h-[1.25rem] text-caption text-[var(--foreground-muted)]">
                {phase === "hit"
                  ? "Direct hit! Paruu gains 15 XP."
                  : phase === "wrong"
                    ? "Missed — read the lesson to continue."
                    : "Answer to attack."}
              </p>
            </div>
            {phase === "hit" && (
              <div className="flex shrink-0 flex-col items-center gap-1">
                <span className="xp-pop text-caption font-bold text-[var(--success)]">
                  +15 XP
                </span>
                <button
                  type="button"
                  onClick={reset}
                  className="pixel-button rounded-md bg-[var(--panel)] px-3 py-1.5 text-caption font-semibold uppercase"
                >
                  Next ▸
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
