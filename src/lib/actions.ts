"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { findFlashcardExamCode, getCatalogEntry } from "@/lib/content";
import { isPalType, type PalType } from "@/lib/pals";
import { isExpertiseLevel } from "@/lib/profile";
import type {
  QuizAttempt,
  QuizResultEntry,
  FlashcardStatus,
  LearningEvent,
  RemoteProgress,
} from "./types";

// Guests are never touched by any of this: local storage stays the source of
// truth for them, and every action below no-ops without a session. For signed
// -in users the database is the durable copy, mirrored into local storage so
// the rest of the app can keep reading from one place.

const MAX_NICKNAME_LENGTH = 14;

export type ProfileSetupInput = {
  palType: PalType;
  nickname: string | null;
  expertise: string;
  priorityExam: string;
};

/**
 * Writes the answers from first-run setup.
 *
 * Everything lands in one update at the end of the flow rather than per step.
 * A trainer who abandons setup halfway therefore has no profile at all and
 * gets the whole flow again next time, instead of being let into the app with
 * a starter but no route — which the guard would read as "already set up".
 *
 * Returns an error string rather than throwing so the client can show it in
 * the dialogue box instead of blowing up the screen.
 */
export async function completeProfileSetup(
  input: ProfileSetupInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "You need to be signed in." };

  // Never trust the client for these: the pal decides what every sprite
  // lookup renders, and an unrecognised exam code would point the whole
  // profile at content that doesn't exist.
  if (!isPalType(input.palType)) {
    return { ok: false, error: "That isn't one of the three starters." };
  }
  if (!isExpertiseLevel(input.expertise)) {
    return { ok: false, error: "Pick one of the experience levels." };
  }
  if (!getCatalogEntry(input.priorityExam)) {
    return { ok: false, error: "That isn't an exam we cover." };
  }

  const trimmed = input.nickname?.trim() ?? "";
  if (trimmed.length > MAX_NICKNAME_LENGTH) {
    return {
      ok: false,
      error: `Nicknames are up to ${MAX_NICKNAME_LENGTH} characters.`,
    };
  }

  // Conditional update: only writes where setup hasn't happened yet, so a
  // double-submit or replayed request can't reassign an existing profile.
  const result = await prisma.user.updateMany({
    where: { id: userId, examPal: null },
    data: {
      examPal: input.palType,
      examPalName: trimmed || null,
      expertise: input.expertise,
      priorityExam: input.priorityExam,
    },
  });

  if (result.count === 0) {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { examPal: true },
    });
    // Already set up: treat as success so a duplicate submit still lands the
    // trainer in the app rather than on an error screen.
    if (existing?.examPal) return { ok: true };
    return { ok: false, error: "Couldn't save your profile. Try again." };
  }

  return { ok: true };
}

export async function saveQuizAttemptToDb(attempt: QuizAttempt): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.quizAttempt.upsert({
    where: {
      userId_clientId: { userId: session.user.id, clientId: attempt.id },
    },
    update: {},
    create: {
      userId: session.user.id,
      clientId: attempt.id,
      examCode: attempt.examCode,
      domainFilter: attempt.domainFilter,
      numQuestions: attempt.numQuestions,
      correctCount: attempt.correctCount,
      results: attempt.results,
      takenAt: new Date(attempt.timestamp),
    },
  });
}

export async function saveFlashcardStatusToDb(
  examCode: string,
  cardId: string,
  status: FlashcardStatus,
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.flashcardProgress.upsert({
    where: { userId_cardId: { userId: session.user.id, cardId } },
    update: { status, examCode },
    create: { userId: session.user.id, examCode, cardId, status },
  });
}

/**
 * Pushes anything recorded locally (typically while signed out) up to the
 * account, then returns the merged server-side view. Called once when a
 * session becomes active so progress earned as a guest isn't stranded on
 * one device.
 */
export async function syncProgressWithDb(
  localAttempts: QuizAttempt[],
  localFlashcards: Record<string, FlashcardStatus>,
  localEvents: LearningEvent[] = [],
): Promise<RemoteProgress> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { attempts: [], flashcards: {}, events: [] };

  if (localEvents.length > 0) {
    // Deterministic client ids plus the unique constraint make this safe to
    // replay: duplicates are dropped rather than stacking up.
    await prisma.learningEvent.createMany({
      data: localEvents.map((e) => ({
        userId,
        clientId: e.id,
        examCode: e.examCode,
        kind: e.kind,
        refId: e.refId,
        at: new Date(e.at),
      })),
      skipDuplicates: true,
    });
  }

  if (localAttempts.length > 0) {
    await prisma.quizAttempt.createMany({
      data: localAttempts.map((a) => ({
        userId,
        clientId: a.id,
        examCode: a.examCode,
        domainFilter: a.domainFilter,
        numQuestions: a.numQuestions,
        correctCount: a.correctCount,
        results: a.results,
        takenAt: new Date(a.timestamp),
      })),
      skipDuplicates: true,
    });
  }

  const localCardIds = Object.keys(localFlashcards);
  if (localCardIds.length > 0) {
    // "known" wins over "learning" so a sync can never downgrade mastery the
    // user already earned on another device.
    const existing = await prisma.flashcardProgress.findMany({
      where: { userId, cardId: { in: localCardIds } },
      select: { cardId: true, status: true },
    });
    const existingByCard = new Map(existing.map((r) => [r.cardId, r.status]));

    const toWrite = localCardIds.filter(
      (cardId) =>
        existingByCard.get(cardId) !== "known" &&
        existingByCard.get(cardId) !== localFlashcards[cardId],
    );

    for (const cardId of toWrite) {
      const examCode = findFlashcardExamCode(cardId);
      // A card id we don't recognise means stale local data from removed
      // content; skip rather than inventing an exam it doesn't belong to.
      if (!examCode) continue;
      await prisma.flashcardProgress.upsert({
        where: { userId_cardId: { userId, cardId } },
        update: { status: localFlashcards[cardId] },
        create: { userId, cardId, status: localFlashcards[cardId], examCode },
      });
    }
  }

  return loadProgressFromDb();
}

/**
 * Deletes the account-side copy of progress. Without this, "reset" only
 * clears local storage and the next sync pulls everything straight back.
 */
export async function clearProgressInDb(): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;

  await prisma.$transaction([
    prisma.quizAttempt.deleteMany({ where: { userId } }),
    prisma.flashcardProgress.deleteMany({ where: { userId } }),
    // Lesson history has to go too, or the next sync pulls it back and the
    // reset quietly undoes itself.
    prisma.learningEvent.deleteMany({ where: { userId } }),
  ]);
}

export async function loadProgressFromDb(): Promise<RemoteProgress> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { attempts: [], flashcards: {}, events: [] };

  const [rows, cards, events] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { takenAt: "asc" },
    }),
    prisma.flashcardProgress.findMany({ where: { userId } }),
    prisma.learningEvent.findMany({
      where: { userId },
      orderBy: { at: "asc" },
    }),
  ]);

  return {
    attempts: rows.map((r) => ({
      id: r.clientId,
      examCode: r.examCode,
      timestamp: r.takenAt.getTime(),
      domainFilter: r.domainFilter,
      numQuestions: r.numQuestions,
      correctCount: r.correctCount,
      results: r.results as unknown as QuizResultEntry[],
    })),
    flashcards: Object.fromEntries(
      cards.map((c) => [c.cardId, c.status as FlashcardStatus]),
    ),
    events: events.map((e) => ({
      id: e.clientId,
      examCode: e.examCode,
      kind: e.kind as LearningEvent["kind"],
      refId: e.refId,
      at: e.at.getTime(),
    })),
  };
}

/** Mirrors a single learning event up as it happens. */
export async function saveLearningEventToDb(
  event: LearningEvent,
): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;

  await prisma.learningEvent.upsert({
    where: { userId_clientId: { userId, clientId: event.id } },
    update: {},
    create: {
      userId,
      clientId: event.id,
      examCode: event.examCode,
      kind: event.kind,
      refId: event.refId,
      at: new Date(event.at),
    },
  });
}
