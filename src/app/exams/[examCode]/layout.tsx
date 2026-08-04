import { notFound } from "next/navigation";
import ExamNav from "@/components/ExamNav";
import { getCatalogEntry } from "@/lib/content";

export default async function ExamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ examCode: string }>;
}) {
  const { examCode } = await params;
  const exam = getCatalogEntry(examCode);
  if (!exam) notFound();

  return (
    <>
      <ExamNav examCode={exam.code} examTitle={exam.title} />
      {children}
    </>
  );
}
