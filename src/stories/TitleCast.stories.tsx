import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PAL_SPECIES, type PalType } from "@/lib/pals";
import { trainerMapSheet, TRAINER_AVATARS } from "@/lib/profile";
import PalSprite from "@/components/PalSprite";

/**
 * The pair that stands under the button on the title screen.
 *
 * Both figures are the trainer's own choices — the avatar picked at setup and
 * their starter at whatever stage its level has reached — so the fold is
 * different for every account. The landing page itself cannot demonstrate that
 * to a screenshot: `scripts/shots.mjs` has no session, so it only ever renders
 * the signed-out defaults. This story is where the combinations get looked at.
 *
 * The trainer uses `trainerMapSheet`, not `trainerAvatarSheet`. The avatar
 * sheets are drawn in profile, which is right for the battle arena where two
 * fighters face each other and wrong here, where the trainer is being
 * introduced to the reader and would be looking past them.
 */

function Pair({ avatar, pal }: { avatar: "boy" | "girl"; pal: PalType }) {
  const stage = PAL_SPECIES[pal].stages[0];
  return (
    <figure style={{ display: "grid", justifyItems: "center", gap: 6, margin: 0 }}>
      <div className="title-cast">
        <PalSprite sheet={trainerMapSheet(avatar)!} size={112} />
        <PalSprite sheet={stage.image} size={96} />
      </div>
      <figcaption className="text-caption text-[var(--foreground-muted)]">
        {avatar} · {stage.name}
      </figcaption>
    </figure>
  );
}

function AllPairs() {
  const pals: PalType[] = ["fire", "water", "wood"];
  return (
    <div style={{ display: "grid", gap: 28 }}>
      {TRAINER_AVATARS.map((a) => (
        <div
          key={a.id}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 24,
            alignItems: "flex-end",
          }}
        >
          {pals.map((p) => (
            <Pair key={p} avatar={a.id} pal={p} />
          ))}
        </div>
      ))}
    </div>
  );
}

const meta = {
  title: "Screens/Title cast",
  component: AllPairs,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AllPairs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every avatar against every starter — six folds, one screen. */
export const EveryCombination: Story = {};

/** On Storm Watch the raster cast wears its foam rim. */
export const StormWatch: Story = { globals: { theme: "dark" } };
