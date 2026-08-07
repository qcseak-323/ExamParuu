"use client";

import { useRef, useState } from "react";
import { useSfx } from "@/components/AudioProvider";

export type MenuOption = {
  id: string;
  label: string;
  /** Small trailing note, e.g. a question count. */
  hint?: string;
  disabled?: boolean;
  /** Overrides the default styling, used for answer feedback in battle. */
  tone?: "default" | "correct" | "wrong" | "muted";
};

type Props = {
  options: MenuOption[];
  onSelect: (id: string) => void;
  /** 2 lays the options out as the classic four-quadrant battle menu. */
  columns?: 1 | 2;
  disabled?: boolean;
  ariaLabel: string;
};

// Semantic tones come from the theme's own tokens rather than raw Tailwind
// palette steps. The raw colours these replaced did not flip with the theme
// the way everything around them does — `emerald-800` stayed dark against the
// dark theme's panels — and they sat outside the contrast budget the rest of
// the palette is held to.
const TONE_CLASS: Record<NonNullable<MenuOption["tone"]>, string> = {
  default: "border-[var(--border)]",
  correct:
    "border-[var(--success)] bg-[var(--success)]/10 text-[var(--success)]",
  wrong: "border-[var(--danger)] bg-[var(--danger)]/10 text-[var(--danger)]",
  muted: "border-black/10 opacity-60 dark:border-white/10",
};

/**
 * A cursor-driven menu: a ▶ marks the current option and the arrow keys move
 * it, which is the interaction the whole era ran on.
 *
 * These are real <button>s with a roving tabindex rather than divs with key
 * handlers, so the retro presentation costs nothing in screen-reader or
 * keyboard support — the cursor simply follows native focus.
 */
export default function MenuList({
  options,
  onSelect,
  columns = 1,
  disabled = false,
  ariaLabel,
}: Props) {
  const playSfx = useSfx();
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Clamped at render rather than corrected in an effect: if the list shrinks
  // underneath the cursor there is no frame where it points past the end.
  const cursorIndex = Math.min(activeIndex, Math.max(options.length - 1, 0));

  function focusIndex(next: number) {
    const count = options.length;
    if (count === 0) return;
    const wrapped = (next + count) % count;
    setActiveIndex(wrapped);
    itemRefs.current[wrapped]?.focus();
    playSfx("cursor");
  }

  function handleKey(event: React.KeyboardEvent, index: number) {
    const step = columns === 2 ? 2 : 1;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusIndex(index + step);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusIndex(index - step);
        break;
      case "ArrowRight":
        if (columns === 1) return;
        event.preventDefault();
        focusIndex(index + 1);
        break;
      case "ArrowLeft":
        if (columns === 1) return;
        event.preventDefault();
        focusIndex(index - 1);
        break;
      default:
    }
  }

  return (
    <div
      role="menu"
      aria-label={ariaLabel}
      className={`grid gap-2 ${columns === 2 ? "sm:grid-cols-2" : "grid-cols-1"}`}
    >
      {options.map((option, index) => {
        const isActive = index === cursorIndex;
        const tone = TONE_CLASS[option.tone ?? "default"];
        const isDisabled = disabled || option.disabled;

        return (
          <button
            key={option.id}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            role="menuitem"
            type="button"
            disabled={isDisabled}
            tabIndex={isActive ? 0 : -1}
            onFocus={() => setActiveIndex(index)}
            onMouseEnter={() => {
              if (isDisabled || index === activeIndex) return;
              setActiveIndex(index);
              // The selector blip follows the cursor however it moves —
              // arrow keys already play it via focusIndex.
              playSfx("cursor");
            }}
            onKeyDown={(e) => handleKey(e, index)}
            onClick={() => {
              if (isDisabled) return;
              playSfx("confirm");
              onSelect(option.id);
            }}
            className={`menu-item flex min-h-11 items-center gap-2 px-3 py-2.5 text-left text-body ${tone} ${
              isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
            } ${
              // The selector row fills bright gold. Tone rows (answer
              // feedback) keep their own colours — a gold wash over a
              // correct/wrong row would hide the verdict.
              isActive && !isDisabled && (option.tone ?? "default") === "default"
                ? "menu-item--gold"
                : ""
            }`}
          >
            <span
              aria-hidden="true"
              className={`font-pixel text-label leading-none ${
                isActive && !isDisabled ? "opacity-100" : "opacity-0"
              }`}
            >
              ▶
            </span>
            <span className="flex-1">{option.label}</span>
            {option.hint && (
              <span
                className={`shrink-0 text-caption ${
                  isActive && !isDisabled ? "" : "text-[var(--foreground-muted)]"
                }`}
              >
                {option.hint}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
