"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  getExamContent,
  getFlashcardsByDomain,
  getDomainName,
} from "@/lib/content";
import { shuffle } from "@/lib/shuffle";
import {
  getFlashcardProgress,
  setFlashcardStatus,
  useFlashcardProgress,
  useLearningEvents,
  recordLearningEvent,
} from "@/lib/storage";
import {
  buildEvent,
  buildCardSchedules,
  orderDeckBySchedule,
  countDueCards,
} from "@/lib/learning";
import { saveFlashcardStatusToDb, saveLearningEventToDb } from "@/lib/actions";
import type { FlashcardStatus } from "@/lib/types";
import { ForwardGlyph } from "@/components/Glyph";

export default function FlashcardsClient({ examCode }: { examCode: string }) {
  const content = getExamContent(examCode);
  const searchParams = useSearchParams();
  const { status: sessionStatus } = useSession();
  const initialDomain = searchParams.get("domain") ?? "all";

  const [domainFilter, setDomainFilter] = useState(initialDomain);
  const [onlyLearning, setOnlyLearning] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const progress = useFlashcardProgress();
  const events = useLearningEvents();

  const schedules = useMemo(
    () => buildCardSchedules(events, progress, examCode),
    [events, progress, examCode],
  );

  /**
   * Shuffle first, then order by schedule — so due cards lead, unseen cards
   * follow, and rested cards trail, but the order within each group still
   * varies run to run.
   *
   * Cards that aren't due are kept rather than filtered out. Running out of
   * deck entirely is a worse experience than an easy review, especially on a
   * bank this size.
   */
  const deck = useMemo(() => {
    let pool = getFlashcardsByDomain(examCode, domainFilter);
    if (onlyLearning) {
      const snapshot = getFlashcardProgress();
      pool = pool.filter((c) => snapshot[c.id] !== "known");
    }
    return orderDeckBySchedule(shuffle(pool), schedules);
    // shuffleSeed is a nonce used only to force a fresh shuffle on demand
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examCode, domainFilter, onlyLearning, shuffleSeed, schedules]);

  const dueCount = useMemo(
    () => countDueCards(getFlashcardsByDomain(examCode, domainFilter), schedules),
    [examCode, domainFilter, schedules],
  );

  const card = deck[position];

  const knownCount = useMemo(() => {
    const all = getFlashcardsByDomain(examCode, domainFilter);
    return all.filter((c) => progress[c.id] === "known").length;
  }, [examCode, domainFilter, progress]);

  const totalInDomain = getFlashcardsByDomain(examCode, domainFilter).length;

  function resetDeckPosition() {
    setPosition(0);
    setFlipped(false);
  }

  function handleDomainChange(value: string) {
    setDomainFilter(value);
    resetDeckPosition();
  }

  function handleOnlyLearningChange(checked: boolean) {
    setOnlyLearning(checked);
    resetDeckPosition();
  }

  function handleShuffle() {
    setShuffleSeed((s) => s + 1);
    resetDeckPosition();
  }

  function mark(status: FlashcardStatus) {
    if (!card) return;
    setFlashcardStatus(card.id, status);

    // Recorded as an event, not as a third status. `mergeRemoteProgress`
    // resolves flashcard conflicts as "known wins", so a demotion written to
    // the status map would be silently swallowed on the next sync. The log
    // sidesteps that rule rather than fighting it, and unlike the map it can
    // count repeat reviews — which is what makes them worth XP at all.
    const event = buildEvent("cardReview", examCode, card.id);
    const isNew = recordLearningEvent(event);

    if (sessionStatus === "authenticated") {
      saveFlashcardStatusToDb(examCode, card.id, status).catch((err) =>
        console.error("Failed to sync flashcard progress to account", err),
      );
      if (isNew) {
        saveLearningEventToDb(event).catch((err) =>
          console.error("Failed to sync review event to account", err),
        );
      }
    }

    setFlipped(false);
    setPosition((p) => p + 1);
  }

  if (!content) {
    return (
      <p className="text-body text-[var(--foreground-muted)]">
        No flashcards are available for this exam yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-pixel text-display">Flashcards</h1>
        <p className="mt-3 max-w-xl text-body text-[var(--foreground-muted)]">
          Flip a card, then mark whether you knew it.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-body font-medium">Skills area</label>
          <select
            value={domainFilter}
            onChange={(e) => handleDomainChange(e.target.value)}
            className="w-full max-w-sm rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-body"
          >
            <option value="all">All domains</option>
            {content.outline.domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 pb-2 text-body">
          <input
            type="checkbox"
            checked={onlyLearning}
            onChange={(e) => handleOnlyLearningChange(e.target.checked)}
          />
          Only cards I don&apos;t know
        </label>

        <button
          onClick={handleShuffle}
          className="pixel-button mb-0.5 rounded-md bg-[var(--panel)] px-3 py-1.5 text-body"
        >
          Shuffle
        </button>

        <span className="pb-2 text-body text-[var(--foreground-muted)]">
          Known: {knownCount}/{totalInDomain}
          {dueCount > 0 && (
            <span className="ml-2 text-[var(--accent-ink)]">
              · {dueCount} due
            </span>
          )}
        </span>
      </div>

      {deck.length === 0 && (
        <p className="text-body text-[var(--foreground-muted)]">
          No cards match this filter.
        </p>
      )}

      {deck.length > 0 && position < deck.length && card && (
        <div className="flex flex-col items-center gap-4">
          <span className="text-body text-[var(--foreground-muted)]">
            Card {position + 1} of {deck.length} ·{" "}
            {getDomainName(examCode, card.domain)}
          </span>

          <button
            onClick={() => setFlipped((f) => !f)}
            className="pixel-panel pixel-panel--stamped flex min-h-56 w-full max-w-xl items-center justify-center p-8 text-center text-body-lg"
          >
            {flipped ? card.back : card.front}
          </button>
          <p className="text-caption text-[var(--foreground-muted)]">
            Tap the card to {flipped ? "hide" : "reveal"} the answer
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => mark("learning")}
              className="pixel-button rounded-md bg-[var(--panel)] px-5 py-2.5 text-body font-medium text-[var(--warning)]"
            >
              Still learning
            </button>
            <button
              onClick={() => mark("known")}
              className="pixel-button rounded-md bg-[var(--accent)] px-5 py-2.5 text-body font-medium text-[var(--accent-foreground)]"
            >
              I knew it
              <ForwardGlyph />
            </button>
          </div>
        </div>
      )}

      {deck.length > 0 && position >= deck.length && (
        <div className="flex flex-col items-start gap-4">
          <p className="text-body-lg font-medium">
            You&apos;ve gone through all {deck.length} cards in this set.
          </p>
          <button
            onClick={handleShuffle}
            className="pixel-button rounded-md bg-[var(--accent)] px-5 py-2.5 text-body font-medium text-[var(--accent-foreground)]"
          >
            Go again
          </button>
        </div>
      )}
    </div>
  );
}
