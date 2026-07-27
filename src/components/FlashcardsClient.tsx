"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { outline, getFlashcardsByDomain, getDomainName } from "@/lib/content";
import { shuffle } from "@/lib/shuffle";
import {
  getFlashcardProgress,
  setFlashcardStatus,
  useFlashcardProgress,
} from "@/lib/storage";
import type { FlashcardStatus } from "@/lib/types";

export default function FlashcardsClient() {
  const searchParams = useSearchParams();
  const initialDomain = searchParams.get("domain") ?? "all";

  const [domainFilter, setDomainFilter] = useState(initialDomain);
  const [onlyLearning, setOnlyLearning] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const progress = useFlashcardProgress();

  const deck = useMemo(() => {
    let pool = getFlashcardsByDomain(domainFilter);
    if (onlyLearning) {
      const snapshot = getFlashcardProgress();
      pool = pool.filter((c) => snapshot[c.id] !== "known");
    }
    return shuffle(pool);
    // shuffleSeed is a nonce used only to force a fresh shuffle on demand
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainFilter, onlyLearning, shuffleSeed]);

  const card = deck[position];

  const knownCount = useMemo(() => {
    const all = getFlashcardsByDomain(domainFilter);
    return all.filter((c) => progress[c.id] === "known").length;
  }, [domainFilter, progress]);

  const totalInDomain = getFlashcardsByDomain(domainFilter).length;

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
    setFlipped(false);
    setPosition((p) => p + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Flashcards</h1>
        <p className="mt-2 max-w-xl text-sm text-black/70 dark:text-white/70">
          Click a card to flip it, then mark whether you knew it. Mastery is
          saved on this device so you can focus on what you don&apos;t know yet.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Skills area</label>
          <select
            value={domainFilter}
            onChange={(e) => handleDomainChange(e.target.value)}
            className="w-full max-w-sm rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
          >
            <option value="all">All domains</option>
            {outline.domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={onlyLearning}
            onChange={(e) => handleOnlyLearningChange(e.target.checked)}
          />
          Only show cards I don&apos;t know yet
        </label>

        <button
          onClick={handleShuffle}
          className="mb-0.5 rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Shuffle
        </button>

        <span className="pb-2 text-sm text-black/60 dark:text-white/60">
          Known: {knownCount}/{totalInDomain}
        </span>
      </div>

      {deck.length === 0 && (
        <p className="text-sm text-black/60 dark:text-white/60">
          No cards match this filter.
        </p>
      )}

      {deck.length > 0 && position < deck.length && card && (
        <div className="flex flex-col items-center gap-4">
          <span className="text-sm text-black/60 dark:text-white/60">
            Card {position + 1} of {deck.length} · {getDomainName(card.domain)}
          </span>

          <button
            onClick={() => setFlipped((f) => !f)}
            className="flex min-h-56 w-full max-w-xl items-center justify-center rounded-xl border border-black/15 p-8 text-center text-lg shadow-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            {flipped ? card.back : card.front}
          </button>
          <p className="text-xs text-black/50 dark:text-white/50">
            Click the card to {flipped ? "hide" : "reveal"} the answer
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => mark("learning")}
              className="rounded-md border border-amber-600 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-600/10 dark:text-amber-400"
            >
              Still learning
            </button>
            <button
              onClick={() => mark("known")}
              className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-600/10 dark:text-emerald-400"
            >
              I knew it
            </button>
          </div>
        </div>
      )}

      {deck.length > 0 && position >= deck.length && (
        <div className="flex flex-col items-start gap-4">
          <p className="text-lg font-medium">
            You&apos;ve gone through all {deck.length} cards in this set.
          </p>
          <button
            onClick={handleShuffle}
            className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Go again
          </button>
        </div>
      )}
    </div>
  );
}
