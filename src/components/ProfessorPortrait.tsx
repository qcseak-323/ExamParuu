import PalSprite from "@/components/PalSprite";

/**
 * Prof. Sequel's portrait, shown beside anything he says.
 *
 * Decorative on purpose (no accessible name): the dialogue's speaker tab
 * already announces who is talking, so a labelled image would read twice.
 * Two sizes because each must be an integer multiple of a source grid:
 * 96 = 2× the 48px sheet from sm up, 64 = 2× the 32px sheet on phones.
 */
export default function ProfessorPortrait() {
  return (
    <>
      <div className="hidden shrink-0 sm:block">
        <PalSprite sheet="professor" size={96} />
      </div>
      <div className="shrink-0 sm:hidden">
        <PalSprite sheet="professor" size={64} />
      </div>
    </>
  );
}
