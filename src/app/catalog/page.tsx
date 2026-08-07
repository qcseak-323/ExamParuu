import CatalogClient from "@/components/CatalogClient";
import { requireTrainer } from "@/lib/session";

export const metadata = {
  title: "Region map — ExamParuu",
};

export default async function CatalogPage() {
  const trainer = await requireTrainer("/catalog");

  return <CatalogClient priorityExam={trainer.priorityExam} />;
}
