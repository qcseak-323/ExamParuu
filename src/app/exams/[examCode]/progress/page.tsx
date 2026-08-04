import ExamProgressClient from "@/components/ExamProgressClient";
import { requireTrainer } from "@/lib/session";

// A server shell purely so the session check runs on the server. The page
// used to be a client component, which left nowhere to put the guard.
export default async function ExamProgressPage({
  params,
}: {
  params: Promise<{ examCode: string }>;
}) {
  const { examCode } = await params;
  await requireTrainer(`/exams/${examCode}/progress`);

  return <ExamProgressClient examCode={examCode} />;
}
