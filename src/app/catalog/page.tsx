import Link from "next/link";
import { catalog } from "@/lib/content";
import { getDisplayTier, getRetroLabel } from "@/lib/levels";
import { requireTrainer } from "@/lib/session";

export const metadata = {
  title: "Exam Catalog — ExamReady",
};

const STATUS_LABEL: Record<string, string> = {
  GA: "Generally available",
  beta: "Beta",
  retiring: "Retiring",
};

export default async function CatalogPage() {
  await requireTrainer("/catalog");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-pixel text-2xl">Exam Catalog</h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--foreground-muted)]">
          Pick a route to train on. Each exam maps to Microsoft&apos;s real
          certification level — we just give it a friendlier tier and a
          retro nickname.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {catalog.map((exam) => (
          <Link
            key={exam.code}
            href={`/exams/${exam.code}`}
            className="pixel-panel flex flex-col gap-3 p-5 hover:-translate-y-0.5 transition-transform"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-pixel text-xs text-[var(--accent)]">
                {exam.code.toUpperCase()}
              </span>
              <span className="rounded bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
                {STATUS_LABEL[exam.status] ?? exam.status}
              </span>
            </div>
            <h2 className="font-medium leading-snug">{exam.title}</h2>
            <p className="text-sm text-[var(--foreground-muted)]">
              {exam.summary}
            </p>
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-2 text-xs">
              <span className="rounded-full border border-[var(--border)] px-2 py-0.5">
                {getRetroLabel(exam.msLevel)}
              </span>
              <span className="text-[var(--foreground-muted)]">
                {getDisplayTier(exam.msLevel)} · {exam.family}
              </span>
            </div>
            {!exam.hasContent && (
              <span className="text-xs italic text-[var(--foreground-muted)]">
                Content coming soon
              </span>
            )}
          </Link>
        ))}

        <div className="pixel-panel flex flex-col justify-center gap-2 p-5 text-center text-sm text-[var(--foreground-muted)]">
          <p className="font-pixel text-xs">More routes soon</p>
          <p>
            Additional certifications — including the rest of the AB (AI
            Business) series — will be added here once verified against
            Microsoft Learn.
          </p>
        </div>
      </div>
    </div>
  );
}
