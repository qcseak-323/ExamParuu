import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import GymMap, { type RegionStop } from "@/components/GymMap";
import AudioProvider from "@/components/AudioProvider";

/**
 * The region map, in isolation.
 *
 * This screen lives behind `/catalog`, which the proxy gates on a session — so
 * it is unreachable to the screenshot harness, which only covers public
 * routes. Storybook is how it gets looked at without minting a login, and this
 * story is the reason the install earns its keep.
 *
 * The stops mirror `src/lib/regions.ts` — including its x/y percentages, which
 * are the same numbers `scripts/build-region-map.mjs` uses to place the
 * islands. If a marker floats off its island here, those two have drifted
 * apart.
 */

const STOPS: RegionStop[] = [
  { id: "az", worldName: "The Azure Archipelago", name: "Azure (AZ)", playable: true, playableCount: 2, cleared: 1, badgeEarned: false, prioritised: true, x: 16, y: 30 },
  { id: "ai", worldName: "The Lightning Shoals", name: "AI (AI)", playable: true, playableCount: 1, cleared: 1, badgeEarned: true, prioritised: false, x: 50, y: 18 },
  { id: "dp", worldName: "The Datastream Delta", name: "Data (DP)", playable: true, playableCount: 2, cleared: 0, badgeEarned: false, prioritised: false, x: 82, y: 28 },
  { id: "sc", worldName: "The Bastion Cliffs", name: "Security (SC)", playable: true, playableCount: 1, cleared: 0, badgeEarned: false, prioritised: false, x: 20, y: 72 },
  { id: "ab", worldName: "Agent Atoll", name: "Agents (AB)", playable: true, playableCount: 1, cleared: 1, badgeEarned: true, prioritised: false, x: 55, y: 62 },
  { id: "pl", worldName: "The Maker Mangroves", name: "Power (PL)", playable: false, playableCount: 0, cleared: 0, badgeEarned: false, prioritised: false, x: 84, y: 74 },
];

function MapHarness({ trainerAvatar }: { trainerAvatar: string | null }) {
  return (
    <AudioProvider>
      <div style={{ maxWidth: 1100 }}>
        <GymMap
          stops={STOPS}
          trainerAvatar={trainerAvatar}
          selectedId="az"
          onSelect={() => {}}
        />
      </div>
    </AudioProvider>
  );
}

const meta = {
  title: "Screens/Region map",
  component: MapHarness,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof MapHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A signed-in trainer, standing on their pinned route. */
export const WithTrainer: Story = {
  args: { trainerAvatar: "boy" },
};

/** A visitor with no avatar — the pinned route falls back to the seal. */
export const NoTrainer: Story = {
  args: { trainerAvatar: null },
};

/** Storm Watch. The terrain raster wears no filter here — it is already night. */
export const StormWatch: Story = {
  args: { trainerAvatar: "boy" },
  globals: { theme: "dark" },
};
