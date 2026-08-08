"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import MenuList, { type MenuOption } from "@/components/MenuList";
import { getLearningPaths } from "@/lib/learningPath";
import { useSfx } from "@/components/AudioProvider";
import { useBattleTransition } from "@/components/battle/BattleTransition";

/**
 * The three ways to play, as three boxes.
 *
 * They are three because they are three different activities, not three
 * difficulty settings: you are being taught, you are practising, or you are
 * sitting the paper. The learning path used to hide inside Practice Mode,
 * which buried the only guided route in the app under a menu belonging to
 * something else.
 *
 * Each box has a single action, and the box itself opens a selector listing
 * where that action can go. Opening one closes the others — three open
 * selectors would be three cursors, and there is only one of you. The pick
 * sticks, so a box goes on saying what it will do when pressed, and nothing
 * navigates until the button is pressed.
 */

type Mode = {
  id: "path" | "practice" | "exam";
  title: string;
  blurb: string;
  /** The button verb, completed by the chosen destination. */
  verb: string;
  options: (MenuOption & { href: string })[];
};

export default function ModePanels({ examCode }: { examCode: string }) {
  const router = useRouter();
  const playSfx = useSfx();
  const { run: runTransition, overlay: transitionOverlay } =
    useBattleTransition();

  const base = `/exams/${examCode}`;
  // Bundled JSON, so this is a plain lookup rather than a fetch — the paths
  // are the same data the /path route renders.
  const paths = getLearningPaths(examCode);

  const MODES: Mode[] = [
    {
      id: "path",
      title: "Learning Path",
      blurb:
        "Microsoft Learn's route, taught in bite-sized cards with a challenge every few.",
      verb: "Learn",
      options: [
        {
          id: "all",
          label: "Start from the top",
          hint: `${paths.length} paths`,
          href: `${base}/path`,
        },
        ...paths.map((p) => ({
          id: p.id,
          label: p.title,
          hint: `${p.modules.length} modules`,
          href: `${base}/path?path=${p.id}`,
        })),
      ],
    },
    {
      id: "practice",
      title: "Practice Mode",
      blurb:
        "The exam without the clock. Wrong answers open a lesson on the spot, and the vocab check is there before you commit.",
      verb: "Practise",
      options: [
        {
          id: "quiz",
          label: "Practice battle",
          hint: "Any area",
          href: `${base}/quiz`,
        },
        {
          id: "review",
          label: "Review weak spots",
          hint: "Missed",
          href: `${base}/quiz?mode=review`,
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
      blurb:
        "A replica of the real paper. The clock runs and there is no feedback until the score report.",
      verb: "Sit",
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

  const [openMode, setOpenMode] = useState<Mode["id"] | null>(null);
  const [chosen, setChosen] = useState<Record<string, string>>({
    path: "all",
    practice: "quiz",
    exam: "exam",
  });

  function toggle(mode: Mode) {
    playSfx(openMode === mode.id ? "back" : "confirm");
    setOpenMode((current) => (current === mode.id ? null : mode.id));
  }

  return (
    <section className="grid gap-4 lg:grid-cols-3">
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
                  onSelect={(id) => setChosen((c) => ({ ...c, [mode.id]: id }))}
                />
              </div>
            )}

            {/* One action, and it names where it is going — so the box reads
                as a decision already made rather than a menu to re-read. */}
            <button
              type="button"
              onClick={() => runTransition(() => router.push(picked.href))}
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
