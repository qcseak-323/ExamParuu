"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuizAttempts } from "@/lib/storage";
import { getReviewSummary } from "@/lib/review";

/**
 * "What should I do next?" on the exam hub.
 *
 * A client component because review state is derived from the attempt log in
 * local storage, and the hub page it sits on is a server component that
 * cannot read it.
 *
 * Renders nothing at all until there is something worth saying — a callout
 * that always shows is one people stop reading.
 */
export default function ReviewCallout({ examCode }: { examCode: string }) {
  const attempts = useQuizAttempts();

  const summary = useMemo(
    () => getReviewSummary(examCode, attempts),
    [examCode, attempts],
  );

  if (summary.dueCount === 0 && summary.weakTopics.length === 0) return null;

  const topThree = summary.weakTopics.slice(0, 3);

  return (
    <div className="pixel-panel flex flex-col gap-3 p-5">
      <h2 className="font-pixel text-title text-[var(--accent-ink)]">
        {summary.dueCount > 0
          ? `${summary.dueCount} question${summary.dueCount === 1 ? "" : "s"} due for review`
          : "Nothing due right now"}
      </h2>

      {topThree.length > 0 && (
        <div className="text-body">
          <p className="text-[var(--foreground-muted)]">
            {topThree.length === 1
              ? "The topic giving you the most trouble:"
              : `The ${topThree.length} topics giving you the most trouble:`}
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {topThree.map((topic) => (
              <li key={topic.id} className="flex justify-between gap-3">
                <Link
                  href={`/exams/${examCode}/study#${topic.id}`}
                  className="underline hover:text-[var(--accent-ink)]"
                >
                  {topic.name}
                </Link>
                <span className="shrink-0 text-caption text-[var(--foreground-muted)]">
                  {topic.misses} miss{topic.misses === 1 ? "" : "es"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.dueCount > 0 && (
        <Link
          href={`/exams/${examCode}/quiz?mode=review`}
          className="pixel-button w-fit rounded-md bg-[var(--accent)] px-5 py-2.5 text-body font-medium text-[var(--accent-foreground)]"
        >
          Start review battle ▶
        </Link>
      )}
    </div>
  );
}
