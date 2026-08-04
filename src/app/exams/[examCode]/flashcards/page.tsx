import { Suspense } from "react";
import { notFound } from "next/navigation";
import FlashcardsClient from "@/components/FlashcardsClient";
import { getCatalogEntry } from "@/lib/content";
import { requireTrainer } from "@/lib/session";

// No generateStaticParams: gated behind a session check, so this renders
// per request rather than at build time.

export default async function FlashcardsPage({
  params,
}: {
  params: Promise<{ examCode: string }>;
}) {
  const { examCode } = await params;
  await requireTrainer(`/exams/${examCode}/flashcards`);
  if (!getCatalogEntry(examCode)) notFound();

  return (
    <Suspense fallback={null}>
      <FlashcardsClient examCode={examCode} />
    </Suspense>
  );
}
