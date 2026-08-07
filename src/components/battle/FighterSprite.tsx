import PalSprite from "@/components/PalSprite";
import PixelSprite from "@/components/PixelSprite";
import type { Fighter } from "@/lib/guardians";

/**
 * Renders whichever art a fighter currently has: the raster sheet when one
 * exists, the placeholder matrix otherwise. When a guardian's PixelLab art
 * lands, setting `image` in guardians.ts flips every battle scene and
 * collection slot to the raster with no call-site changes.
 */
export default function FighterSprite({
  fighter,
  size = 96,
  flip = false,
  title,
  className,
}: {
  fighter: Fighter;
  size?: number;
  flip?: boolean;
  title?: string;
  className?: string;
}) {
  if (fighter.sheet) {
    return (
      <PalSprite
        sheet={fighter.sheet}
        size={size}
        flip={flip}
        title={title}
        className={className}
      />
    );
  }
  if (fighter.sprite && fighter.palette) {
    return (
      <PixelSprite
        sprite={fighter.sprite}
        palette={fighter.palette}
        size={size}
        flip={flip}
        title={title}
        className={className}
      />
    );
  }
  return null;
}
