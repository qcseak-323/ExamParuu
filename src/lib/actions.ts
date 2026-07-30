"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { QuizAttempt, FlashcardStatus } from "./types";

// Both actions are no-ops for signed-out users — local storage remains the
// source of truth for guests; this only mirrors activity into the database
// for signed-in users so it's available across devices.

export async function saveQuizAttemptToDb(attempt: QuizAttempt): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.quizAttempt.create({
    data: {
      userId: session.user.id,
      examCode: attempt.examCode,
      domainFilter: attempt.domainFilter,
      numQuestions: attempt.numQuestions,
      correctCount: attempt.correctCount,
      results: attempt.results,
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
