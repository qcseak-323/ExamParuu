import Link from "next/link";
import { outline, studyGuide } from "@/lib/content";

export const metadata = {
  title: "Study Guide — ExamReady DP-600",
};

export default function StudyPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Study guide</h1>
        <p className="mt-2 max-w-2xl text-sm text-black/70 dark:text-white/70">
          A concept-level walkthrough of each DP-600 skills area. This isn&apos;t
          a replacement for hands-on time in Fabric, but it should refresh the
          vocabulary and decision points the exam likes to test.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 py-2 text-sm">
        {outline.domains.map((domain) => (
          <a
            key={domain.id}
            href={`#${domain.id}`}
            className="rounded-full border border-black/10 px-3 py-1 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
          >
            {domain.name}
          </a>
        ))}
      </nav>

      <div className="flex flex-col gap-12">
        {outline.domains.map((domain) => {
          const guide = studyGuide.find((s) => s.domainId === domain.id);
          return (
            <section
              key={domain.id}
              id={domain.id}
              className="scroll-mt-20 border-t border-black/10 pt-8 dark:border-white/10"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-2xl font-semibold">{domain.name}</h2>
                <span className="rounded bg-black/5 px-2 py-0.5 text-xs text-black/60 dark:bg-white/10 dark:text-white/60">
                  {domain.weight} of exam
                </span>
              </div>

              <div className="mt-6 flex flex-col gap-8">
                {guide?.sections.map((section) => (
                  <div key={section.heading}>
                    <h3 className="text-lg font-medium">{section.heading}</h3>
                    <div className="mt-2 flex flex-col gap-3 text-sm leading-relaxed text-black/80 dark:text-white/80">
                      {section.paragraphs.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/quiz?domain=${domain.id}`}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  Practice this domain
                </Link>
                <Link
                  href={`/flashcards?domain=${domain.id}`}
                  className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
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
