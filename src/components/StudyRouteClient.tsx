"use client";

import { useRouter } from "next/navigation";
import type { Domain, StudyGuideDomain } from "@/lib/types";
import { estimateMinutes, hasCompletedLesson } from "@/lib/learning";
import { useLearningEvents } from "@/lib/storage";
import MenuList from "@/components/MenuList";
import { useBattleTransition } from "@/components/battle/BattleTransition";
import { TickGlyph } from "@/components/Glyph";

/**
 * The lesson index for one exam.
 *
 * Client-side because the read ticks come from the learning log in local
 * storage. The prose itself still lives on the server-rendered page below —
 * this is navigation, not content.
 *
 * Opening a lesson blacks out the same way entering a battle does: a route
 * is a route. The menu pushes rather than linking, so this uses the hook
 * directly instead of TransitionLink.
 */
export default function StudyRouteClient({
  examCode,
  domains,
  guide,
}: {
  examCode: string;
  domains: Domain[];
  guide: StudyGuideDomain[];
}) {
  const router = useRouter();
  const events = useLearningEvents();
  const { run: runTransition, overlay: transitionOverlay } =
    useBattleTransition();

  const total = guide.reduce((sum, d) => sum + d.sections.length, 0);
  const done = guide.reduce(
    (sum, d) =>
      sum +
      d.sections.filter((s) => hasCompletedLesson(events, examCode, s.id))
        .length,
    0,
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="pixel-panel p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-pixel text-title">Lessons read</h2>
          <span className="text-body text-[var(--foreground-muted)]">
            {done}/{total}
          </span>
        </div>
        <div className="hp-track mt-2">
          <div
            className="hp-fill"
            style={{
              width: `${total === 0 ? 0 : (done / total) * 100}%`,
              background: "var(--accent)",
            }}
          />
        </div>
      </div>

      {domains.map((domain) => {
        const sections =
          guide.find((g) => g.domainId === domain.id)?.sections ?? [];
        if (sections.length === 0) return null;

        return (
          <section key={domain.id} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-pixel text-title">{domain.name}</h2>
              <span className="text-caption text-[var(--foreground-muted)]">
                {domain.weight} of exam
              </span>
            </div>

            {/* subtopics as a "what you'll learn" preamble — authored in the
                outline since the start, shown nowhere until now. */}
            {domain.subtopics.length > 0 && (
              <ul className="flex flex-col gap-1 text-caption text-[var(--foreground-muted)]">
                {domain.subtopics.map((subtopic) => (
                  <li key={subtopic} className="flex gap-2">
                    <span aria-hidden="true">·</span>
                    <span>{subtopic}</span>
                  </li>
                ))}
              </ul>
            )}

            <MenuList
              ariaLabel={`Lessons in ${domain.name}`}
              options={sections.map((section) => ({
                id: section.id,
                label: section.heading,
                hint: hasCompletedLesson(events, examCode, section.id) ? (
                  <>
                    <TickGlyph />
                    read
                  </>
                ) : (
                  `~${estimateMinutes(section.paragraphs)} min`
                ),
              }))}
              onSelect={(sectionId) =>
                runTransition(() =>
                  router.push(`/exams/${examCode}/study/${sectionId}`),
                )
              }
            />
          </section>
        );
      })}

      {transitionOverlay}
    </div>
  );
}
