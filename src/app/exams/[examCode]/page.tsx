import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalogEntry, getExamContent } from "@/lib/content";
import { getDisplayTier, getRetroLabel } from "@/lib/levels";
import { requireTrainer } from "@/lib/session";

// No generateStaticParams: these routes are behind a session check now, so
// they render per request and can't be prerendered at build time.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ examCode: string }>;
}) {
  const { examCode } = await params;
  const exam = getCatalogEntry(examCode);
  return { title: exam ? `${exam.code.toUpperCase()} — ExamReady` : "Exam not found" };
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
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-pixel text-[var(--accent)]">
            {exam.code.toUpperCase()}
          </span>
          <span className="rounded-full border border-[var(--border)] px-2 py-0.5">
            {getRetroLabel(exam.msLevel)}
          </span>
          <span className="text-[var(--foreground-muted)]">
            {getDisplayTier(exam.msLevel)} tier · {exam.family} · {exam.status}
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          {exam.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--foreground-muted)]">
          {exam.summary}
        </p>

        <dl className="mt-4 grid max-w-md grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <dt className="text-[var(--foreground-muted)]">Duration</dt>
          <dd>{exam.durationMinutes ? `${exam.durationMinutes} minutes` : "Not yet verified"}</dd>
          <dt className="text-[var(--foreground-muted)]">Passing score</dt>
          <dd>{exam.passingScore ?? "Not yet verified"}</dd>
          <dt className="text-[var(--foreground-muted)]">Catalog verified</dt>
          <dd>{exam.catalogVerifiedAt ?? "Not yet verified"}</dd>
        </dl>

        {exam.sourceUrl && (
          <p className="mt-3 text-xs text-[var(--foreground-muted)]">
            Official page:{" "}
            <a
              href={exam.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-[var(--accent)]"
            >
              learn.microsoft.com
            </a>
          </p>
        )}
      </div>

      {!exam.hasContent && (
        <div className="pixel-panel p-6 text-sm">
          <p className="font-medium">Content coming soon</p>
          <p className="mt-2 text-[var(--foreground-muted)]">
            This exam is listed in the catalog but the practice questions,
            study guide, and flashcards haven&apos;t been written yet.
          </p>
        </div>
      )}

      {exam.hasContent && content && (
        <>
          <section>
            <h2 className="mb-4 font-pixel text-sm">Skills areas</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {content.outline.domains.map((domain) => (
                <div key={domain.id} className="pixel-panel p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-medium">{domain.name}</h3>
                    <span className="shrink-0 rounded bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
                      {domain.weight}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-[var(--foreground-muted)]">
              {content.outline.note}
            </p>
          </section>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/exams/${exam.code}/study`}
              className="pixel-button rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--accent-foreground)]"
            >
              Read study guide
            </Link>
            <Link
              href={`/exams/${exam.code}/quiz`}
              className="pixel-button rounded-md bg-[var(--panel)] px-5 py-2.5 text-sm font-medium"
            >
              Start practice quiz
            </Link>
            <Link
              href={`/exams/${exam.code}/flashcards`}
              className="pixel-button rounded-md bg-[var(--panel)] px-5 py-2.5 text-sm font-medium"
            >
              Review flashcards
            </Link>
            <Link
              href={`/exams/${exam.code}/progress`}
              className="pixel-button rounded-md bg-[var(--panel)] px-5 py-2.5 text-sm font-medium"
            >
              View progress
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
