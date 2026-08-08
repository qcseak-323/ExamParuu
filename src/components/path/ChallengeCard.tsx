"use client";

import { useState } from "react";
import MenuList, { type MenuOption } from "@/components/MenuList";
import { useSfx } from "@/components/AudioProvider";
import type { Challenge } from "@/lib/types";

/**
 * The checkpoint challenge, in three shapes.
 *
 * All three report the same thing to the caller — `correct` out of `total` —
 * so the player scores and rewards them identically and adding a fourth shape
 * later needs no change upstream.
 *
 * On drag and drop: it is offered, but never required. Every pairing is also
 * a plain pair of buttons — pick a definition, pick its term — because
 * drag-and-drop is unusable by keyboard, awkward on touch, and hostile to
 * anyone with a motor impairment. The drag is the flourish; the tap is the
 * interface. That is also why the drop targets are real <button>s rather than
 * divs wearing drag handlers.
 */

type Props = {
  challenge: Challenge;
  onDone: (correct: number, total: number) => void;
};

export default function ChallengeCard({ challenge, onDone }: Props) {
  if (challenge.kind === "recall") {
    return <RecallChallenge challenge={challenge} onDone={onDone} />;
  }
  if (challenge.kind === "multi") {
    return <MultiChallenge challenge={challenge} onDone={onDone} />;
  }
  return <MatchChallenge challenge={challenge} onDone={onDone} />;
}

/* --- Recall: the familiar single-answer question ------------------------- */

function RecallChallenge({
  challenge,
  onDone,
}: {
  challenge: Extract<Challenge, { kind: "recall" }>;
  onDone: (correct: number, total: number) => void;
}) {
  const playSfx = useSfx();
  const [picked, setPicked] = useState<number | null>(null);

  const options: MenuOption[] = challenge.options.map((label, i) => ({
    id: String(i),
    label,
    tone:
      picked === null
        ? "default"
        : i === challenge.correctIndex
          ? "correct"
          : i === picked
            ? "wrong"
            : "muted",
  }));

  return (
    <div className="flex flex-col gap-3">
      <p className="prose-measure text-body-lg">{challenge.prompt}</p>
      <MenuList
        ariaLabel="Choose your answer"
        columns={2}
        options={options}
        disabled={picked !== null}
        onSelect={(id) => {
          const i = Number(id);
          setPicked(i);
          playSfx(i === challenge.correctIndex ? "correct" : "wrong");
        }}
      />
      {picked !== null && (
        <>
          <p className="prose-measure text-body text-[var(--foreground-muted)]">
            {challenge.explanation}
          </p>
          <ContinueButton
            onClick={() =>
              onDone(picked === challenge.correctIndex ? 1 : 0, 1)
            }
          />
        </>
      )}
    </div>
  );
}

/* --- Multi-select: every right answer, no more --------------------------- */

function MultiChallenge({
  challenge,
  onDone,
}: {
  challenge: Extract<Challenge, { kind: "multi" }>;
  onDone: (correct: number, total: number) => void;
}) {
  const playSfx = useSfx();
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [checked, setChecked] = useState(false);

  const total = challenge.options.length;
  // Scored per option, not all-or-nothing: getting three of four right is
  // genuinely different from getting none, and a binary score would tell the
  // trainer neither.
  const score = challenge.options.filter(
    (o) => chosen.has(o.id) === o.correct,
  ).length;

  return (
    <div className="flex flex-col gap-3">
      <p className="prose-measure text-body-lg">{challenge.prompt}</p>

      <div
        role="group"
        aria-label={challenge.prompt}
        className="grid gap-2 sm:grid-cols-2"
      >
        {challenge.options.map((option) => {
          const on = chosen.has(option.id);
          const verdict = checked
            ? on === option.correct
              ? "correct"
              : "wrong"
            : null;

          return (
            <button
              key={option.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              disabled={checked}
              onClick={() => {
                playSfx("cursor");
                setChosen((s) => {
                  const next = new Set(s);
                  if (next.has(option.id)) next.delete(option.id);
                  else next.add(option.id);
                  return next;
                });
              }}
              className={`menu-item flex min-h-11 items-center gap-2 px-3 py-2.5 text-left text-body ${
                on && !checked ? "menu-item--gold" : ""
              } ${
                verdict === "correct"
                  ? "border-[var(--success)] bg-[var(--success)]/10"
                  : verdict === "wrong"
                    ? "border-[var(--danger)] bg-[var(--danger)]/10"
                    : ""
              }`}
            >
              <span aria-hidden="true" className="font-pixel text-label">
                {on ? "☑" : "☐"}
              </span>
              <span className="flex-1">{option.label}</span>
              {checked && (
                <span aria-hidden="true" className="shrink-0 text-caption">
                  {option.correct ? "✓" : ""}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!checked ? (
        <button
          type="button"
          onClick={() => {
            setChecked(true);
            playSfx(score === total ? "correct" : "wrong");
          }}
          className="pixel-button tap-target w-fit rounded-md bg-[var(--accent)] px-5 py-2.5 text-body font-medium text-[var(--accent-foreground)]"
        >
          Check answer ▶
        </button>
      ) : (
        <>
          <p className="text-body font-semibold">
            {score}/{total} correct
          </p>
          <ContinueButton onClick={() => onDone(score, total)} />
        </>
      )}
    </div>
  );
}

/* --- Match: drag a definition onto its term, or tap both ----------------- */

function MatchChallenge({
  challenge,
  onDone,
}: {
  challenge: Extract<Challenge, { kind: "match" }>;
  onDone: (correct: number, total: number) => void;
}) {
  const playSfx = useSfx();
  /** termId -> the definition's termId that was dropped on it. */
  const [placed, setPlaced] = useState<Record<string, string>>({});
  /** The definition currently picked up, by keyboard or tap. */
  const [held, setHeld] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const definitions = challenge.pairs;
  const usedIds = new Set(Object.values(placed));
  const total = challenge.pairs.length;
  const score = challenge.pairs.filter((p) => placed[p.termId] === p.termId)
    .length;

  function drop(termId: string, defId: string) {
    playSfx("confirm");
    setPlaced((prev) => {
      const next: Record<string, string> = {};
      // A definition lives in exactly one slot: dropping it somewhere new
      // vacates wherever it was, otherwise it silently duplicates.
      for (const [k, v] of Object.entries(prev)) {
        if (v !== defId) next[k] = v;
      }
      next[termId] = defId;
      return next;
    });
    setHeld(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="prose-measure text-body-lg">{challenge.prompt}</p>
      <p className="text-caption text-[var(--foreground-muted)]">
        Drag a definition onto a term — or tap one, then tap its term.
      </p>

      {/* The bank of definitions still to place. */}
      <div className="flex flex-wrap gap-2">
        {definitions
          .filter((d) => !usedIds.has(d.termId))
          .map((d) => (
            <button
              key={d.termId}
              type="button"
              draggable={!checked}
              disabled={checked}
              aria-pressed={held === d.termId}
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", d.termId);
                setHeld(d.termId);
              }}
              onClick={() => {
                playSfx("cursor");
                setHeld((h) => (h === d.termId ? null : d.termId));
              }}
              className={`menu-item max-w-[22rem] px-3 py-2 text-left text-caption ${
                held === d.termId ? "menu-item--gold" : ""
              }`}
            >
              {d.definition}
            </button>
          ))}
      </div>

      {/* One slot per term. */}
      <div className="grid gap-2">
        {challenge.pairs.map((p) => {
          const filledWith = placed[p.termId];
          const filled = definitions.find((d) => d.termId === filledWith);
          const verdict = checked
            ? filledWith === p.termId
              ? "correct"
              : "wrong"
            : null;

          return (
            <button
              key={p.termId}
              type="button"
              disabled={checked || (!held && !filledWith)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const defId = e.dataTransfer.getData("text/plain");
                if (defId) drop(p.termId, defId);
              }}
              onClick={() => {
                if (held) drop(p.termId, held);
                else if (filledWith) {
                  // Tapping a filled slot returns its definition to the bank.
                  playSfx("back");
                  setPlaced((prev) => {
                    const next = { ...prev };
                    delete next[p.termId];
                    return next;
                  });
                }
              }}
              className={`menu-item flex min-h-14 flex-col items-start gap-1 px-3 py-2 text-left ${
                verdict === "correct"
                  ? "border-[var(--success)] bg-[var(--success)]/10"
                  : verdict === "wrong"
                    ? "border-[var(--danger)] bg-[var(--danger)]/10"
                    : ""
              }`}
            >
              <span className="text-body font-semibold">{p.term}</span>
              <span className="text-caption text-[var(--foreground-muted)]">
                {filled ? filled.definition : "— drop a definition here —"}
              </span>
            </button>
          );
        })}
      </div>

      {!checked ? (
        <button
          type="button"
          disabled={Object.keys(placed).length < total}
          onClick={() => {
            setChecked(true);
            playSfx(score === total ? "correct" : "wrong");
          }}
          className="pixel-button tap-target w-fit rounded-md bg-[var(--accent)] px-5 py-2.5 text-body font-medium text-[var(--accent-foreground)] disabled:opacity-40"
        >
          Check answer ▶
        </button>
      ) : (
        <>
          <p className="text-body font-semibold">
            {score}/{total} matched
          </p>
          <ContinueButton onClick={() => onDone(score, total)} />
        </>
      )}
    </div>
  );
}

function ContinueButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pixel-button tap-target w-fit rounded-md bg-[var(--accent)] px-5 py-2.5 text-body font-medium text-[var(--accent-foreground)]"
    >
      Continue ▶
    </button>
  );
}
