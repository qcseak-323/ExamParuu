import { notFound } from "next/navigation";
import LearningPathClient from "@/components/LearningPathClient";
import { getCatalogEntry } from "@/lib/content";
import { getLearningPaths } from "@/lib/learningPath";
import { requireTrainer } from "@/lib/session";

// Gated behind a session check, so it renders per request rather than at
// build time — same as every other route under /exams.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ examCode: string }>;
}) {
  const { examCode } = await params;
  const exam = getCatalogEntry(examCode);
  return {
    title: exam
      ? `${exam.code.toUpperCase()} learning path — ExamParuu`
      : "Exam not found",
  };
}

export default async function LearningPathPage({
  params,
  searchParams,
}: {
  params: Promise<{ examCode: string }>;
  searchParams: Promise<{ path?: string }>;
}) {
  const { examCode } = await params;
  const { path } = await searchParams;
  await requireTrainer(`/exams/${examCode}/path`);
  if (!getCatalogEntry(examCode)) notFound();

  const paths = getLearningPaths(examCode);

  // `?path=<id>` opens straight onto that path's modules — how the overview
  // page's Learning Path selector deep-links. Resolved here rather than with
  // useSearchParams in the client so the correct screen is in the very first
  // render and there is no flash of the path picker.
  const initialPathId = paths.some((p) => p.id === path) ? path : null;

  return (
    <LearningPathClient
      examCode={examCode}
      paths={paths}
      initialPathId={initialPathId ?? null}
    />
  );
}
