"use client";

import { useState } from "react";
import { useSfx } from "@/components/AudioProvider";
import type { CaseStudy } from "@/lib/types";

/**
 * The scenario a case study's questions are asked against.
 *
 * Tabs rather than one long scroll, because that is how the real thing is
 * laid out and because the reading task is part of what is being tested:
 * requirements live in one tab, the existing environment in another, and
 * finding which tab answers the question is the work.
 *
 * ── Why the tabs are real buttons in a tablist ──
 *
 * A screen reader has to be able to move between panels, and a keyboard user
 * has to reach the requirements without tabbing through every paragraph of
 * the overview. Arrow keys move between tabs, which is the pattern the ARIA
 * tabs practice expects; Tab itself moves out of the strip and into the
 * panel.
 *
 * The pane stays mounted across the case's questions, so the tab a trainer
 * left open is still open on the next one — the alternative is re-finding
 * the requirements tab five times in a row.
 */
export default function CaseStudyPane({
  caseStudy,
  questionCount,
}: {
  caseStudy: CaseStudy;
  /** How many questions are asked against this scenario. */
  questionCount: number;
}) {
  const playSfx = useSfx();
  const [active, setActive] = useState(0);
  const tabs = caseStudy.tabs;

  function move(to: number) {
    const wrapped = (to + tabs.length) % tabs.length;
    playSfx("cursor");
    setActive(wrapped);
  }

  return (
    <section
      aria-label={`Case study: ${caseStudy.title}`}
      className="pixel-panel flex flex-col gap-3 p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-pixel text-title">{caseStudy.title}</h2>
        <p className="text-caption text-[var(--foreground-muted)]">
          Case study · {questionCount} question
          {questionCount === 1 ? "" : "s"}
        </p>
      </div>

      <div role="tablist" aria-label="Case study sections" className="flex flex-wrap gap-2">
        {tabs.map((tab, i) => (
          <button
            key={tab.heading}
            role="tab"
            type="button"
            id={`${caseStudy.id}-tab-${i}`}
            aria-selected={i === active}
            aria-controls={`${caseStudy.id}-panel-${i}`}
            // Only the active tab is in the tab order; the arrows move
            // between them. Tab then leaves the strip rather than walking
            // every section heading.
            tabIndex={i === active ? 0 : -1}
            onClick={() => move(i)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                e.preventDefault();
                move(active + 1);
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                move(active - 1);
              }
            }}
            className={`menu-item min-h-11 px-3 py-2 text-caption font-semibold ${
              i === active ? "menu-item--gold" : ""
            }`}
          >
            {tab.heading}
          </button>
        ))}
      </div>

      {/* Only the open panel is rendered. The others are a scroll away in the
          real exam too, and keeping them mounted would put their headings in
          the accessibility tree as if they were on screen. */}
      <div
        role="tabpanel"
        id={`${caseStudy.id}-panel-${active}`}
        aria-labelledby={`${caseStudy.id}-tab-${active}`}
        tabIndex={0}
        className="flex max-h-72 flex-col gap-3 overflow-y-auto"
      >
        {tabs[active].paragraphs.map((paragraph, i) => (
          <p key={i} className="prose-measure text-body">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
