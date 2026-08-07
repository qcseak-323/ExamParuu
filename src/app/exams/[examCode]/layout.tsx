import { notFound } from "next/navigation";
import ExamNav from "@/components/ExamNav";
import WildEncounter from "@/components/WildEncounter";
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
      {/* Wild questions jump out anywhere on the route except mid-battle —
          the component watches the pathname itself. */}
      {exam.hasContent && <WildEncounter examCode={exam.code} />}
    </>
  );
}
