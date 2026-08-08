/**
 * Trainer profile answers collected during first-run setup.
 *
 * Expertise is self-reported and deliberately does not gate anything — it
 * only changes the wording of guidance. Locking content behind a
 * self-assessment would punish people for being honest about being new.
 */

export type TrainerAvatar = "boy" | "girl";

export const TRAINER_AVATARS: {
  id: TrainerAvatar;
  /** Sheet name under /pals for PalSprite. */
  sheet: string;
  label: string;
  hint: string;
}[] = [
  {
    id: "boy",
    sheet: "trainer-boy",
    label: "Boy trainer",
    hint: "Cap and satchel",
  },
  {
    id: "girl",
    sheet: "trainer-girl",
    label: "Girl trainer",
    hint: "Storm coat and compass",
  },
];

export function isTrainerAvatar(value: unknown): value is TrainerAvatar {
  return value === "boy" || value === "girl";
}

export function trainerAvatarSheet(value: string | null): string | null {
  return TRAINER_AVATARS.find((a) => a.id === value)?.sheet ?? null;
}

export type ExpertiseLevel = "new" | "some" | "certified";

export const EXPERTISE_LEVELS: ExpertiseLevel[] = ["new", "some", "certified"];

export function isExpertiseLevel(value: unknown): value is ExpertiseLevel {
  return (
    typeof value === "string" &&
    EXPERTISE_LEVELS.includes(value as ExpertiseLevel)
  );
}

export const EXPERTISE_OPTIONS: {
  id: ExpertiseLevel;
  label: string;
  hint: string;
  /** Shown back to the trainer after they pick. */
  response: string;
}[] = [
  {
    id: "new",
    label: "Brand new to this",
    hint: "Never sat a Microsoft exam",
    response:
      "Everyone starts somewhere. Read the study guide for a route before you battle it, and the questions will feel far less strange.",
  },
  {
    id: "some",
    label: "I've studied before",
    hint: "Some experience, not certified yet",
    response:
      "Good — you'll know the vocabulary already. Battle first, then use the missed-question review to find the gaps.",
  },
  {
    id: "certified",
    label: "Already certified",
    hint: "Hold one or more certifications",
    response:
      "Then you know the drill. Go straight to full-length battles and treat anything under 70% as a topic to revisit.",
  },
];

export function expertiseLabel(value: string | null): string | null {
  return EXPERTISE_OPTIONS.find((o) => o.id === value)?.label ?? null;
}
