"use client";

import { useMemo } from "react";
import { catalog, getExamContent } from "@/lib/content";
import { getDisplayTier, getRetroLabel } from "@/lib/levels";
import { useQuizAttempts } from "@/lib/storage";
import { computeBadges } from "@/lib/gamification";
import GymMap, { type GymStop } from "@/components/GymMap";

/**
 * Exam selection.
 *
 * A client component because badge progress is read from local storage, which
 * is the read path for all progress in this app. The server only supplies the
 * trainer's pinned route.
 */
export default function CatalogClient({
  priorityExam,
}: {
  priorityExam: string | null;
}) {
  const attempts = useQuizAttempts();

  const stops: GymStop[] = useMemo(
    () =>
      catalog.map((exam) => {
        const domains = getExamContent(exam.code)?.outline.domains ?? [];
        const badges = computeBadges(exam.code, domains, attempts);
        return {
          code: exam.code,
          title: exam.title,
          tier: `${getRetroLabel(exam.msLevel)} · ${getDisplayTier(exam.msLevel)}`,
          playable: Boolean(exam.hasContent),
          badgesEarned: badges.filter((b) => b.earned).length,
          badgesTotal: badges.length,
          // "Gym cleared" is derived, not stored: a mock attempt that hit the
          // pass mark. The sentinel in domainFilter is what marks it as one.
          gymCleared: attempts.some(
            (a) =>
              a.examCode === exam.code &&
              a.domainFilter === "mock" &&
              a.numQuestions > 0 &&
              a.correctCount / a.numQuestions >= 0.7,
          ),
          prioritised: exam.code === priorityExam,
        };
      }),
    [attempts, priorityExam],
  );

  const pinned = stops.find((s) => s.prioritised);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-pixel text-display">Region map</h1>
        <p className="mt-3 max-w-2xl text-body text-[var(--foreground-muted)]">
          {pinned
            ? `Every gym on this map is a Microsoft certification. You pinned ${pinned.code.toUpperCase()} — head there first, or take any route you like.`
            : "Every gym on this map is a Microsoft certification. Walk the route and take them in any order."}
        </p>
      </div>

      <GymMap stops={stops} />

      {/* The map is the way in, but it is a positioned layout that is awkward
          to scan with a screen reader or on a narrow phone. This list is the
          same set of destinations in plain reading order. */}
      <section>
        <h2 className="mb-3 font-pixel text-title">All routes</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {stops.map((stop) => (
            <li key={stop.code} className="pixel-panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-pixel text-label text-[var(--accent)]">
                  {stop.code.toUpperCase()}
                </span>
                {stop.prioritised && (
                  <span className="rounded-full bg-[var(--warning)] px-2 py-0.5 text-caption font-medium text-[#2a1c00]">
                    ★ Your route
                  </span>
                )}
              </div>
              <p className="mt-1 text-body font-medium">{stop.title}</p>
              <p className="mt-1 text-caption text-[var(--foreground-muted)]">
                {stop.tier}
              </p>
              <p className="mt-2 text-caption text-[var(--foreground-muted)]">
                {stop.playable
                  ? `${stop.badgesEarned}/${stop.badgesTotal} route ribbons${stop.gymCleared ? " · ✓ gym cleared" : ""}`
                  : "Content coming soon"}
              </p>
              {stop.playable && (
                <a
                  href={`/exams/${stop.code}`}
                  className="mt-3 inline-block text-body underline hover:text-[var(--accent)]"
                >
                  Travel to {stop.code.toUpperCase()}
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
