import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { PalType } from "@/lib/pals";

/**
 * Route guards for the trainer-only part of the app.
 *
 * These run per page rather than in `proxy.ts` on purpose. Sessions use the
 * database strategy, so validating one means a Prisma query, and Next's own
 * guidance is explicit that proxy is for optimistic checks and not a
 * substitute for real authorization. Checking in the page also avoids the
 * classic layout-guard hole, where a layout doesn't re-run on every
 * navigation and a nested page renders unprotected.
 */

export type Trainer = {
  id: string;
  email: string | null;
  examPal: PalType;
  examPalName: string | null;
  expertise: string | null;
  /** Exam code the trainer chose to focus on first. */
  priorityExam: string | null;
};

export type SignedInUser = {
  id: string;
  email: string | null;
  examPal: PalType | null;
  examPalName: string | null;
  expertise: string | null;
  priorityExam: string | null;
};

/**
 * Requires a signed-in account. Guests are sent to the login page with a
 * `next` param so they land back where they were headed once they're in.
 */
export async function requireUser(returnTo?: string): Promise<SignedInUser> {
  const session = await auth();
  if (!session?.user?.id) {
    const target = returnTo
      ? `/login?next=${encodeURIComponent(returnTo)}`
      : "/login";
    redirect(target);
  }

  return {
    id: session.user.id,
    email: session.user.email ?? null,
    examPal: session.user.examPal,
    examPalName: session.user.examPalName,
    expertise: session.user.expertise,
    priorityExam: session.user.priorityExam,
  };
}

/**
 * Requires a signed-in account that has completed first-run setup. Use this
 * for anything that renders the trainer's pal; `requireUser` is only right for
 * the setup screen itself, which by definition has no profile yet.
 */
export async function requireTrainer(returnTo?: string): Promise<Trainer> {
  const user = await requireUser(returnTo);
  if (!user.examPal) {
    redirect("/setup");
  }

  return {
    id: user.id,
    email: user.email,
    examPal: user.examPal,
    examPalName: user.examPalName,
    expertise: user.expertise,
    priorityExam: user.priorityExam,
  };
}
