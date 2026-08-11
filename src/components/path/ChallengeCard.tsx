"use client";

import {
  MultiSelectBody,
  PlacementBody,
  SingleChoiceBody,
  VerdictDeckBody,
} from "@/components/question/renderers";
import type { Challenge } from "@/lib/types";

/**
 * The checkpoint challenge, in its several shapes.
 *
 * All of them report the same thing to the caller — `correct` out of `total` —
 * so the player scores and rewards them identically and adding another shape
 * needs no change upstream.
 *
 * The bodies themselves now live in `components/question/renderers.tsx`,
 * because the exam needs the same shapes and two implementations of a
 * drag-and-drop grid would drift. This file is the checkpoint's adapter onto
 * them: it maps a `Challenge` to the renderer's props and drops the submitted
 * answer, which only the exam stores. Behaviour is unchanged — checkpoints
 * still score partial credit.
 */

type Props = {
  challenge: Challenge;
  onDone: (correct: number, total: number) => void;
};

export default function ChallengeCard({ challenge, onDone }: Props) {
  const done = (r: { correct: number; total: number }) =>
    onDone(r.correct, r.total);

  switch (challenge.kind) {
    case "recall":
    case "oddOne":
      return (
        <SingleChoiceBody
          prompt={challenge.prompt}
          options={challenge.options}
          correctIndex={challenge.correctIndex}
          explanation={challenge.explanation}
          onDone={done}
        />
      );

    case "multi":
      return (
        <MultiSelectBody
          prompt={challenge.prompt}
          options={challenge.options}
          onDone={done}
        />
      );

    case "sort":
      return (
        <PlacementBody
          prompt={challenge.prompt}
          hint="Drag a term onto its skills area — or tap the term, then tap its area."
          slots={challenge.buckets}
          items={challenge.items.map((i) => ({
            id: i.id,
            label: i.label,
            answerSlotId: i.bucketId,
          }))}
          capacity="many"
          emptyLabel="— drop terms here —"
          scoreWord="sorted"
          onDone={done}
        />
      );

    case "swipe":
      return (
        <VerdictDeckBody
          prompt={challenge.prompt}
          cards={challenge.cards}
          onDone={done}
        />
      );

    case "match":
      return (
        <PlacementBody
          prompt={challenge.prompt}
          hint="Drag a definition onto a term — or tap one, then tap its term."
          slots={challenge.pairs.map((p) => ({ id: p.termId, label: p.term }))}
          items={challenge.pairs.map((p) => ({
            id: p.termId,
            label: p.definition,
            answerSlotId: p.termId,
          }))}
          capacity="one"
          emptyLabel="— drop a definition here —"
          scoreWord="matched"
          onDone={done}
        />
      );
  }
}
