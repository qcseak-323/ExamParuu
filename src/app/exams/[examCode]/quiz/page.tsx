import { Suspense } from "react";
import { notFound } from "next/navigation";
import QuizClient from "@/components/QuizClient";
import { catalog, getCatalogEntry } from "@/lib/content";

export function generateStaticParams() {
  return catalog.map((exam) => ({ examCode: exam.code }));
}

export default async function QuizPage({
  params,
}: {
  params: Promise<{ examCode: string }>;
}) {
  const { examCode } = await params;
  if (!getCatalogEntry(examCode)) notFound();

  return (
    <Suspense fallback={null}>
      <QuizClient examCode={examCode} />
    </Suspense>
  );
}
