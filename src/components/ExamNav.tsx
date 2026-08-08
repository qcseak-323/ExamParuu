"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Ordered to match the three modes on the overview page — path, then
// practice, then exam — so the tab strip and the panels tell the same story.
const SECTIONS = [
  { segment: "", label: "Overview" },
  { segment: "path", label: "Learning path" },
  { segment: "study", label: "Lessons" },
  { segment: "flashcards", label: "Flashcards" },
  { segment: "quiz", label: "Battle" },
  { segment: "gym", label: "Dungeon" },
  { segment: "exam", label: "The Proving" },
  { segment: "progress", label: "Progress" },
];

/**
 * Without this there is no way out of a quiz or study page except the
 * browser back button — the global nav only covers top-level destinations.
 */
export default function ExamNav({
  examCode,
  examTitle,
}: {
  examCode: string;
  examTitle: string;
}) {
  const pathname = usePathname();
  const base = `/exams/${examCode}`;

  return (
    <nav aria-label="Exam sections" className="mb-8 flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-2 text-caption">
        <Link
          href="/catalog"
          className="tap-target underline hover:text-[var(--accent-ink)]"
        >
          Catalog
        </Link>
        <span aria-hidden="true" className="text-[var(--foreground-muted)]">
          /
        </span>
        <span className="font-pixel text-[var(--accent-ink)]">
          {examCode.toUpperCase()}
        </span>
        <span className="text-[var(--foreground-muted)]">{examTitle}</span>
      </div>

      <div className="flex flex-wrap gap-2 text-body">
        {SECTIONS.map(({ segment, label }) => {
          const href = segment ? `${base}/${segment}` : base;
          const active = pathname === href;
          return (
            <Link
              key={label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`tap-target rounded-md border px-3 py-1 transition-colors ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                  : "border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
