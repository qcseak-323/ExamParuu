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
}: {
  params: Promise<{ examCode: string }>;
}) {
  const { examCode } = await params;
  await requireTrainer(`/exams/${examCode}/path`);
  if (!getCatalogEntry(examCode)) notFound();

  return (
    <LearningPathClient
      examCode={examCode}
      paths={getLearningPaths(examCode)}
    />
  );
}
