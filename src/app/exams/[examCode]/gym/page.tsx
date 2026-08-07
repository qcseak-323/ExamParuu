import { notFound } from "next/navigation";
import GymLeaderClient from "@/components/GymLeaderClient";
import { getCatalogEntry, getExamContent } from "@/lib/content";
import { requireTrainer } from "@/lib/session";

/**
 * Paper length is capped at 25 and at half the bank.
 *
 * The cap is a content constraint, not a design preference: DP-600 has 40
 * questions and AB-900 has 27, so a "full-length" paper would consume the
 * whole bank and leave nothing unseen for practice or review afterwards.
 * Raise this as the bank grows.
 */
const MAX_PAPER = 25;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ examCode: string }>;
}) {
  const { examCode } = await params;
  const exam = getCatalogEntry(examCode);
  return {
    title: exam
      ? `${exam.code.toUpperCase()} Dungeon Challenge — ExamParuu`
      : "Dungeon not found",
  };
}

export default async function GymPage({
  params,
}: {
  params: Promise<{ examCode: string }>;
}) {
  const { examCode } = await params;
  const trainer = await requireTrainer(`/exams/${examCode}/gym`);

  const exam = getCatalogEntry(examCode);
  const content = getExamContent(examCode);
  if (!exam || !content) notFound();

  const paperSize = Math.min(
    MAX_PAPER,
    Math.max(10, Math.floor(content.questions.length / 2)),
  );

  return (
    <GymLeaderClient
      examCode={examCode}
      palType={trainer.examPal}
      palNickname={trainer.examPalName}
      paperSize={paperSize}
    />
  );
}
