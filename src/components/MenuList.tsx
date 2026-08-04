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

const TONE_CLASS: Record<NonNullable<MenuOption["tone"]>, string> = {
  default: "border-[var(--border)]",
  correct:
    "border-emerald-600 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300",
  wrong: "border-red-600 bg-red-600/10 text-red-800 dark:text-red-300",
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
            onMouseEnter={() => !isDisabled && setActiveIndex(index)}
            onKeyDown={(e) => handleKey(e, index)}
            onClick={() => {
              if (isDisabled) return;
              playSfx("confirm");
              onSelect(option.id);
            }}
            className={`menu-item flex items-center gap-2 px-3 py-2.5 text-left text-sm ${tone} ${
              isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
            }`}
          >
            <span
              aria-hidden="true"
              className={`font-pixel text-[10px] leading-none ${
                isActive && !isDisabled ? "opacity-100" : "opacity-0"
              }`}
            >
              ▶
            </span>
            <span className="flex-1">{option.label}</span>
            {option.hint && (
              <span className="shrink-0 text-xs text-[var(--foreground-muted)]">
                {option.hint}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
