import { Suspense } from "react";
import { notFound } from "next/navigation";
import QuizClient from "@/components/QuizClient";
import { getCatalogEntry } from "@/lib/content";
import { requireTrainer } from "@/lib/session";

// No generateStaticParams: gated behind a session check, so this renders
// per request rather than at build time.

export default async function QuizPage({
  params,
}: {
  params: Promise<{ examCode: string }>;
}) {
  const { examCode } = await params;
  const trainer = await requireTrainer(`/exams/${examCode}/quiz`);
  if (!getCatalogEntry(examCode)) notFound();

  return (
    <Suspense fallback={null}>
      <QuizClient
        examCode={examCode}
        palType={trainer.examPal}
        palNickname={trainer.examPalName}
        trainerAvatar={trainer.trainerAvatar}
        trainerName={trainer.trainerName}
      />
    </Suspense>
  );
}
