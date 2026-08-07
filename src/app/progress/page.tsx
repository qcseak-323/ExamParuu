import ProgressClient from "@/components/ProgressClient";
import { requireTrainer } from "@/lib/session";

export const metadata = { title: "Trainer card — ExamReady" };

export default async function ProgressPage() {
  const trainer = await requireTrainer("/progress");

  return (
    <ProgressClient
      palType={trainer.examPal}
      palNickname={trainer.examPalName}
      email={trainer.email}
    />
  );
}
