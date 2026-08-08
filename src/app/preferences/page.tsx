import PreferencesClient from "@/components/PreferencesClient";
import { requireUser } from "@/lib/session";
import { PAL_SPECIES } from "@/lib/pals";

export const metadata = { title: "Preferences — ExamParuu" };

export default async function PreferencesPage() {
  // requireUser, not requireTrainer: a trainer who hasn't picked a starter yet
  // should still be able to reach accessibility and sound settings.
  const user = await requireUser("/preferences");

  return (
    <PreferencesClient
      email={user.email}
      // Only a finished profile has an identity to edit; everyone else is
      // still on their way through setup, which is where it gets created.
      profile={
        user.examPal
          ? {
              currentName: user.trainerName,
              currentAvatar: user.trainerAvatar,
              currentNickname: user.examPalName,
              palName: PAL_SPECIES[user.examPal].stages[0].name,
            }
          : null
      }
    />
  );
}
