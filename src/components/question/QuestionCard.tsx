"use client";

import {
  DropdownBody,
  MultiSelectBody,
  PlacementBody,
  SingleChoiceBody,
  VerdictDeckBody,
  type RendererResult,
} from "@/components/question/renderers";
import { gradeQuestion, type SubmittedAnswer } from "@/lib/review";
import type { Question } from "@/lib/types";

/**
 * One exam question, in whichever shape it was authored.
 *
 * The exam surfaces call this instead of laying out a four-option menu
 * themselves, so adding a seventh format is a change here and nowhere else.
 *
 * ── Why it re-grades ──
 *
 * The renderers report a per-item score because the learning path wants
 * partial credit. An exam does not: Microsoft marks most item types at the
 * item level, so three of four right on a multi-select is a miss. Rather than
 * teach each body two scoring rules, the bodies stay honest about what was
 * submitted and `gradeQuestion` decides pass or fail from the question and the
 * answer. That also keeps one grading rule in one place, reachable from tests
 * and from the results screen.
 */

export type AnsweredQuestion = {
  correct: boolean;
  answer: SubmittedAnswer | null;
  /** The renderer's own tally, for surfaces that want to show "3/4". */
  partial: { correct: number; total: number };
};

export default function QuestionCard({
  question,
  reveal = true,
  draft,
  onDraftChange,
  onAnswered,
}: {
  question: Question;
  /**
   * False on the Proving: collect an answer, judge nothing, render no buttons
   * of its own. See the note on `Controllable` in renderers.tsx.
   */
  reveal?: boolean;
  /**
   * The in-progress answer, held by the caller so it survives the question
   * being unmounted and remounted by a navigator. Opaque here — each body
   * owns its own draft shape, and only `onAnswered` speaks SubmittedAnswer.
   */
  draft?: unknown;
  onDraftChange?: (draft: unknown) => void;
  onAnswered: (result: AnsweredQuestion) => void;
}) {
  // One cast at the boundary rather than a generic parameter threaded through
  // every caller: the exam stores drafts in one array of mixed shapes, and the
  // body that reads a draft is always the same body that wrote it.
  const controlled = <T,>() =>
    onDraftChange
      ? { reveal, value: draft as T, onChange: onDraftChange as (v: T) => void }
      : { reveal };

  const done = (r: RendererResult) =>
    onAnswered({
      correct: gradeQuestion(question, r.answer),
      answer: r.answer,
      partial: { correct: r.correct, total: r.total },
    });

  switch (question.kind) {
    case undefined:
    case "single":
      return (
        <SingleChoiceBody
          {...controlled<number | null>()}
          prompt={question.question}
          options={question.options}
          correctIndex={question.correctIndex}
          explanation={question.explanation}
          onDone={done}
        />
      );

    case "multi":
      return (
        <MultiSelectBody
          {...controlled<string[]>()}
          prompt={question.question}
          options={question.options.map((label, i) => ({
            id: String(i),
            label,
            correct: question.correctIndexes.includes(i),
          }))}
          onDone={done}
        />
      );

    case "order":
      // Ordering is placement against numbered positions: one slot per step,
      // and the item authored at index n belongs in position n.
      return (
        <PlacementBody
          {...controlled<Record<string, string>>()}
          prompt={question.question}
          hint="Drag each step into position — or tap a step, then tap its slot."
          slots={question.correctOrder.map((_, i) => ({
            id: `pos-${i}`,
            label: `Step ${i + 1}`,
          }))}
          items={question.items.map((label, i) => ({
            id: `item-${i}`,
            label,
            answerSlotId: `pos-${question.correctOrder.indexOf(i)}`,
          }))}
          capacity="one"
          emptyLabel="— drop a step here —"
          scoreWord="in the right place"
          answerFor={(placed) => ({
            kind: "order",
            order: question.correctOrder.map((_, position) => {
              const itemId = Object.keys(placed).find(
                (id) => placed[id] === `pos-${position}`,
              );
              return itemId ? Number(itemId.replace("item-", "")) : -1;
            }),
          })}
          onDone={done}
        />
      );

    case "match":
      return (
        <PlacementBody
          {...controlled<Record<string, string>>()}
          prompt={question.question}
          hint="Drag a definition onto a term — or tap one, then tap its term."
          slots={question.pairs.map((p, i) => ({
            id: `term-${i}`,
            label: p.term,
          }))}
          items={question.pairs.map((p, i) => ({
            id: `def-${i}`,
            label: p.definition,
            answerSlotId: `term-${i}`,
          }))}
          capacity="one"
          emptyLabel="— drop a definition here —"
          scoreWord="matched"
          answerFor={(placed) => ({
            kind: "match",
            // Position i holds whichever definition was dropped on term i.
            placed: question.pairs.map((_, i) => {
              const defId = Object.keys(placed).find(
                (id) => placed[id] === `term-${i}`,
              );
              return defId ? Number(defId.replace("def-", "")) : -1;
            }),
          })}
          onDone={done}
        />
      );

    case "yesno":
      return (
        <VerdictDeckBody
          {...controlled<boolean[]>()}
          prompt={question.question}
          cards={question.statements.map((s, i) => ({
            id: `st-${i}`,
            // The stem carries the shared scenario; each card carries one
            // proposed solution, which is how the real series reads.
            term: `Statement ${i + 1}`,
            definition: s.text,
            matches: s.correct,
          }))}
          variant="statement"
          onDone={done}
        />
      );

    case "dropdown":
      return (
        <DropdownBody
          {...controlled<Record<string, number>>()}
          prompt={question.question}
          segments={question.segments}
          explanation={question.explanation}
          onDone={done}
        />
      );
  }
}
