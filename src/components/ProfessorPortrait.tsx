import PalSprite from "@/components/PalSprite";
import { PROFESSOR_SHEET } from "@/lib/assets";

/**
 * Prof. Sequel's portrait, shown beside anything he says.
 *
 * Decorative on purpose (no accessible name): the dialogue's speaker tab
 * already announces who is talking, so a labelled image would read twice.
 *
 * Every size is an integer multiple of a source grid, which `sourceFor` picks
 * from the manifest. Since the 96 tier landed: md is 96 native from sm up and
 * 64 native on phones; lg — used where the professor is the scene, like the
 * setup introduction — is 192 = 2× 96 from sm up and 96 native on phones.
 *
 * lg was previously 4× the 48px file, which is what made him look soft beside
 * the rest of the cast. It was never an art problem: the old `sourceFor`
 * tested `size % 48` first, so it answered 48 for every size it could, and
 * the 128 masters it could theoretically have reached were unquantised and
 * unservable anyway.
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
        <PalSprite sheet={PROFESSOR_SHEET} size={desktop} />
      </div>
      <div className="shrink-0 sm:hidden">
        <PalSprite sheet={PROFESSOR_SHEET} size={mobile} />
      </div>
    </>
  );
}
