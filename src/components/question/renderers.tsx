"use client";

import { useRef, useState } from "react";
import MenuList, { type MenuOption } from "@/components/MenuList";
import { useSfx } from "@/components/AudioProvider";
import { usePreferences } from "@/lib/preferences";
import type { SubmittedAnswer } from "@/lib/review";
import { ForwardGlyph, TickGlyph, CrossGlyph } from "@/components/Glyph";

/**
 * The answer bodies, shared by the learning-path checkpoint and the exam.
 *
 * These were `ChallengeCard`'s internals until the exam needed the same
 * shapes. Nothing about how they behave changed in the move — the checkpoint
 * still gets partial credit, the exam grades all-or-nothing on top of the same
 * numbers — because two implementations of a drag-and-drop grid is exactly the
 * kind of duplication that drifts.
 *
 * The rule they all follow, inherited from `ChallengeCard`: **drag, drop and
 * swipe are offered, never required.** Every pairing is also a pair of
 * buttons, every swipe is also ✗/✓ and the arrow keys, drop targets are real
 * `<button>`s rather than divs wearing drag handlers, and every verdict is
 * announced in words rather than carried by motion alone. A pointer gesture is
 * unusable by keyboard, awkward on touch, and hostile to anyone with a motor
 * impairment.
 *
 * Each body reports the same triple, so a caller can score it either way and
 * store what was actually submitted.
 */
export type RendererResult = {
  correct: number;
  total: number;
  /**
   * What was submitted, for the exam to store. Null where the caller has
   * nothing to record — a learning-path checkpoint keeps no answer history, so
   * it does not pay the cost of describing one.
   */
  answer: SubmittedAnswer | null;
};

export type OnDone = (result: RendererResult) => void;

/**
 * What every body accepts on top of its own content.
 *
 * ── `mode` ──
 *
 * Three states, because the three callers want three different amounts, and a
 * single boolean was quietly conflating them:
 *
 *   `teach`   verdict, explanation and a Check/Continue button. The learning
 *             path, and the default.
 *   `verdict` mark it right or wrong, but no explanation and no buttons. The
 *             practice battle, whose Paruu speaks the explanation itself — a
 *             body that also printed it would say everything twice.
 *   `input`   a pure input: collect an answer, show what was picked, judge
 *             nothing. The Proving's briefing promises "No feedback until the
 *             end", so an option turning green mid-paper breaks the format.
 *
 * Only `teach` renders buttons. In the other two the caller owns what happens
 * next — the exam's navigator, or the battle's attack.
 *
 * ── `value` / `onChange` ──
 *
 * Supply both to control the body from outside. The exam must, because its
 * navigator unmounts a question when you jump away and remounts it when you
 * come back; uncontrolled state would silently discard the answer. Omit both
 * and the body keeps its own state, which is what the learning path wants.
 */
export type AnswerMode = "teach" | "verdict" | "input";

type Controllable<T> = {
  mode?: AnswerMode;
  value?: T;
  onChange?: (value: T) => void;
};

/**
 * Internal state, unless the caller passed an `onChange` to own it.
 *
 * `onChange` alone decides, not the presence of a `value`. A caller storing
 * drafts for sixty questions starts every one of them undefined, and keying
 * off `value` there would leave the body quietly uncontrolled — writing to
 * internal state, never calling `onChange`, and losing the answer the moment
 * the navigator unmounted it. Undefined simply means "not answered yet", so it
 * reads as `initial`.
 *
 * Deliberately not a "controlled or throw" API: a body that keeps its own
 * state when nobody claims it is what lets one component serve a checkpoint
 * and an exam without either caller learning the other's rules.
 */
function useControllable<T>(
  value: T | undefined,
  onChange: ((value: T) => void) | undefined,
  initial: T,
): [T, (next: T) => void] {
  const [internal, setInternal] = useState<T>(initial);
  const current = onChange ? (value ?? initial) : internal;
  const set = (next: T) => {
    if (onChange) onChange(next);
    else setInternal(next);
  };
  return [current, set];
}

export function ContinueButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pixel-button tap-target w-fit rounded-md bg-[var(--accent)] px-5 py-2.5 text-body font-medium text-[var(--accent-foreground)]"
    >
      Continue
      <ForwardGlyph />
    </button>
  );
}

function CheckButton({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="pixel-button tap-target w-fit rounded-md bg-[var(--accent)] px-5 py-2.5 text-body font-medium text-[var(--accent-foreground)] disabled:opacity-40"
    >
      Check answer
      <ForwardGlyph />
    </button>
  );
}

/* --- Single answer -------------------------------------------------------- */

export function SingleChoiceBody({
  prompt,
  options,
  correctIndex,
  explanation,
  mode = "teach",
  value,
  onChange,
  onDone,
}: {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  onDone: OnDone;
} & Controllable<number | null>) {
  const playSfx = useSfx();
  const [picked, setPicked] = useControllable(value, onChange, null);

  // Without a verdict every row stays `default`, which is what lets MenuList's
  // own committed-choice state show through — a filled gold row that persists
  // after the cursor moves on. Tone rows deliberately suppress it, because a
  // gold wash over a correct/wrong row would hide the verdict.
  const menu: MenuOption[] = options.map((label, i) => ({
    id: String(i),
    label,
    tone: mode === "input"
      ? "default"
      : picked === null
        ? "default"
        : i === correctIndex
          ? "correct"
          : i === picked
            ? "wrong"
            : "muted",
  }));

  return (
    <div className="flex flex-col gap-3">
      <p className="prose-measure text-body-lg">{prompt}</p>
      <MenuList
        ariaLabel="Choose your answer"
        columns={2}
        options={menu}
        selectedId={
          mode === "input" && picked !== null ? String(picked) : undefined
        }
        // Locked after answering only when a verdict is on screen. In the exam
        // an answer stays changeable until the paper ends.
        disabled={mode !== "input" && picked !== null}
        onSelect={(id) => {
          const i = Number(id);
          setPicked(i);
          if (mode !== "input") playSfx(i === correctIndex ? "correct" : "wrong");
          else playSfx("cursor");
        }}
      />
      {/* Explanation and Continue are the teaching beat. In `verdict` the
          battle's Paruu speaks the explanation, so printing it here would say
          everything twice; in `input` nothing is judged at all. */}
      {mode === "teach" && picked !== null && (
        <>
          <p className="prose-measure text-body text-[var(--foreground-muted)]">
            {explanation}
          </p>
          <ContinueButton
            onClick={() =>
              onDone({
                correct: picked === correctIndex ? 1 : 0,
                total: 1,
                answer: { kind: "single", index: picked },
              })
            }
          />
        </>
      )}
    </div>
  );
}

/* --- Multiple response ---------------------------------------------------- */

export function MultiSelectBody({
  prompt,
  options,
  mode = "teach",
  value,
  onChange,
  onDone,
}: {
  prompt: string;
  options: { id: string; label: string; correct: boolean }[];
  onDone: OnDone;
} & Controllable<string[]>) {
  const playSfx = useSfx();
  // An array rather than a Set because a controlled value has to survive being
  // handed out and handed back, and a Set would be mutated in place.
  const [chosenList, setChosenList] = useControllable<string[]>(
    value,
    onChange,
    [],
  );
  const chosen = new Set(chosenList);
  const [checkedState, setChecked] = useState(false);
  // With no verdict there is nothing to check, so the body never enters the
  // checked phase and stays editable for the whole paper.
  const checked = mode === "verdict" || (mode === "teach" && checkedState);

  const total = options.length;
  // Scored per option, not all-or-nothing: getting three of four right is
  // genuinely different from getting none, and a binary score would tell the
  // trainer neither. The exam collapses this to a pass/fail on top.
  const score = options.filter((o) => chosen.has(o.id) === o.correct).length;

  return (
    <div className="flex flex-col gap-3">
      <p className="prose-measure text-body-lg">{prompt}</p>

      <div
        role="group"
        aria-label={prompt}
        className="grid gap-2 sm:grid-cols-2"
      >
        {options.map((option) => {
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
                setChosenList(
                  chosen.has(option.id)
                    ? chosenList.filter((id) => id !== option.id)
                    : [...chosenList, option.id],
                );
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
              {/* Not `aria-hidden`: after checking, this mark is the only
                  thing distinguishing a correct option from a wrong one —
                  the rest of the verdict is border and background colour. */}
              {checked && option.correct && (
                <span className="flex shrink-0">
                  <TickGlyph title="correct" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Actions belong to teaching only. In `verdict` the marks are already
          applied and the caller drives what happens next; in `input` nothing
          is judged. */}
      {mode !== "teach" ? null : !checked ? (
        <CheckButton
          // Untouched distractors used to score as correct, so an empty
          // submission paid shards for zero engagement.
          disabled={chosen.size === 0}
          onClick={() => {
            setChecked(true);
            playSfx(score === total ? "correct" : "wrong");
          }}
        />
      ) : (
        <>
          <p className="text-body font-semibold">
            {score}/{total} correct
          </p>
          <ContinueButton
            onClick={() =>
              onDone({
                correct: score,
                total,
                answer: {
                  kind: "multi",
                  indexes: options
                    .map((o, i) => (chosen.has(o.id) ? i : -1))
                    .filter((i) => i >= 0),
                },
              })
            }
          />
        </>
      )}
    </div>
  );
}

/* --- Placement: matching, bucketing, and ordering ------------------------- */

export type PlacementSlot = { id: string; label: string };
export type PlacementItem = { id: string; label: string; answerSlotId: string };

/**
 * The shared engine behind match, sort and order. Slot identity is distinct
 * from the answer key, which is the whole generalisation: match is the 1:1
 * case (one slot per term), sort is many-to-one (a bucket per skills area),
 * and order is 1:1 against numbered positions.
 *
 * The invariant all three share is that an item lives in exactly one slot —
 * enforced by the `placed` map's shape (itemId → slotId). Capacity "one" adds
 * the rule on top: dropping onto an occupied slot vacates the occupant back to
 * the bank, otherwise it silently duplicates.
 */
export function PlacementBody({
  prompt,
  hint,
  slots,
  items,
  capacity,
  emptyLabel,
  scoreWord,
  answerFor,
  mode = "teach",
  value,
  onChange,
  onDone,
}: {
  prompt: string;
  hint: string;
  slots: PlacementSlot[];
  items: PlacementItem[];
  capacity: "one" | "many";
  emptyLabel: string;
  scoreWord: string;
  /**
   * Turns the final placement into the answer shape this question stores.
   * Omitted by the learning-path checkpoint, which records no answer.
   */
  answerFor?: (placed: Record<string, string>) => SubmittedAnswer | null;
  onDone: OnDone;
} & Controllable<Record<string, string>>) {
  const playSfx = useSfx();
  /** itemId -> the slot it currently sits in. */
  const [placed, setPlaced] = useControllable<Record<string, string>>(
    value,
    onChange,
    {},
  );
  /** The item currently picked up, by keyboard or tap. Never controlled — a
      half-finished drag is interaction state, not an answer. */
  const [held, setHeld] = useState<string | null>(null);
  const [checkedState, setChecked] = useState(false);
  const checked = mode === "verdict" || (mode === "teach" && checkedState);

  const total = items.length;
  const score = items.filter((i) => placed[i.id] === i.answerSlotId).length;

  function drop(slotId: string, itemId: string) {
    playSfx("confirm");
    const next = { ...placed };
    if (capacity === "one") {
      for (const [i, s] of Object.entries(placed)) {
        if (s === slotId) delete next[i];
      }
    }
    next[itemId] = slotId;
    setPlaced(next);
    setHeld(null);
  }

  /** Tapping a placed item returns it to the bank. */
  function vacate(itemId: string) {
    playSfx("back");
    const next = { ...placed };
    delete next[itemId];
    setPlaced(next);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="prose-measure text-body-lg">{prompt}</p>
      <p className="text-caption text-[var(--foreground-muted)]">{hint}</p>

      {/* The bank of items still to place. */}
      <div className="flex flex-wrap gap-2">
        {items
          .filter((i) => !placed[i.id])
          .map((i) => (
            <button
              key={i.id}
              type="button"
              draggable={!checked}
              disabled={checked}
              aria-pressed={held === i.id}
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", i.id);
                setHeld(i.id);
              }}
              onClick={() => {
                playSfx("cursor");
                setHeld((h) => (h === i.id ? null : i.id));
              }}
              className={`menu-item max-w-[22rem] px-3 py-2 text-left text-caption ${
                held === i.id ? "menu-item--gold" : ""
              }`}
            >
              {i.label}
            </button>
          ))}
      </div>

      {capacity === "one" ? (
        <div className="grid gap-2">
          {slots.map((slot) => {
            const filled = items.find((i) => placed[i.id] === slot.id);
            const verdict = checked
              ? filled && filled.answerSlotId === slot.id
                ? "correct"
                : "wrong"
              : null;

            return (
              <button
                key={slot.id}
                type="button"
                disabled={checked || (!held && !filled)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const itemId = e.dataTransfer.getData("text/plain");
                  if (itemId) drop(slot.id, itemId);
                }}
                onClick={() => {
                  if (held) drop(slot.id, held);
                  else if (filled) vacate(filled.id);
                }}
                className={`menu-item flex min-h-14 flex-col items-start gap-1 px-3 py-2 text-left ${
                  verdict === "correct"
                    ? "border-[var(--success)] bg-[var(--success)]/10"
                    : verdict === "wrong"
                      ? "border-[var(--danger)] bg-[var(--danger)]/10"
                      : ""
                }`}
              >
                <span className="text-body font-semibold">{slot.label}</span>
                <span className="text-caption text-[var(--foreground-muted)]">
                  {filled ? filled.label : emptyLabel}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        /* Buckets: the drop zone is the container for the drag flourish, the
           header is the real <button> for the tap path, and each placed item
           is its own button so it can be taken back out. */
        <div className="grid gap-2 sm:grid-cols-2">
          {slots.map((slot) => {
            const contents = items.filter((i) => placed[i.id] === slot.id);
            return (
              <div
                key={slot.id}
                className="pixel-panel flex flex-col gap-2 p-3"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const itemId = e.dataTransfer.getData("text/plain");
                  if (itemId && !checked) drop(slot.id, itemId);
                }}
              >
                <button
                  type="button"
                  disabled={checked || !held}
                  onClick={() => {
                    if (held) drop(slot.id, held);
                  }}
                  className="menu-item flex min-h-11 flex-col items-start gap-1 px-3 py-2 text-left"
                >
                  <span className="text-body font-semibold">{slot.label}</span>
                  <span className="text-caption text-[var(--foreground-muted)]">
                    {emptyLabel}
                  </span>
                </button>
                {contents.map((i) => {
                  const verdict = checked
                    ? i.answerSlotId === slot.id
                      ? "correct"
                      : "wrong"
                    : null;
                  return (
                    <button
                      key={i.id}
                      type="button"
                      disabled={checked}
                      onClick={() => vacate(i.id)}
                      className={`menu-item px-3 py-2 text-left text-caption ${
                        verdict === "correct"
                          ? "border-[var(--success)] bg-[var(--success)]/10"
                          : verdict === "wrong"
                            ? "border-[var(--danger)] bg-[var(--danger)]/10"
                            : ""
                      }`}
                    >
                      {i.label}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Actions belong to teaching only. In `verdict` the marks are already
          applied and the caller drives what happens next; in `input` nothing
          is judged. */}
      {mode !== "teach" ? null : !checked ? (
        <CheckButton
          disabled={Object.keys(placed).length < total}
          onClick={() => {
            setChecked(true);
            playSfx(score === total ? "correct" : "wrong");
          }}
        />
      ) : (
        <>
          <p className="text-body font-semibold">
            {score}/{total} {scoreWord}
          </p>
          <ContinueButton
            onClick={() =>
              onDone({
                correct: score,
                total,
                answer: answerFor ? answerFor(placed) : null,
              })
            }
          />
        </>
      )}
    </div>
  );
}

/* --- Verdict deck: judge each pairing, fast ------------------------------- */

const SWIPE_THRESHOLD_PX = 80;

export function VerdictDeckBody({
  prompt,
  cards,
  variant = "definition",
  mode = "teach",
  value,
  onChange,
  onDone,
}: {
  prompt: string;
  cards: { id: string; term: string; definition: string; matches: boolean }[];
  /**
   * What the deck is asking. A checkpoint judges whether a definition belongs
   * to a term; an exam's repeated-scenario series judges whether a statement
   * is true. Same mechanics, and the wording has to follow the question or the
   * buttons read as nonsense — "Match" against "Deleting the account is
   * blocked" is not a question anyone can answer.
   */
  variant?: "definition" | "statement";
  onDone: OnDone;
} & Controllable<boolean[]>) {
  const isStatement = variant === "statement";
  const affirmLabel = isStatement ? "Yes" : "Match";
  const denyLabel = isStatement ? "No" : "No match";
  const playSfx = useSfx();
  const prefs = usePreferences();
  // The answers so far ARE the position in the deck, so controlling them is
  // what makes the exam's navigator able to leave a half-judged series and
  // come back to it mid-deck.
  const [given, setGiven] = useControllable<boolean[]>(value, onChange, []);
  const index = given.length;
  const [correctCount, setCorrectCount] = useState(0);
  /** Live horizontal drag offset; zero whenever no drag is in flight. */
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [verdict, setVerdict] = useState<{
    correct: boolean;
    text: string;
  } | null>(null);
  /** The just-answered card, kept around only to animate its exit. */
  const [leaving, setLeaving] = useState<{
    term: string;
    definition: string;
    dir: "left" | "right";
    key: number;
  } | null>(null);
  const startX = useRef(0);

  const card = index < cards.length ? cards[index] : null;

  function answer(saidMatch: boolean) {
    if (!card) return;
    const correct = saidMatch === card.matches;
    playSfx(correct ? "correct" : "wrong");
    setCorrectCount((c) => (correct ? c + 1 : c));
    setGiven([...given, saidMatch]);
    setVerdict({
      correct,
      text: isStatement
        ? correct
          ? card.matches
            ? "Right — that statement is true."
            : "Right — that statement is false."
          : card.matches
            ? "That statement is actually true."
            : "That statement is actually false."
        : correct
          ? card.matches
            ? `Right — that is the definition of “${card.term}”.`
            : `Right — that is not the definition of “${card.term}”.`
          : card.matches
            ? `That really is the definition of “${card.term}”.`
            : `Not quite — that is not the definition of “${card.term}”.`,
    });
    // The fling is a flourish. Under reduced motion the card simply resolves.
    if (!prefs.reducedMotion && mode !== "input") {
      setLeaving({
        term: card.term,
        definition: card.definition,
        dir: saidMatch ? "right" : "left",
        key: index,
      });
    }
    setDragging(false);
    setDx(0);
  }

  return (
    <div
      className="flex flex-col gap-3"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          answer(false);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          answer(true);
        }
      }}
    >
      <p className="prose-measure text-body-lg">{prompt}</p>

      {card ? (
        <>
          <p className="text-caption text-[var(--foreground-muted)]">
            {/* No comma after the tick: a mark carries its own margin on both
                sides (see Glyph.tsx), so punctuation set directly against one
                gets pushed off the word it belongs to. */}
            {isStatement ? "Statement" : "Card"} {index + 1} of {cards.length} —
            drag the card, press
            <CrossGlyph title={denyLabel} />/<TickGlyph title={affirmLabel} />
            or use ← / →.
          </p>

          <div className="swipe-stack">
            {leaving && (
              <div
                key={leaving.key}
                aria-hidden="true"
                className={`swipe-card pixel-panel pixel-panel--stamped swipe-card--leaving ${
                  leaving.dir === "right"
                    ? "swipe-card--exit-right"
                    : "swipe-card--exit-left"
                }`}
                onAnimationEnd={() => setLeaving(null)}
              >
                <span className="text-body-lg font-semibold">
                  {leaving.term}
                </span>
                <span className="prose-measure text-body text-[var(--foreground-muted)]">
                  {leaving.definition}
                </span>
              </div>
            )}
            <div
              className="swipe-card pixel-panel pixel-panel--stamped"
              style={
                dragging
                  ? {
                      transform: `translateX(${dx}px) rotate(${dx * 0.05}deg)`,
                      transition: "none",
                    }
                  : undefined
              }
              onPointerDown={(e) => {
                // The gesture is skipped entirely under reduced motion —
                // the ✗/✓ buttons and arrow keys are the interface anyway.
                const still =
                  prefs.reducedMotion ||
                  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                if (still) return;
                startX.current = e.clientX;
                setDragging(true);
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (dragging) setDx(e.clientX - startX.current);
              }}
              onPointerUp={() => {
                if (!dragging) return;
                if (dx >= SWIPE_THRESHOLD_PX) answer(true);
                else if (dx <= -SWIPE_THRESHOLD_PX) answer(false);
                else {
                  setDragging(false);
                  setDx(0);
                }
              }}
              onPointerCancel={() => {
                setDragging(false);
                setDx(0);
              }}
            >
              <span className="text-body-lg font-semibold">{card.term}</span>
              <span className="prose-measure text-body text-[var(--foreground-muted)]">
                {card.definition}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => answer(false)}
              className="pixel-button tap-target rounded-md bg-[var(--panel)] px-5 py-2.5 text-body font-medium"
            >
              <CrossGlyph />
              {denyLabel}
            </button>
            <button
              type="button"
              onClick={() => answer(true)}
              className="pixel-button tap-target rounded-md bg-[var(--accent)] px-5 py-2.5 text-body font-medium text-[var(--accent-foreground)]"
            >
              <TickGlyph />
              {affirmLabel}
            </button>
          </div>
        </>
      ) : mode === "teach" ? (
        <>
          <p className="text-body font-semibold">
            {correctCount}/{cards.length} judged correctly
          </p>
          <ContinueButton
            onClick={() =>
              onDone({
                correct: correctCount,
                total: cards.length,
                answer: { kind: "yesno", verdicts: given },
              })
            }
          />
        </>
      ) : (
        // Every statement judged, and the paper says nothing about whether they
        // were right. All that is left is a way back into the deck to change
        // an answer, which is what the real series allows until you move on.
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-body font-semibold">
            All {cards.length} answered.
          </p>
          <button
            type="button"
            onClick={() => setGiven([])}
            className="pixel-button tap-target rounded-md bg-[var(--panel)] px-4 py-2 text-caption font-semibold"
          >
            Start again
          </button>
        </div>
      )}

      {/* The verdict in words, never only in motion. Suppressed in `input`
          mode — on a paper this is exactly the feedback the format forbids. */}
      {mode !== "input" && (
        <p
          role="status"
          aria-live="polite"
          className={`min-h-5 text-body font-medium ${
            verdict
              ? verdict.correct
                ? "text-[var(--success)]"
                : "text-[var(--danger)]"
              : ""
          }`}
        >
          {verdict ? verdict.text : ""}
        </p>
      )}
    </div>
  );
}

/* --- Dropdown / hotspot --------------------------------------------------- */

/**
 * A sentence with blanks, each filled from its own list.
 *
 * The one format with no existing equivalent. It renders as real `<select>`
 * elements set inline in the prose rather than as a custom popup, because the
 * native control is already keyboard-operable, screen-reader-labelled, and
 * usable on a phone — three things a hand-rolled listbox would have to earn
 * back. The blanks are numbered in their labels so a screen reader announces
 * "blank 2 of 3" rather than an unlabelled combobox mid-sentence.
 */
export function DropdownBody({
  prompt,
  segments,
  explanation,
  mode = "teach",
  value,
  onChange,
  onDone,
}: {
  prompt: string;
  segments: (
    | { text: string }
    | { blankId: string; options: string[]; correctIndex: number }
  )[];
  explanation: string;
  onDone: OnDone;
} & Controllable<Record<string, number>>) {
  const playSfx = useSfx();
  const blanks = segments.filter(
    (s): s is { blankId: string; options: string[]; correctIndex: number } =>
      "blankId" in s,
  );
  const [picks, setPicks] = useControllable<Record<string, number>>(
    value,
    onChange,
    {},
  );
  const [checkedState, setChecked] = useState(false);
  const checked = mode === "verdict" || (mode === "teach" && checkedState);

  const total = blanks.length;
  const score = blanks.filter(
    (b) => picks[b.blankId] === b.correctIndex,
  ).length;
  const allFilled = blanks.every((b) => picks[b.blankId] !== undefined);

  return (
    <div className="flex flex-col gap-3">
      <p className="prose-measure text-body-lg">{prompt}</p>

      <p className="prose-measure text-body leading-loose">
        {segments.map((segment, i) => {
          if (!("blankId" in segment)) {
            return <span key={i}>{segment.text}</span>;
          }
          const n = blanks.findIndex((b) => b.blankId === segment.blankId) + 1;
          const picked = picks[segment.blankId];
          const verdict = checked
            ? picked === segment.correctIndex
              ? "correct"
              : "wrong"
            : null;
          const chosen = picked !== undefined;

          return (
            <select
              key={segment.blankId}
              aria-label={`Blank ${n} of ${total}`}
              disabled={checked}
              value={picked ?? ""}
              onChange={(e) => {
                playSfx("cursor");
                setPicks({
                  ...picks,
                  [segment.blankId]: Number(e.target.value),
                });
              }}
              className={`mx-1 inline-block min-h-11 max-w-full rounded-md bg-[var(--panel-raised)] px-2 py-1 text-body ${
                verdict === "correct"
                  ? "border-[var(--success)]"
                  : verdict === "wrong"
                    ? "border-[var(--danger)]"
                    : // No verdict: a filled blank still has to look answered,
                      // or a 60-question paper gives no way to see at a glance
                      // which blanks are still empty.
                      mode === "input" && chosen
                      ? "border-[var(--gold)]"
                      : ""
              }`}
              style={{ border: "2px solid var(--border)" }}
            >
              <option value="" disabled>
                — choose —
              </option>
              {segment.options.map((option, oi) => (
                <option key={oi} value={oi}>
                  {option}
                </option>
              ))}
            </select>
          );
        })}
      </p>

      {/* Actions belong to teaching only. In `verdict` the marks are already
          applied and the caller drives what happens next; in `input` nothing
          is judged. */}
      {mode !== "teach" ? null : !checked ? (
        <CheckButton
          disabled={!allFilled}
          onClick={() => {
            setChecked(true);
            playSfx(score === total ? "correct" : "wrong");
          }}
        />
      ) : (
        <>
          <p className="text-body font-semibold">
            {score}/{total} correct
          </p>
          <p className="prose-measure text-body text-[var(--foreground-muted)]">
            {explanation}
          </p>
          <ContinueButton
            onClick={() =>
              onDone({
                correct: score,
                total,
                answer: {
                  kind: "dropdown",
                  picks: blanks.map((b) => picks[b.blankId] ?? -1),
                },
              })
            }
          />
        </>
      )}
    </div>
  );
}
