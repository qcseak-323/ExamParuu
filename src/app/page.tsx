import Link from "next/link";
import { catalog } from "@/lib/content";
import { allGuardians } from "@/lib/guardians";
import HomeHero from "@/components/HomeHero";
import BattleDemo from "@/components/BattleDemo";
import PalSprite from "@/components/PalSprite";

/**
 * The home page, Landing v4 — the title screen and what lies past it.
 *
 * Three bands after the fold, and the order is the order a player meets a
 * game: you see the world, you fight something, you find out how big the map
 * is.
 *
 *   1. the title screen        one screenful of world, one thing to press
 *   2. a wild question         the demo, given the room it always deserved
 *   3. the Monsoon Belt        six regions, seven guardians, the real scope
 *
 * ── What v3 was and why it went ──
 *
 * v3 was a website's answer: a two-column fold with copy on the left and the
 * demo squeezed into the right, an equation strip, four numbered "how it
 * works" cards, three catalogue tiles. It measured well in every dimension the
 * project could measure and still read as a SaaS page wearing pixel art.
 *
 * Three things were wrong with it that no measurement reaches:
 *
 * **The best thing on the page was in a side column.** The playable question
 * is the entire pitch — you can answer a real exam question before signing up
 * — and it was half a fold wide, competing with body copy.
 *
 * **The abstractions outnumbered the game.** Four cards explaining a loop and
 * three cards counting exams, versus one fire starter and two trainers. The
 * app owns sixty-two sprites and the landing page showed six of them.
 *
 * **The catalogue was a list of codes.** "AZ-900, AI-901, DP-900, +3 more" is
 * a filing cabinet. The same information as six named regions with a guardian
 * standing in each is a world, and it is the *same data*.
 *
 * So the loop cards and the tier cards are both gone. The guardians say what
 * the loop cards said — there is structure here, it goes somewhere — and they
 * say it with the art instead of about it.
 */

/** Six regions, seven guardians: the Delta holds two. Counted, never stated. */
function beltScale() {
  const guardians = allGuardians();
  const regions = new Set(guardians.map((g) => g.regionName));
  return { guardians, regionCount: regions.size };
}

export default function Home() {
  const { guardians, regionCount } = beltScale();
  const totalExams = catalog.length;

  return (
    <div className="flex flex-col">
      <HomeHero />

      {/* Band 2 — the encounter.

          The demo used to sit in the hero's right-hand column. It is the only
          thing on this page that proves the claim rather than making it, so it
          gets a band, an in-world heading and the full measure. */}
      <section className="mt-16" aria-labelledby="demo-heading">
        <div className="text-center">
          <h2 id="demo-heading" className="font-pixel text-display">
            A wild question appeared.
          </h2>
          <p className="prose-measure mx-auto mt-3 text-body-lg text-[var(--foreground-muted)]">
            Every battle is a real practice question. Answer it and your
            companion attacks; get it wrong and you read the lesson before the
            next one.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-2xl">
          <BattleDemo />
        </div>
      </section>

      {/* Band 3 — the world, which is also the catalogue.

          This replaces three tiles reading "AZ-900, AI-901, DP-900, +3 more".
          Same data; one version is a filing cabinet and the other is a map. */}
      <section className="mt-16" aria-labelledby="belt-heading">
        <div className="text-center">
          <h2 id="belt-heading" className="font-pixel text-display">
            The Monsoon Belt
          </h2>
          <p className="prose-measure mx-auto mt-3 text-body-lg text-[var(--foreground-muted)]">
            {regionCount} regions, {guardians.length} guardians. Each one holds
            a dungeon, and clearing it means you are ready for that paper.
          </p>
        </div>

        {/* Four across, not three. Seven cards in a 3-wide grid leaves the
            seventh alone on its own row, which reads as a mistake rather than
            a set; 4 + 3 reads as deliberate. */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {guardians.map((guardian) => (
            <article
              key={guardian.examCode}
              className="pixel-panel flex items-start gap-4 p-5"
            >
              {guardian.image && (
                <PalSprite sheet={guardian.image} size={64} />
              )}
              <div className="min-w-0">
                <h3 className="font-pixel text-title">{guardian.name}</h3>
                <p className="text-caption font-semibold uppercase tracking-[0.1em] text-[var(--accent-ink)]">
                  {guardian.examCode.toUpperCase()}
                </p>
                <p className="mt-2 text-caption text-[var(--foreground-muted)]">
                  {guardian.regionName}
                </p>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center">
          <Link
            href="/catalog"
            className="tap-target text-body font-semibold underline hover:text-[var(--accent-ink)]"
          >
            All {totalExams} exams →
          </Link>
        </p>
      </section>

      {/* The full non-affiliation disclaimer lives in the global footer. */}
      <p className="prose-measure mx-auto mt-16 text-center text-caption text-[var(--foreground-muted)]">
        Free, no paywall. Email sign-in. Independent — not affiliated with
        Microsoft.
      </p>
    </div>
  );
}
