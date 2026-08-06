"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePreferences } from "@/lib/preferences";
import { useSfx } from "@/components/AudioProvider";

const MS_PER_CHAR = 26;
/** Blip every few characters — one per character is a machine-gun rattle. */
const CHARS_PER_BLIP = 3;

/** The bordered window itself, for callers that just want the frame. */
export function DialogueFrame({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`dialogue-frame ${className}`}>
      <div className="dialogue-frame-inner">{children}</div>
    </div>
  );
}

type Props = {
  /** Shown one at a time; advancing steps through them. */
  lines: string[];
  /** Fires once, after the last line is dismissed. */
  onDone?: () => void;
  /** Rendered under the text once every line has been read. */
  footer?: React.ReactNode;
  speaker?: string;
  className?: string;
};

type TypeState = {
  lineIndex: number;
  charCount: number;
  /** Set when the last line has been dismissed. */
  finished: boolean;
};

const START: TypeState = { lineIndex: 0, charCount: 0, finished: false };

/**
 * The era-defining text box: letters appear one at a time, a blinking arrow
 * marks "press to continue", and any input either finishes the current line
 * instantly or moves to the next.
 *
 * Typing can be turned off entirely — `instantText` for people who find the
 * effect slow, and `reducedMotion` because a stream of appearing characters
 * is animation whether or not it looks like one.
 */
export default function DialogueBox({
  lines,
  onDone,
  footer,
  speaker,
  className = "",
}: Props) {
  const prefs = usePreferences();
  const playSfx = useSfx();
  const instant = prefs.instantText || prefs.reducedMotion;

  const [state, setState] = useState<TypeState>(START);
  const blipCounter = useRef(0);
  /** Which message `onDone` has already fired for. */
  const firedFor = useRef<string | null>(null);

  // Restart when the caller swaps in a different message. Adjusting state
  // during render rather than in an effect avoids a frame showing the new
  // text at the old line's progress. Keyed on content, not array identity,
  // so an inline `lines={[...]}` prop doesn't reset on every render. The
  // separator is a character that cannot occur in dialogue text, so two
  // different splits can never collide on one key. It is written as an
  // escape rather than a literal: a raw NUL byte in the source makes git
  // treat the whole file as binary, costing you diffs and blame on it.
  const linesKey = lines.join("\u0000");
  const [prevLinesKey, setPrevLinesKey] = useState(linesKey);
  if (prevLinesKey !== linesKey) {
    setPrevLinesKey(linesKey);
    setState(START);
  }

  const line = lines[state.lineIndex] ?? "";
  const revealed = instant ? line : line.slice(0, state.charCount);
  const lineComplete = revealed.length >= line.length;
  const isLastLine = state.lineIndex >= lines.length - 1;

  useEffect(() => {
    if (instant || state.charCount >= line.length) return;

    const id = setTimeout(() => {
      setState((prev) => ({ ...prev, charCount: prev.charCount + 1 }));
      blipCounter.current += 1;
      if (blipCounter.current % CHARS_PER_BLIP === 0) playSfx("text");
    }, MS_PER_CHAR);

    return () => clearTimeout(id);
  }, [state.charCount, line, instant, playSfx]);

  /**
   * All of the advance logic lives inside the updater so that a burst of
   * events — holding Enter down produces key-repeat far faster than React
   * re-renders — is applied sequentially instead of every handler reading the
   * same stale line index and running off the end of the array.
   */
  const advance = useCallback(() => {
    setState((prev) => {
      if (prev.finished) return prev;

      const current = lines[prev.lineIndex] ?? "";
      const complete = instant || prev.charCount >= current.length;

      if (!complete) {
        // First input finishes the line rather than skipping it, so an
        // impatient reader never loses text they haven't seen.
        return { ...prev, charCount: current.length };
      }

      if (prev.lineIndex >= lines.length - 1) {
        return { ...prev, finished: true };
      }

      return { lineIndex: prev.lineIndex + 1, charCount: 0, finished: false };
    });
  }, [lines, instant]);

  // Hand control back to the caller exactly once, however many times the
  // advance input fired. Keyed by message rather than a boolean flag so the
  // guard re-arms on its own when a new message arrives — the ref is then
  // only ever touched inside this effect, never during render.
  useEffect(() => {
    if (!state.finished || firedFor.current === linesKey) return;
    firedFor.current = linesKey;
    playSfx("cursor");
    onDone?.();
  }, [state.finished, linesKey, onDone, playSfx]);

  // Space and Enter advance, as they would on a handheld's A button.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== " " && event.key !== "Enter") return;
      const target = event.target as HTMLElement | null;
      // Don't hijack the key while someone is using a real control.
      if (
        target &&
        ["INPUT", "TEXTAREA", "BUTTON", "SELECT", "A"].includes(target.tagName)
      ) {
        return;
      }
      event.preventDefault();
      advance();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance]);

  const showArrow = lineComplete && !state.finished;

  return (
    <DialogueFrame className={className}>
      <div
        onClick={advance}
        className="cursor-pointer select-none"
        role="presentation"
      >
        {speaker && (
          <p className="font-pixel mb-2 text-label text-[var(--accent)]">
            {speaker}
          </p>
        )}
        {/* aria-live announces the whole line, not the partially typed one. */}
        <p
          className="prose-measure min-h-[3lh] text-body-lg"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="sr-only">{line}</span>
          <span aria-hidden="true">{revealed}</span>
          {showArrow && <span className="dialogue-arrow" aria-hidden="true" />}
        </p>
      </div>
      {lineComplete && isLastLine && footer && (
        <div className="mt-3">{footer}</div>
      )}
    </DialogueFrame>
  );
}
