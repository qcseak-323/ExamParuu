"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { findFlashcardExamCode } from "@/lib/content";
import { isPalType, type PalType } from "@/lib/pals";
import type {
  QuizAttempt,
  QuizResultEntry,
  FlashcardStatus,
  RemoteProgress,
} from "./types";

// Guests are never touched by any of this: local storage stays the source of
// truth for them, and every action below no-ops without a session. For signed
// -in users the database is the durable copy, mirrored into local storage so
// the rest of the app can keep reading from one place.

const MAX_NICKNAME_LENGTH = 14;

/**
 * Records the trainer's starter. Refuses to overwrite an existing choice —
 * the starter-select screen is a one-time event, and letting a stray call
 * swap someone's pal out from under them would be worse than a no-op.
 *
 * Returns an error string rather than throwing so the client can show it
 * inside the dialogue box instead of blowing up the screen.
 */
export async function chooseExamPal(
  type: PalType,
  nickname: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "You need to be signed in." };

  // Never trust the client for this: it decides what the rest of the app
  // renders, and an unrecognised value would break every sprite lookup.
  if (!isPalType(type)) {
    return { ok: false, error: "That isn't one of the three starters." };
  }

  const trimmed = nickname?.trim() ?? "";
  if (trimmed.length > MAX_NICKNAME_LENGTH) {
    return {
      ok: false,
      error: `Nicknames are up to ${MAX_NICKNAME_LENGTH} characters.`,
    };
  }

  // Conditional update: only writes where no starter has been chosen yet, so
  // a double-submit or a replayed request can't reassign an existing pal.
  const result = await prisma.user.updateMany({
    where: { id: userId, examPal: null },
    data: { examPal: type, examPalName: trimmed || null },
  });

  if (result.count === 0) {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { examPal: true },
    });
    // Already had one: treat as success so a duplicate submit still lands the
    // trainer in the app rather than on an error screen.
    if (existing?.examPal) return { ok: true };
    return { ok: false, error: "Couldn't save your choice. Try again." };
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
): Promise<RemoteProgress> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { attempts: [], flashcards: {} };

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
  ]);
}

export async function loadProgressFromDb(): Promise<RemoteProgress> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { attempts: [], flashcards: {} };

  const [rows, cards] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { takenAt: "asc" },
    }),
    prisma.flashcardProgress.findMany({ where: { userId } }),
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
  };
}
