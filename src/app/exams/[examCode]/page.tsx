import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalogEntry, getExamContent } from "@/lib/content";
import { getDisplayTier, getRetroLabel } from "@/lib/levels";
import { requireTrainer } from "@/lib/session";
import ReviewCallout from "@/components/ReviewCallout";

// No generateStaticParams: these routes are behind a session check now, so
// they render per request and can't be prerendered at build time.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ examCode: string }>;
}) {
  const { examCode } = await params;
  const exam = getCatalogEntry(examCode);
  return { title: exam ? `${exam.code.toUpperCase()} — ExamParuu` : "Exam not found" };
}

export default async function ExamOverviewPage({
  params,
}: {
  params: Promise<{ examCode: string }>;
}) {
  const { examCode } = await params;
  await requireTrainer(`/exams/${examCode}`);

  const exam = getCatalogEntry(examCode);
  if (!exam) notFound();

  const content = getExamContent(examCode);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-caption">
          <span className="font-pixel text-[var(--accent-ink)]">
            {exam.code.toUpperCase()}
          </span>
          <span className="rounded-full border border-[var(--border)] px-2 py-0.5">
            {getRetroLabel(exam.msLevel)}
          </span>
          <span className="text-[var(--foreground-muted)]">
            {getDisplayTier(exam.msLevel)} tier · {exam.family} · {exam.status}
          </span>
        </div>
        <h1 className="mt-2 text-display font-bold tracking-tight">
          {exam.title}
        </h1>
        <p className="prose-measure mt-3 text-body-lg text-[var(--foreground-muted)]">
          {exam.summary}
        </p>

        <dl className="mt-4 grid max-w-md grid-cols-2 gap-x-6 gap-y-2 text-body">
          <dt className="text-[var(--foreground-muted)]">Duration</dt>
          <dd>{exam.durationMinutes ? `${exam.durationMinutes} minutes` : "Not yet verified"}</dd>
          <dt className="text-[var(--foreground-muted)]">Passing score</dt>
          <dd>{exam.passingScore ?? "Not yet verified"}</dd>
          <dt className="text-[var(--foreground-muted)]">Catalog verified</dt>
          <dd>{exam.catalogVerifiedAt ?? "Not yet verified"}</dd>
        </dl>

        {exam.sourceUrl && (
          <p className="mt-3 text-caption text-[var(--foreground-muted)]">
            Official page:{" "}
            <a
              href={exam.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-[var(--accent-ink)]"
            >
              learn.microsoft.com
            </a>
          </p>
        )}
      </div>

      {!exam.hasContent && (
        <div className="pixel-panel p-6 text-body">
          <p className="font-medium">Content coming soon</p>
          <p className="mt-2 text-[var(--foreground-muted)]">
            This exam is listed in the catalog but the practice questions,
            study guide, and flashcards haven&apos;t been written yet.
          </p>
        </div>
      )}

      {exam.hasContent && content && (
        <>
          <ReviewCallout examCode={exam.code} />

          <section>
            <h2 className="mb-4 font-pixel text-title">Skills areas</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {content.outline.domains.map((domain) => (
                <div key={domain.id} className="pixel-panel p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-body font-medium">{domain.name}</h3>
                    <span className="shrink-0 rounded bg-black/5 px-2 py-0.5 text-caption dark:bg-white/10">
                      {domain.weight}
                    </span>
                  </div>
                  {/* subtopics have been authored in every outline file since
                      the start and rendered nowhere until now. */}
                  {domain.subtopics.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1 text-caption text-[var(--foreground-muted)]">
                      {domain.subtopics.map((subtopic) => (
                        <li key={subtopic} className="flex gap-2">
                          <span aria-hidden="true">·</span>
                          <span>{subtopic}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-3 text-caption text-[var(--foreground-muted)]">
              {content.outline.note}
            </p>
          </section>

          {/* The two ways to play, side by side. Practice is the learning
              loop with no clock; Exam is everything with a timer on it. */}
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="pixel-panel flex flex-col gap-3 p-6">
              <h2 className="font-pixel text-title">Practice Mode</h2>
              <p className="text-body text-[var(--foreground-muted)]">
                No clock. Wrong answers open a lesson on the spot, and tricky
                vocabulary comes back as flashcards until it sticks.
              </p>
              <div className="mt-auto flex flex-wrap gap-3 pt-2">
                <Link
                  href={`/exams/${exam.code}/quiz`}
                  className="pixel-button rounded-md bg-[var(--accent)] px-5 py-2.5 text-body font-medium text-[var(--accent-foreground)]"
                >
                  Start practice battle
                </Link>
                <Link
                  href={`/exams/${exam.code}/study`}
                  className="pixel-button rounded-md bg-[var(--panel)] px-5 py-2.5 text-body font-medium"
                >
                  Study guide
                </Link>
                <Link
                  href={`/exams/${exam.code}/flashcards`}
                  className="pixel-button rounded-md bg-[var(--panel)] px-5 py-2.5 text-body font-medium"
                >
                  Flashcards
                </Link>
              </div>
            </div>

            <div className="pixel-panel flex flex-col gap-3 p-6">
              <h2 className="font-pixel text-title">Exam Mode</h2>
              <p className="text-body text-[var(--foreground-muted)]">
                The clock is running. The Proving replicates the real exam —
                {exam.durationMinutes
                  ? ` ${exam.durationMinutes} minutes,`
                  : ""}{" "}
                no feedback until the score report. The dungeon is a shorter
                timed mock guarding this route.
              </p>
              <div className="mt-auto flex flex-wrap gap-3 pt-2">
                <Link
                  href={`/exams/${exam.code}/exam`}
                  className="pixel-button rounded-md bg-[var(--accent)] px-5 py-2.5 text-body font-medium text-[var(--accent-foreground)]"
                >
                  The Proving — real format
                </Link>
                <Link
                  href={`/exams/${exam.code}/gym`}
                  className="pixel-button rounded-md bg-[var(--panel)] px-5 py-2.5 text-body font-medium"
                >
                  Challenge the dungeon
                </Link>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/exams/${exam.code}/progress`}
              className="pixel-button rounded-md bg-[var(--panel)] px-5 py-2.5 text-body font-medium"
            >
              View progress
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
