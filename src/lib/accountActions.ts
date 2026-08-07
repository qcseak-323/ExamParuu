"use server";

import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Data-subject actions: see everything held about you, and delete it.
 *
 * These matter more than they would in a normal app, because using ExamReady
 * at all requires an account — nobody can study here without handing over an
 * email address. "Email the owner and ask" is not a reasonable answer to that,
 * and PDPA/GDPR expect self-service.
 */

export type AccountExport = {
  exportedAt: string;
  account: {
    email: string | null;
    name: string | null;
    createdSessions: number;
    examPal: string | null;
    examPalName: string | null;
    expertise: string | null;
    priorityExam: string | null;
  };
  quizAttempts: unknown[];
  flashcardProgress: unknown[];
  learningEvents: unknown[];
};

/**
 * Everything stored server-side about the signed-in trainer.
 *
 * Deliberately assembled from the tables directly rather than reusing
 * `loadProgressFromDb`, which reshapes rows for the UI. An export should show
 * what is actually held, not a view of it.
 */
export async function exportAccountData(): Promise<AccountExport | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      quizAttempts: true,
      flashcardProgress: true,
      learningEvents: true,
      sessions: true,
    },
  });
  if (!user) return null;

  return {
    exportedAt: new Date().toISOString(),
    account: {
      email: user.email,
      name: user.name,
      // The session rows themselves are credentials, so report the count
      // rather than handing back tokens in a file people may share.
      createdSessions: user.sessions.length,
      examPal: user.examPal,
      examPalName: user.examPalName,
      expertise: user.expertise,
      priorityExam: user.priorityExam,
    },
    quizAttempts: user.quizAttempts.map((a) => ({
      examCode: a.examCode,
      domainFilter: a.domainFilter,
      numQuestions: a.numQuestions,
      correctCount: a.correctCount,
      results: a.results,
      takenAt: a.takenAt.toISOString(),
    })),
    flashcardProgress: user.flashcardProgress.map((f) => ({
      examCode: f.examCode,
      cardId: f.cardId,
      status: f.status,
      updatedAt: f.updatedAt.toISOString(),
    })),
    learningEvents: user.learningEvents.map((e) => ({
      examCode: e.examCode,
      kind: e.kind,
      refId: e.refId,
      at: e.at.toISOString(),
    })),
  };
}

/**
 * Permanently deletes the account and everything attached to it.
 *
 * Every related table declares `onDelete: Cascade`, so removing the User row
 * takes attempts, flashcard progress, learning events, sessions, and OAuth
 * accounts with it. Deleting the sessions is also what signs the person out
 * everywhere, not just in this browser.
 *
 * `confirmEmail` must match the account's own address. This is irreversible
 * and there is no soft-delete or grace period, so it should not be possible to
 * trigger by a stray click.
 */
export async function deleteAccount(
  confirmEmail: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "You need to be signed in." };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user) return { ok: false, error: "Account not found." };

  const typed = confirmEmail.trim().toLowerCase();
  if (!user.email || typed !== user.email.toLowerCase()) {
    return {
      ok: false,
      error: "That doesn't match the email address on this account.",
    };
  }

  await prisma.user.delete({ where: { id: userId } });

  return { ok: true };
}

/** Ends the session after a deletion, so the browser isn't left holding a
 *  cookie pointing at a user that no longer exists. */
export async function signOutAfterDeletion(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

/**
 * Starts the journey over without giving up the account.
 *
 * Wipes every progress table — battles, flashcard progress, lesson history,
 * which together are the XP, level and streak — and releases the ExamPal by
 * clearing the profile fields. The account and email survive, and the next
 * page load lands on first-run setup exactly as a brand-new trainer would.
 *
 * One transaction: a reset that deletes attempts but crashes before clearing
 * the profile would leave a level-1 trainer holding a stage-3 pal, which the
 * next sync could never repair.
 */
export async function restartJourney(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "You need to be signed in." };

  await prisma.$transaction([
    prisma.quizAttempt.deleteMany({ where: { userId } }),
    prisma.flashcardProgress.deleteMany({ where: { userId } }),
    prisma.learningEvent.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        examPal: null,
        examPalName: null,
        expertise: null,
        priorityExam: null,
      },
    }),
  ]);

  return { ok: true };
}
