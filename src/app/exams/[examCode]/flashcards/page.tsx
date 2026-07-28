import { Suspense } from "react";
import { notFound } from "next/navigation";
import FlashcardsClient from "@/components/FlashcardsClient";
import { catalog, getCatalogEntry } from "@/lib/content";

export function generateStaticParams() {
  return catalog.map((exam) => ({ examCode: exam.code }));
}

export default async function FlashcardsPage({
  params,
}: {
  params: Promise<{ examCode: string }>;
}) {
  const { examCode } = await params;
  if (!getCatalogEntry(examCode)) notFound();

  return (
    <Suspense fallback={null}>
      <FlashcardsClient examCode={examCode} />
    </Suspense>
  );
}
