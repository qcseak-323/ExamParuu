export type MsLevel =
  | "Fundamentals"
  | "Associate"
  | "Expert"
  | "Specialty"
  | "Applied Skills";

export const LEVEL_INFO: Record<
  MsLevel,
  { displayTier: string; retroLabel: string }
> = {
  Fundamentals: { displayTier: "Fundamental", retroLabel: "Starter Route" },
  Associate: { displayTier: "Intermediate", retroLabel: "Mid Route" },
  Expert: { displayTier: "Advanced", retroLabel: "Victory Road" },
  Specialty: { displayTier: "Advanced (Specialty)", retroLabel: "Side Quest" },
  "Applied Skills": { displayTier: "Practical", retroLabel: "Field Mission" },
};

export function getDisplayTier(level: MsLevel): string {
  return LEVEL_INFO[level].displayTier;
}

export function getRetroLabel(level: MsLevel): string {
  return LEVEL_INFO[level].retroLabel;
}
