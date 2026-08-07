import { notFound } from "next/navigation";
import ExamSimClient from "@/components/ExamSimClient";
import { getCatalogEntry, getExamContent } from "@/lib/content";
import { requireTrainer } from "@/lib/session";

/**
 * The Proving: the real certification format — full paper, real clock,
 * scaled 100–1000 score, no feedback until the score report.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ examCode: string }>;
}) {
  const { examCode } = await params;
  const exam = getCatalogEntry(examCode);
  return {
    title: exam
      ? `The Proving · ${exam.code.toUpperCase()} — ExamParuu`
      : "Exam not found",
  };
}

export default async function ExamSimPage({
  params,
}: {
  params: Promise<{ examCode: string }>;
}) {
  const { examCode } = await params;
  await requireTrainer(`/exams/${examCode}/exam`);

  const exam = getCatalogEntry(examCode);
  const content = getExamContent(examCode);
  if (!exam || !content) notFound();

  return <ExamSimClient examCode={examCode} />;
}
