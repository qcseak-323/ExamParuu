import { redirect } from "next/navigation";
import SetupClient from "@/components/SetupClient";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Trainer setup — ExamReady" };

export default async function SetupPage() {
  // requireUser rather than requireTrainer: this is the page that *creates*
  // the trainer, so requiring one here would be a redirect loop.
  const user = await requireUser("/setup");

  // Setup happens exactly once. examPal is the completion marker because the
  // whole profile is written in a single update at the end of the flow.
  if (user.examPal) redirect("/catalog");

  return <SetupClient email={user.email} />;
}
