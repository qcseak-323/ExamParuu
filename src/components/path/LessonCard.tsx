import PixelSprite from "@/components/PixelSprite";
import { lessonMarkFor } from "@/lib/lessonSprites";

/**
 * One flashcard in a learning-path module: a term, its definition once
 * revealed, and a concept mark for the domain it belongs to.
 *
 * Split out of `LearningPathClient` so it can be looked at. Every route under
 * `/exams` is gated on a session, so the only way to see this component is a
 * Storybook story — and a story that re-typed the markup would drift from the
 * real thing on the first edit. Presentational on purpose: no audio, no
 * storage, no session, so the story renders it with nothing mocked.
 */

type Props = {
  front: string;
  back: string;
  /** Domain id from the flashcard, e.g. "relational-data". Picks the mark. */
  domain: string;
  revealed: boolean;
  onActivate: () => void;
};

export default function LessonCard({
  front,
  back,
  domain,
  revealed,
  onActivate,
}: Props) {
  return (
    <button
      type="button"
      onClick={onActivate}
      className="pixel-panel pixel-panel--stamped flex min-h-[9rem] items-center gap-4 p-6 text-left sm:gap-6"
    >
      {/* Decorative, so no `title` — PixelSprite marks an untitled sprite
          aria-hidden, which is right: the mark restates the domain the card
          already sits inside, and a screen reader announcing "cylinder" before
          every relational-data card would be noise. Drawn in `C`, so it inks
          itself from the muted foreground it inherits here and follows both
          themes. */}
      <PixelSprite
        sprite={lessonMarkFor(domain)}
        size={48}
        className="h-12 w-12 shrink-0 text-[var(--foreground-muted)] sm:h-14 sm:w-14"
      />
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-3">
        <span className="text-body-lg font-semibold">{front}</span>
        {revealed ? (
          <span className="prose-measure text-body text-[var(--foreground-muted)]">
            {back}
          </span>
        ) : (
          <span className="text-caption text-[var(--foreground-muted)]">
            Tap to reveal ▸
          </span>
        )}
      </span>
    </button>
  );
}
