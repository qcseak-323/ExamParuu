import { redirect } from "next/navigation";
import ChoosePalClient from "@/components/ChoosePalClient";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Choose your ExamPal — ExamReady" };

export default async function ChoosePalPage() {
  // requireUser rather than requireTrainer: this is the page that *creates*
  // the trainer, so requiring one here would be a redirect loop.
  const user = await requireUser("/choose-pal");

  // Starter select happens exactly once.
  if (user.examPal) redirect("/catalog");

  return <ChoosePalClient email={user.email} />;
}
