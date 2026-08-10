"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getCatalogEntry, getExamContent } from "@/lib/content";
import {
  REGIONS,
  getExamsBySeries,
  computeRegionBadges,
} from "@/lib/regions";
import { getDisplayTier, getRetroLabel } from "@/lib/levels";
import { useQuizAttempts } from "@/lib/storage";
import {
  computeBadges,
  isGymCleared,
  isProvingPassed,
} from "@/lib/gamification";
import {
  getGuardian,
  guardianFighter,
  isGuardianOwned,
  GUARDIAN_SILHOUETTE,
} from "@/lib/guardians";
import GymMap, { type RegionStop } from "@/components/GymMap";
import { DialogueFrame } from "@/components/DialogueBox";
import ProfessorPortrait from "@/components/ProfessorPortrait";
import PixelSprite from "@/components/PixelSprite";
import FighterSprite from "@/components/battle/FighterSprite";
import { useSfx } from "@/components/AudioProvider";

/**
 * Exam selection in two steps: pick a regional gym (one per 2026 Microsoft
 * exam series), then pick an exam inside it. A client component because
 * badge progress is read from local storage, which is the read path for all
 * progress in this app. The server only supplies the trainer's pinned route.
 */
export default function CatalogClient({
  priorityExam,
  trainerAvatar,
}: {
  priorityExam: string | null;
  /** Passed down to the map, which stands this trainer on their own route. */
  trainerAvatar: string | null;
}) {
  const attempts = useQuizAttempts();
  const playSfx = useSfx();

  // The pinned exam's region opens by default — the map should greet a
  // returning trainer with their own route, not a blank chart.
  const pinnedRegion = priorityExam
    ? (getCatalogEntry(priorityExam)?.series ?? null)
    : null;
  const [selectedId, setSelectedId] = useState<string | null>(pinnedRegion);

  const regionBadges = useMemo(() => computeRegionBadges(attempts), [attempts]);

  const stops: RegionStop[] = regionBadges.map(
    ({ region, playable, cleared, earned }) => ({
      id: region.id,
      worldName: region.worldName,
      name: region.name,
      playable: playable > 0,
      playableCount: playable,
      cleared,
      badgeEarned: earned,
      prioritised: region.id === pinnedRegion,
      x: region.x,
      y: region.y,
    }),
  );

  const selected = REGIONS.find((r) => r.id === selectedId) ?? null;
  const selectedExams = selected ? getExamsBySeries(selected.id) : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-pixel text-display">Dungeon</h1>
        <p className="mt-3 max-w-2xl text-body text-[var(--foreground-muted)]">
          Pick a region, then a dungeon. Clear every dungeon in a region for
          its badge.
        </p>
      </div>

      <GymMap
        stops={stops}
        trainerAvatar={trainerAvatar}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {/* The same six destinations in plain reading order — the map is a
          positioned layout that is awkward on a narrow phone. */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Regions">
        {stops.map((stop) => (
          <button
            key={stop.id}
            type="button"
            aria-pressed={stop.id === selectedId}
            onClick={() => {
              playSfx("confirm");
              setSelectedId(stop.id);
            }}
            className={`pixel-button tap-target rounded-md px-3 py-2 text-caption font-semibold ${
              stop.id === selectedId
                ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                : "bg-[var(--panel)]"
            }`}
          >
            {stop.worldName}
            {stop.badgeEarned ? " ✓" : ""}
            {stop.prioritised ? " ★" : ""}
          </button>
        ))}
      </div>

      {selected ? (
        <section className="flex flex-col gap-4" aria-live="polite">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className={`h-[18px] w-[18px] shrink-0 border-2 border-[var(--outline)] ${selected.glyphClass}`}
            />
            <div>
              <h2 className="font-pixel text-title">{selected.worldName}</h2>
              <p className="text-caption text-[var(--foreground-muted)]">
                {selected.name} · {selected.tagline}
              </p>
            </div>
          </div>

          <DialogueFrame>
            <span className="dialogue-tab">Prof. Sequel</span>
            <div className="flex items-center gap-3">
              <ProfessorPortrait />
              <p className="dialogue-text flex-1">{selected.professorLine}</p>
            </div>
          </DialogueFrame>

          {/* Grouped by Microsoft's own level tiers: Fundamentals →
              Intermediate (Associate) → Advanced (Expert/Specialty). */}
          {[
            { label: "Fundamentals", levels: ["Fundamentals"] },
            { label: "Intermediate", levels: ["Associate"] },
            { label: "Advanced", levels: ["Expert", "Specialty"] },
          ].map(({ label, levels }) => {
            const tierExams = selectedExams.filter((e) =>
              levels.includes(e.msLevel),
            );
            if (tierExams.length === 0) return null;
            return (
              <section key={label}>
                <h3 className="mb-2 text-label font-semibold uppercase tracking-[0.1em] text-[var(--foreground-soft)]">
                  {label}
                </h3>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {tierExams.map((exam) => {
              const playable = exam.hasContent;
              const domains = getExamContent(exam.code)?.outline.domains ?? [];
              const badges = playable
                ? computeBadges(exam.code, domains, attempts)
                : [];
              const cleared = playable && isGymCleared(exam.code, attempts);
              const sealed = playable && isProvingPassed(exam.code, attempts);
              const guardian = playable ? getGuardian(exam.code) : undefined;
              const guardianOwned =
                guardian !== undefined && isGuardianOwned(exam.code, attempts);

              return (
                <li
                  key={exam.code}
                  className={`pixel-panel p-4 ${playable ? "" : "opacity-75"}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-pixel text-label text-[var(--accent-ink)]">
                      {exam.code.toUpperCase()}
                    </span>
                    <div className="flex items-center gap-2">
                      {exam.status === "beta" && (
                        <span className="rounded bg-[var(--panel-raised)] px-2 py-0.5 text-caption font-medium text-[var(--foreground-muted)]">
                          Beta
                        </span>
                      )}
                      {exam.code === priorityExam && (
                        <span className="rounded-full bg-[var(--accent-hi)] px-2 py-0.5 text-caption font-medium text-[var(--outline)]">
                          ★ Your route
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-body font-medium">{exam.title}</p>
                  <p className="mt-1 text-caption text-[var(--foreground-muted)]">
                    {getRetroLabel(exam.msLevel)} · {getDisplayTier(exam.msLevel)}
                  </p>
                  <p className="mt-2 text-caption text-[var(--foreground-muted)]">
                    {exam.summary}
                  </p>
                  {playable ? (
                    <>
                      {/* The dungeon's guardian: named once caught, a
                          silhouette while it still bars the door. */}
                      {guardian && (
                        <div className="mt-3 flex items-center gap-3 rounded-md bg-black/5 p-2 dark:bg-white/5">
                          {guardianOwned ? (
                            <FighterSprite
                              fighter={guardianFighter(guardian)}
                              size={48}
                              title={`${guardian.name}, guardian of this dungeon`}
                            />
                          ) : (
                            <PixelSprite
                              sprite={guardian.sprite}
                              palette={GUARDIAN_SILHOUETTE}
                              size={48}
                              title="An uncaught guardian"
                              className="opacity-60"
                            />
                          )}
                          <p className="text-caption text-[var(--foreground-muted)]">
                            {guardianOwned
                              ? `Guarded by ${guardian.name} — on your team`
                              : "A wild guardian bars this dungeon. Clear it and the Paruu joins you."}
                          </p>
                        </div>
                      )}
                      <p className="mt-2 text-caption text-[var(--foreground-muted)]">
                        {badges.filter((b) => b.earned).length}/{badges.length}{" "}
                        route ribbons{cleared ? " · ✓ dungeon cleared" : ""}
                        {sealed ? " · ⚑ Proving sealed" : ""}
                      </p>
                      <Link
                        href={`/exams/${exam.code}`}
                        className="tap-target mt-1 inline-flex text-body underline hover:text-[var(--accent-ink)]"
                      >
                        Travel to {exam.code.toUpperCase()}
                      </Link>
                    </>
                  ) : (
                    <p className="mt-2 text-caption text-[var(--foreground-muted)]">
                      Wild territory — practice content coming soon.
                      {exam.sourceUrl && (
                        <>
                          {" "}
                          <a
                            href={exam.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="underline hover:text-[var(--accent-ink)]"
                          >
                            Official study guide ↗
                          </a>
                        </>
                      )}
                    </p>
                  )}
                    </li>
                  );
                  })}
                </ul>
              </section>
            );
          })}
        </section>
      ) : (
        <p className="text-body text-[var(--foreground-muted)]">
          Select a region on the map to see its dungeons.
        </p>
      )}
    </div>
  );
}
