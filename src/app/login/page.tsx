import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { sendSignInLink } from "@/lib/authActions";
import ProfessorPortrait from "@/components/ProfessorPortrait";

export const metadata = { title: "Log in — ExamParuu" };

const ERROR_MESSAGES: Record<string, string> = {
  EmailSignin:
    "We couldn't send that sign-in link. Check the address and try again.",
  Configuration:
    "Something's misconfigured on our end and the sign-in link couldn't be sent. Try again shortly.",
};

/**
 * Only same-origin relative paths are accepted as a post-login destination.
 * `next` arrives in the query string, so without this check a crafted link
 * could sign someone in and then forward them to another site.
 */
function safeReturnPath(next: string | undefined): string {
  if (!next) return "/catalog";
  if (!next.startsWith("/") || next.startsWith("//")) return "/catalog";
  return next;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const returnTo = safeReturnPath(next);

  // Already signed in? There's nothing to do here.
  const session = await auth();
  if (session?.user?.id) {
    redirect(session.user.examPal ? returnTo : "/setup");
  }

  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? "Something went wrong sending the sign-in link.")
    : null;

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <div className="text-center">
        <div className="flex justify-center">
          <ProfessorPortrait />
        </div>
        <h1 className="font-pixel mt-2 text-display">Log in</h1>
        <p className="mt-3 text-body text-[var(--foreground-muted)]">
          We&apos;ll email you a sign-in link — no password. New trainers pick
          their first Paruu on the way in.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-[var(--danger)] bg-[var(--danger)]/10 px-4 py-3 text-body text-[var(--danger)]">
          {errorMessage}
        </div>
      )}

      <form action={sendSignInLink} className="flex flex-col gap-3">
        <input type="hidden" name="redirectTo" value={returnTo} />
        <input
          type="email"
          name="email"
          placeholder="you@example.com"
          required
          className="min-h-11 rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-body"
        />
        <button type="submit" className="start-button tap-target">
          Send sign-in link
        </button>
      </form>

      <p className="text-center text-caption text-[var(--foreground-muted)]">
        Free, no paywall.{" "}
        <Link href="/" className="underline hover:text-[var(--accent-ink)]">
          Back to the shore
        </Link>
      </p>
    </div>
  );
}
