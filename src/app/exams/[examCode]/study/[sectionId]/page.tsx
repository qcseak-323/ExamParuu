import { notFound } from "next/navigation";
import LessonClient from "@/components/LessonClient";
import { getCatalogEntry, getSection, getSections } from "@/lib/content";
import { requireTrainer } from "@/lib/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ examCode: string; sectionId: string }>;
}) {
  const { examCode, sectionId } = await params;
  const found = getSection(examCode, sectionId);
  return {
    title: found ? `${found.section.heading} — ExamParuu` : "Lesson not found",
  };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ examCode: string; sectionId: string }>;
}) {
  const { examCode, sectionId } = await params;
  await requireTrainer(`/exams/${examCode}/study/${sectionId}`);

  if (!getCatalogEntry(examCode)) notFound();

  const found = getSection(examCode, sectionId);
  if (!found) notFound();

  // "Next" walks the whole exam in authored order, crossing domain boundaries,
  // so a trainer can read straight through without returning to the index.
  const all = getSections(examCode);
  const index = all.findIndex((s) => s.section.id === sectionId);
  const next = index >= 0 ? all[index + 1] : undefined;

  return (
    <LessonClient
      examCode={examCode}
      domainId={found.domainId}
      section={found.section}
      nextSectionId={next?.section.id ?? null}
    />
  );
}
