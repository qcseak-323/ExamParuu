"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import MenuList, { type MenuOption } from "@/components/MenuList";
import { useSfx } from "@/components/AudioProvider";
import { useBattleTransition } from "@/components/battle/BattleTransition";

/**
 * The two ways to play, as two big boxes.
 *
 * Each box used to carry two or three peer buttons, which made the choice
 * look like three equal errands rather than one decision with variants. Now
 * each box has a single action, and the box itself opens a selector listing
 * where that action can take you. Opening one closes the other — two open
 * selectors would be two cursors, and there is only one of you.
 *
 * The pick sticks: choosing a destination fills its row gold and leaves it
 * filled, so the box goes on saying what it will do when pressed. Nothing
 * navigates until the big button is pressed, which is what makes browsing
 * the list free.
 */

type Mode = {
  id: "practice" | "exam";
  title: string;
  blurb: string;
  /** The button label, which names the currently chosen destination. */
  verb: string;
  options: (MenuOption & { href: string })[];
};

export default function ModePanels({ examCode }: { examCode: string }) {
  const router = useRouter();
  const playSfx = useSfx();
  const { run: runTransition, overlay: transitionOverlay } =
    useBattleTransition();

  const base = `/exams/${examCode}`;

  const MODES: Mode[] = [
    {
      id: "practice",
      title: "Practice Mode",
      blurb: "No clock. Wrong answers open a lesson on the spot.",
      verb: "Enter",
      options: [
        {
          id: "path",
          label: "Learning path",
          hint: "Guided",
          href: `${base}/path`,
        },
        {
          id: "quiz",
          label: "Practice battle",
          hint: "Free play",
          href: `${base}/quiz`,
        },
        {
          id: "study",
          label: "Study guide",
          hint: "Read",
          href: `${base}/study`,
        },
        {
          id: "flashcards",
          label: "Flashcards",
          hint: "Drill",
          href: `${base}/flashcards`,
        },
      ],
    },
    {
      id: "exam",
      title: "Exam Mode",
      blurb: "The clock runs. No feedback until the score report.",
      verb: "Begin",
      options: [
        {
          id: "exam",
          label: "The Proving",
          hint: "Real format",
          href: `${base}/exam`,
        },
        {
          id: "gym",
          label: "Challenge the dungeon",
          hint: "Guardian",
          href: `${base}/gym`,
        },
      ],
    },
  ];

  /** Which box has its selector open, if any. */
  const [openMode, setOpenMode] = useState<Mode["id"] | null>(null);
  const [chosen, setChosen] = useState<Record<string, string>>({
    practice: "path",
    exam: "exam",
  });

  function toggle(mode: Mode) {
    playSfx(openMode === mode.id ? "back" : "confirm");
    setOpenMode((current) => (current === mode.id ? null : mode.id));
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {MODES.map((mode) => {
        const open = openMode === mode.id;
        const pickedId = chosen[mode.id];
        const picked =
          mode.options.find((o) => o.id === pickedId) ?? mode.options[0];

        return (
          <div key={mode.id} className="pixel-panel flex flex-col gap-3 p-6">
            {/* The whole box is the disclosure control, so "click the bigger
                box" works — but it is a real <button> wrapping only the
                heading and blurb, never the selector. Nesting the menu's
                buttons inside another button would be invalid and would
                swallow their clicks. */}
            <button
              type="button"
              aria-expanded={open}
              aria-controls={`${mode.id}-options`}
              onClick={() => toggle(mode)}
              onMouseEnter={() => playSfx("cursor")}
              className="-m-2 flex items-start justify-between gap-3 rounded-md p-2 text-left"
            >
              <span>
                <span className="block font-pixel text-title">
                  {mode.title}
                </span>
                <span className="mt-1 block text-body text-[var(--foreground-muted)]">
                  {mode.blurb}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="shrink-0 font-pixel text-title leading-none"
              >
                {open ? "▾" : "▸"}
              </span>
            </button>

            {open && (
              <div id={`${mode.id}-options`}>
                <MenuList
                  ariaLabel={`Choose what to do in ${mode.title}`}
                  options={mode.options}
                  selectedId={pickedId}
                  onSelect={(id) =>
                    setChosen((c) => ({ ...c, [mode.id]: id }))
                  }
                />
              </div>
            )}

            {/* One action, and it names where it is going — so the box reads
                as a decision already made rather than a menu to re-read. */}
            <button
              type="button"
              onClick={() =>
                runTransition(() => router.push(picked.href))
              }
              className="pixel-button tap-target mt-auto w-full rounded-md bg-[var(--accent)] px-5 py-3 text-body font-medium text-[var(--accent-foreground)]"
            >
              {mode.verb} — {picked.label} ▶
            </button>
          </div>
        );
      })}

      {transitionOverlay}
    </section>
  );
}
