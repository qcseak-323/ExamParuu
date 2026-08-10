"use client";

import { useRef, useState } from "react";
import MenuList, { type MenuOption } from "@/components/MenuList";
import { useSfx } from "@/components/AudioProvider";
import { usePreferences } from "@/lib/preferences";
import type { Challenge } from "@/lib/types";
import { ForwardGlyph, TickGlyph, CrossGlyph } from "@/components/Glyph";

/**
 * The checkpoint challenge, in its several shapes.
 *
 * All of them report the same thing to the caller — `correct` out of `total` —
 * so the player scores and rewards them identically and adding another shape
 * needs no change upstream.
 *
 * On drag, drop and swipe: they are offered, but never required. Every
 * pairing is also a plain pair of buttons — pick a definition, pick its term —
 * and every swipe is also a pair of ✗/✓ buttons and the arrow keys, because a
 * pointer gesture is unusable by keyboard, awkward on touch, and hostile to
 * anyone with a motor impairment. The gesture is the flourish; the tap is the
 * interface. That is also why the drop targets are real <button>s rather than
 * divs wearing drag handlers, and why the swipe verdict is announced via
 * `aria-live` instead of being carried by motion alone.
 */

type Props = {
  challenge: Challenge;
  onDone: (correct: number, total: number) => void;
};

export default function ChallengeCard({ challenge, onDone }: Props) {
  if (challenge.kind === "recall" || challenge.kind === "oddOne") {
    return <SingleChoiceChallenge challenge={challenge} onDone={onDone} />;
  }
  if (challenge.kind === "multi") {
    return <MultiChallenge challenge={challenge} onDone={onDone} />;
  }
  if (challenge.kind === "sort") {
    return <SortChallenge challenge={challenge} onDone={onDone} />;
  }
  if (challenge.kind === "swipe") {
    return <SwipeChallenge challenge={challenge} onDone={onDone} />;
  }
  return <MatchChallenge challenge={challenge} onDone={onDone} />;
}

/* --- Single answer: recall and odd-one-out ------------------------------- */

/**
 * Recall (the familiar bank question) and odd-one-out share an answer shape —
 * options, one correct index, an explanation — so they share a component.
 * What differs is only where the content came from: the bank for recall, the
 * authored `Flashcard.domain` field for odd-one-out.
 */
function SingleChoiceChallenge({
  challenge,
  onDone,
}: {
  challenge: Extract<Challenge, { kind: "recall" } | { kind: "oddOne" }>;
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

      {!checked ? (
        <button
          type="button"
          // Disabled until something is chosen — matching the match grid's
          // precedent. Untouched distractors used to score as correct, so an
          // empty submission paid shards for zero engagement: an idle faucet
          // the moment shards buy anything.
          disabled={chosen.size === 0}
          onClick={() => {
            setChecked(true);
            playSfx(score === total ? "correct" : "wrong");
          }}
          className="pixel-button tap-target w-fit rounded-md bg-[var(--accent)] px-5 py-2.5 text-body font-medium text-[var(--accent-foreground)] disabled:opacity-40"
        >
          Check answer
          <ForwardGlyph />
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

/* --- Placement: drag an item onto a slot, or tap both -------------------- */

type PlacementSlot = { id: string; label: string };
type PlacementItem = { id: string; label: string; answerSlotId: string };

/**
 * The shared engine behind match and sort. Slot identity is distinct from the
 * answer key, which is the whole generalisation: match is the 1:1 special
 * case (one slot per term, the item's answer is its own slot), sort is the
 * many-to-one case (a bucket per skills area).
 *
 * The invariant both modes share is that an item lives in exactly one slot —
 * enforced by the `placed` map's shape (itemId → slotId). Capacity "one" adds
 * the match-specific rule on top: dropping onto an occupied slot vacates the
 * occupant back to the bank, otherwise it silently duplicates.
 */
function PlacementChallenge({
  prompt,
  hint,
  slots,
  items,
  capacity,
  emptyLabel,
  scoreWord,
  onDone,
}: {
  prompt: string;
  hint: string;
  slots: PlacementSlot[];
  items: PlacementItem[];
  capacity: "one" | "many";
  emptyLabel: string;
  scoreWord: string;
  onDone: (correct: number, total: number) => void;
}) {
  const playSfx = useSfx();
  /** itemId -> the slot it currently sits in. */
  const [placed, setPlaced] = useState<Record<string, string>>({});
  /** The item currently picked up, by keyboard or tap. */
  const [held, setHeld] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const total = items.length;
  const score = items.filter((i) => placed[i.id] === i.answerSlotId).length;

  function drop(slotId: string, itemId: string) {
    playSfx("confirm");
    setPlaced((prev) => {
      const next = { ...prev };
      if (capacity === "one") {
        for (const [i, s] of Object.entries(prev)) {
          if (s === slotId) delete next[i];
        }
      }
      next[itemId] = slotId;
      return next;
    });
    setHeld(null);
  }

  /** Tapping a placed item returns it to the bank. */
  function vacate(itemId: string) {
    playSfx("back");
    setPlaced((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
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
        /* One slot per term, exactly the classic match grid. */
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
          Check answer
          <ForwardGlyph />
        </button>
      ) : (
        <>
          <p className="text-body font-semibold">
            {score}/{total} {scoreWord}
          </p>
          <ContinueButton onClick={() => onDone(score, total)} />
        </>
      )}
    </div>
  );
}

function MatchChallenge({
  challenge,
  onDone,
}: {
  challenge: Extract<Challenge, { kind: "match" }>;
  onDone: (correct: number, total: number) => void;
}) {
  return (
    <PlacementChallenge
      prompt={challenge.prompt}
      hint="Drag a definition onto a term — or tap one, then tap its term."
      slots={challenge.pairs.map((p) => ({ id: p.termId, label: p.term }))}
      items={challenge.pairs.map((p) => ({
        id: p.termId,
        label: p.definition,
        answerSlotId: p.termId,
      }))}
      capacity="one"
      emptyLabel="— drop a definition here —"
      scoreWord="matched"
      onDone={onDone}
    />
  );
}

function SortChallenge({
  challenge,
  onDone,
}: {
  challenge: Extract<Challenge, { kind: "sort" }>;
  onDone: (correct: number, total: number) => void;
}) {
  return (
    <PlacementChallenge
      prompt={challenge.prompt}
      hint="Drag a term onto its skills area — or tap the term, then tap its area."
      slots={challenge.buckets}
      items={challenge.items.map((i) => ({
        id: i.id,
        label: i.label,
        answerSlotId: i.bucketId,
      }))}
      capacity="many"
      emptyLabel="— drop terms here —"
      scoreWord="sorted"
      onDone={onDone}
    />
  );
}

/* --- Swipe: judge each pairing, fast ------------------------------------- */

const SWIPE_THRESHOLD_PX = 80;

function SwipeChallenge({
  challenge,
  onDone,
}: {
  challenge: Extract<Challenge, { kind: "swipe" }>;
  onDone: (correct: number, total: number) => void;
}) {
  const playSfx = useSfx();
  const prefs = usePreferences();
  const [index, setIndex] = useState(0);
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

  const deck = challenge.cards;
  const card = index < deck.length ? deck[index] : null;

  function answer(saidMatch: boolean) {
    if (!card) return;
    const correct = saidMatch === card.matches;
    playSfx(correct ? "correct" : "wrong");
    setCorrectCount((c) => (correct ? c + 1 : c));
    setVerdict({
      correct,
      text: correct
        ? card.matches
          ? `Right — that is the definition of “${card.term}”.`
          : `Right — that is not the definition of “${card.term}”.`
        : card.matches
          ? `That really is the definition of “${card.term}”.`
          : `Not quite — that is not the definition of “${card.term}”.`,
    });
    // The fling is a flourish. Under reduced motion the card simply resolves.
    if (!prefs.reducedMotion) {
      setLeaving({
        term: card.term,
        definition: card.definition,
        dir: saidMatch ? "right" : "left",
        key: index,
      });
    }
    setDragging(false);
    setDx(0);
    setIndex((i) => i + 1);
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
      <p className="prose-measure text-body-lg">{challenge.prompt}</p>

      {card ? (
        <>
          <p className="text-caption text-[var(--foreground-muted)]">
            {/* No comma after the tick: a mark carries its own margin on both
                sides (see Glyph.tsx), so punctuation set directly against one
                gets pushed off the word it belongs to. */}
            Card {index + 1} of {deck.length} — drag the card, press
            <CrossGlyph title="No match" />/<TickGlyph title="Match" />
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
              No match
            </button>
            <button
              type="button"
              onClick={() => answer(true)}
              className="pixel-button tap-target rounded-md bg-[var(--accent)] px-5 py-2.5 text-body font-medium text-[var(--accent-foreground)]"
            >
              <TickGlyph />
              Match
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-body font-semibold">
            {correctCount}/{deck.length} judged correctly
          </p>
          <ContinueButton onClick={() => onDone(correctCount, deck.length)} />
        </>
      )}

      {/* The verdict in words, never only in motion. */}
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
      Continue
      <ForwardGlyph />
    </button>
  );
}
