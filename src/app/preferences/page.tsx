import PreferencesClient from "@/components/PreferencesClient";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Preferences — ExamReady" };

export default async function PreferencesPage() {
  // requireUser, not requireTrainer: a trainer who hasn't picked a starter yet
  // should still be able to reach accessibility and sound settings.
  const user = await requireUser("/preferences");

  return <PreferencesClient email={user.email} />;
}
