import type { SubmittedAnswer } from "@/lib/review";
import type { Question } from "@/lib/types";

/**
 * Turning a half-finished answer into a submitted one.
 *
 * Each body keeps its working state in whatever shape suits its interaction —
 * a placement grid tracks `itemId -> slotId`, a dropdown tracks
 * `blankId -> option index`. That is the *draft*. `SubmittedAnswer` is the
 * shape grading understands, and the two are not the same.
 *
 * The teaching path never needs this: a body converts its own draft when the
 * trainer presses Continue. The Proving does, because with `reveal` off there
 * is no Continue — the paper ends and sixty drafts have to be graded at once.
 * So the conversion lives here as a pure function rather than inside a
 * callback, where it is reachable from both and from a test.
 *
 * The slot-id builders are exported for the same reason: `QuestionCard`
 * constructs the ids and this module parses them back, and a literal
 * `"term-"` typed in two files is a bug waiting for the second edit.
 */

export const orderSlotId = (position: number) => `pos-${position}`;
export const orderItemId = (index: number) => `item-${index}`;
export const matchSlotId = (index: number) => `term-${index}`;
export const matchItemId = (index: number) => `def-${index}`;

/** Which item ended up in `slotId`, as its authored index, or -1. */
function itemIndexIn(
  placed: Record<string, string>,
  slotId: string,
  prefix: string,
): number {
  const itemId = Object.keys(placed).find((id) => placed[id] === slotId);
  return itemId ? Number(itemId.slice(prefix.length)) : -1;
}

/**
 * The draft as a submittable answer, or null when nothing has been entered.
 *
 * Null means "unanswered" and grades as a miss, which is what the real paper
 * does with a question you never reached. A *partially* filled question is not
 * null — it converts with -1 in the gaps and grades as wrong, because the
 * trainer did engage with it and the score report should not pretend
 * otherwise.
 */
export function draftToAnswer(
  question: Question,
  draft: unknown,
): SubmittedAnswer | null {
  switch (question.kind) {
    case undefined:
    case "single": {
      const index = draft as number | null | undefined;
      return typeof index === "number" ? { kind: "single", index } : null;
    }

    case "multi": {
      const ids = (draft as string[] | undefined) ?? [];
      return ids.length > 0
        ? { kind: "multi", indexes: ids.map(Number).sort((a, b) => a - b) }
        : null;
    }

    case "order": {
      const placed = (draft as Record<string, string> | undefined) ?? {};
      if (Object.keys(placed).length === 0) return null;
      return {
        kind: "order",
        order: question.correctOrder.map((_, position) =>
          itemIndexIn(placed, orderSlotId(position), "item-"),
        ),
      };
    }

    case "match": {
      const placed = (draft as Record<string, string> | undefined) ?? {};
      if (Object.keys(placed).length === 0) return null;
      return {
        kind: "match",
        placed: question.pairs.map((_, i) =>
          itemIndexIn(placed, matchSlotId(i), "def-"),
        ),
      };
    }

    case "yesno": {
      const verdicts = (draft as boolean[] | undefined) ?? [];
      return verdicts.length > 0 ? { kind: "yesno", verdicts } : null;
    }

    case "dropdown": {
      const picks = (draft as Record<string, number> | undefined) ?? {};
      if (Object.keys(picks).length === 0) return null;
      const blanks = question.segments.filter(
        (s): s is Extract<typeof s, { blankId: string }> => "blankId" in s,
      );
      return {
        kind: "dropdown",
        picks: blanks.map((b) => picks[b.blankId] ?? -1),
      };
    }
  }
}

/** Whether the trainer has entered anything at all for this question. */
export function isAnswered(question: Question, draft: unknown): boolean {
  return draftToAnswer(question, draft) !== null;
}
