import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalogEntry, getExamContent } from "@/lib/content";
import { getDisplayTier, getRetroLabel } from "@/lib/levels";
import { requireTrainer } from "@/lib/session";
import ReviewCallout from "@/components/ReviewCallout";
import ModePanels from "@/components/ModePanels";

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

        {/* The facts that matter, on one line instead of a definition list:
            how much practice there is, how long the real paper runs, what it
            takes to pass, and where the blueprint came from. */}
        <p className="mt-3 text-caption text-[var(--foreground-muted)]">
          {[
            content ? `${content.questions.length} questions in the bank` : null,
            exam.durationMinutes ? `${exam.durationMinutes}-minute Proving` : null,
            exam.passingScore ? `${exam.passingScore} to pass` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          {exam.sourceUrl && (
            <>
              {" · "}
              <a
                href={exam.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-[var(--accent-ink)]"
              >
                official page ↗
              </a>
            </>
          )}
        </p>
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

          {/* The two ways to play, above the blueprint. Choosing what to do
              is why someone opens this page; the skills-area weights are
              reference they scroll to afterwards, so the order used to be
              backwards. Each box is now one action with a selector behind
              it — see ModePanels. */}
          <ModePanels examCode={exam.code} />

          {/* One line per skills area with its blueprint weight. The
              subtopics under each used to be listed here; they belong to the
              study guide, and this page is meant to be scanned. */}
          <section>
            <h2 className="mb-4 font-pixel text-title">Skills areas</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {content.outline.domains.map((domain) => (
                <div
                  key={domain.id}
                  className="pixel-panel flex items-center justify-between gap-3 px-4 py-3"
                >
                  <h3 className="text-body font-medium">{domain.name}</h3>
                  <span className="shrink-0 rounded border-2 border-[var(--border)] px-2 py-0.5 text-caption font-semibold">
                    {domain.weight}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-caption text-[var(--foreground-muted)]">
              {content.outline.note}
            </p>
          </section>

          <Link
            href={`/exams/${exam.code}/progress`}
            className="tap-target w-fit text-caption underline hover:text-[var(--accent-ink)]"
          >
            View progress on this route →
          </Link>
        </>
      )}
    </div>
  );
}
