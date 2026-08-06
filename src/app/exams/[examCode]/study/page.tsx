import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalogEntry, getExamContent } from "@/lib/content";
import { requireTrainer } from "@/lib/session";
import StudyRouteClient from "@/components/StudyRouteClient";

// No generateStaticParams: gated behind a session check, so this renders
// per request rather than at build time.

export default async function StudyPage({
  params,
}: {
  params: Promise<{ examCode: string }>;
}) {
  const { examCode } = await params;
  await requireTrainer(`/exams/${examCode}/study`);

  const exam = getCatalogEntry(examCode);
  const content = getExamContent(examCode);
  if (!exam || !content) notFound();

  const { outline, studyGuide } = content;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-pixel text-display">Lessons</h1>
        <p className="mt-3 max-w-2xl text-body text-[var(--foreground-muted)]">
          A concept-level walkthrough of each {exam.code.toUpperCase()}{" "}
          skills area. Take them one at a time — each is a couple of minutes,
          and finishing one counts toward your streak. This isn&apos;t a
          replacement for hands-on time in the real product, but it should
          refresh the vocabulary and decision points the exam likes to test.
        </p>
      </div>

      <StudyRouteClient
        examCode={exam.code}
        domains={outline.domains}
        guide={studyGuide}
      />

      {/* The full prose stays below the index. It is what the section anchors
          point at, so a "read up on this" link from a missed question lands on
          real text rather than on a menu of things to click next. */}
      <div className="mt-8 border-t-4 border-[var(--border)] pt-8">
        <h2 className="font-pixel text-title">Everything in one page</h2>
        <p className="mt-2 text-body text-[var(--foreground-muted)]">
          The same material, unbroken, for skimming or searching.
        </p>
      </div>

      <div className="flex flex-col gap-12">
        {outline.domains.map((domain) => {
          const guide = studyGuide.find((s) => s.domainId === domain.id);
          return (
            <section
              key={domain.id}
              id={domain.id}
              className="scroll-mt-20 border-t-2 border-[var(--border)] pt-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-title font-semibold">{domain.name}</h2>
                <span className="rounded bg-black/5 px-2 py-0.5 text-caption dark:bg-white/10">
                  {domain.weight} of exam
                </span>
              </div>

              <div className="mt-6 flex flex-col gap-8">
                {guide?.sections.map((section) => (
                  // Section-level anchor, so a missed question can link to the
                  // exact passage rather than dumping the reader at the top of
                  // a domain that may run to four sections.
                  <div key={section.id} id={section.id} className="scroll-mt-20">
                    <h3 className="text-body-lg font-medium">{section.heading}</h3>
                    <div className="mt-2 flex flex-col gap-3 text-body text-[var(--foreground)]/90">
                      {section.paragraphs.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/exams/${exam.code}/quiz?domain=${domain.id}`}
                  className="pixel-button rounded-md bg-[var(--accent)] px-4 py-2 text-body font-medium text-[var(--accent-foreground)]"
                >
                  Practice this domain
                </Link>
                <Link
                  href={`/exams/${exam.code}/flashcards?domain=${domain.id}`}
                  className="pixel-button rounded-md bg-[var(--panel)] px-4 py-2 text-body font-medium"
                >
                  Review flashcards
                </Link>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
