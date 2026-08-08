/**
 * Trainer profile answers collected during first-run setup.
 *
 * Familiarity is self-reported and deliberately does not gate anything — it
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

/**
 * How well the trainer already knows the exam series they picked.
 *
 * Asked *after* the route, and about that route specifically — "how well do
 * you know AZ · Azure", not "how experienced are you". That is why the three
 * answers borrow the certification tier words rather than the generic
 * beginner/intermediate/expert ladder: they name a level of the thing in
 * front of you.
 *
 * Stored in the existing `User.expertise` column. It has been nullable text
 * since the first migration and nothing has ever branched on its contents, so
 * this needed no migration against the shared database — which is the whole
 * reason the column was left in place when the old question was dropped.
 * Values written before V0.07 ("new" | "some" | "certified") are still in
 * there; `familiarityLabel` returns null for them rather than guessing.
 */
export type Familiarity = "fundamental" | "intermediate" | "advanced";

export const FAMILIARITY_LEVELS: Familiarity[] = [
  "fundamental",
  "intermediate",
  "advanced",
];

export function isFamiliarity(value: unknown): value is Familiarity {
  return (
    typeof value === "string" &&
    FAMILIARITY_LEVELS.includes(value as Familiarity)
  );
}

export const FAMILIARITY_OPTIONS: {
  id: Familiarity;
  label: string;
  hint: string;
  /** Shown back to the trainer after they pick. */
  response: string;
}[] = [
  {
    id: "fundamental",
    label: "Fundamental",
    hint: "New to this series",
    response:
      "Then we start at the shoreline. Read a lesson before you battle it and the questions will feel far less strange.",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    hint: "I've worked with it before",
    response:
      "Good — the vocabulary won't slow you down. Battle first, then let the missed-question review find your gaps.",
  },
  {
    id: "advanced",
    label: "Advanced",
    hint: "I know this series well",
    response:
      "Then you know the drill. Go straight to full-length battles and treat anything under 70% as a topic to revisit.",
  },
];

export function familiarityLabel(value: string | null): string | null {
  return FAMILIARITY_OPTIONS.find((o) => o.id === value)?.label ?? null;
}
