"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { StudyGuideSection } from "@/lib/types";
import { buildEvent, lessonBeats } from "@/lib/learning";
import { recordLearningEvent, useLearningEvents } from "@/lib/storage";
import { saveLearningEventToDb } from "@/lib/actions";
import DialogueBox from "@/components/DialogueBox";
import MenuList from "@/components/MenuList";
import { useSceneTrack, useSfx } from "@/components/AudioProvider";

/**
 * A single lesson, delivered as dialogue rather than as a page of prose.
 *
 * The teaching itself is unchanged — same paragraphs, same words. What changes
 * is the pacing: one beat at a time, advanced by the reader, in the same box
 * the rest of the game talks through. That turns studying from something you
 * do *before* playing into part of the game.
 */
export default function LessonClient({
  examCode,
  domainId,
  section,
  nextSectionId,
}: {
  examCode: string;
  domainId: string;
  section: StudyGuideSection;
  nextSectionId: string | null;
}) {
  const { status: sessionStatus } = useSession();
  const events = useLearningEvents();
  const playSfx = useSfx();
  const [finished, setFinished] = useState(false);

  // Study is in-world, not a silent document.
  useSceneTrack("town");

  const beats = lessonBeats(section.paragraphs);

  const alreadyRead = events.some(
    (e) =>
      e.kind === "lesson" && e.examCode === examCode && e.refId === section.id,
  );

  /**
   * Fires from DialogueBox's `onDone`, which only runs once the LAST beat has
   * been dismissed. Skimming the page does not count; reaching the end does.
   *
   * Called from an event callback rather than an effect — recording here and
   * then setting state inside an effect is exactly the setState-in-effect
   * pattern the React Compiler rules reject.
   */
  function handleComplete() {
    setFinished(true);

    const event = buildEvent("lesson", examCode, section.id);
    // recordLearningEvent also marks the day active, which is what finally
    // makes a day spent reading count toward the streak.
    const isNew = recordLearningEvent(event);

    if (isNew) {
      playSfx("levelUp");
      if (sessionStatus === "authenticated") {
        saveLearningEventToDb(event).catch((err) =>
          console.error("Failed to sync lesson completion", err),
        );
      }
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-pixel text-display">{section.heading}</h1>
        {alreadyRead && (
          <span className="text-caption text-[var(--accent-ink)]">✓ already read</span>
        )}
      </div>

      <DialogueBox
        speaker="PROF. SEQUEL"
        lines={beats}
        onDone={handleComplete}
        footer={
          <MenuList
            ariaLabel="What next"
            options={[
              {
                id: "battle",
                label: "Battle this topic ▶",
                hint: "Put it to the test",
              },
              {
                id: "cards",
                label: "Review the cards",
                hint: "Drill the terms",
              },
              ...(nextSectionId
                ? [{ id: "next", label: "Next lesson ▶", hint: undefined }]
                : []),
              { id: "index", label: "Back to the route", hint: undefined },
            ]}
            onSelect={(id) => {
              const href =
                id === "battle"
                  ? `/exams/${examCode}/quiz?domain=${domainId}`
                  : id === "cards"
                    ? `/exams/${examCode}/flashcards?domain=${domainId}`
                    : id === "next" && nextSectionId
                      ? `/exams/${examCode}/study/${nextSectionId}`
                      : `/exams/${examCode}/study`;
              window.location.href = href;
            }}
          />
        }
      />

      {!finished && (
        <p className="text-caption text-[var(--foreground-muted)]">
          {beats.length} passage{beats.length === 1 ? "" : "s"} — press Enter or
          click the box to read on.
        </p>
      )}

      <Link
        href={`/exams/${examCode}/study`}
        className="text-caption underline text-[var(--foreground-muted)] hover:text-[var(--accent-ink)]"
      >
        ← All lessons for this exam
      </Link>
    </div>
  );
}
