import PalSprite from "@/components/PalSprite";

/**
 * Prof. Sequel's portrait, shown beside anything he says.
 *
 * Decorative on purpose (no accessible name): the dialogue's speaker tab
 * already announces who is talking, so a labelled image would read twice.
 * Every size is an integer multiple of a source grid (PalSprite picks the
 * sheet): md is 96 = 2× 48 from sm up and 64 = 2× 32 on phones; lg — used
 * where the professor is the scene, like the setup introduction — is
 * 192 = 4× 48 from sm up and 96 = 2× 48 on phones.
 */
export default function ProfessorPortrait({
  size = "md",
}: {
  size?: "md" | "lg";
}) {
  const desktop = size === "lg" ? 192 : 96;
  const mobile = size === "lg" ? 96 : 64;

  return (
    <>
      <div className="hidden shrink-0 sm:block">
        <PalSprite sheet="professor" size={desktop} />
      </div>
      <div className="shrink-0 sm:hidden">
        <PalSprite sheet="professor" size={mobile} />
      </div>
    </>
  );
}
