import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, auth } from "@/auth";

export const metadata = { title: "Log in — ExamReady" };

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
    redirect(session.user.examPal ? returnTo : "/choose-pal");
  }

  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? "Something went wrong sending the sign-in link.")
    : null;

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <div>
        <h1 className="font-pixel text-xl">Log in</h1>
        <p className="mt-3 text-sm text-[var(--foreground-muted)]">
          Enter your email and we&apos;ll send you a sign-in link — no password
          needed. New here? The same link creates your trainer profile, and
          you&apos;ll pick your first ExamPal on the way in.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-red-600 bg-red-600/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      <form
        action={async (formData) => {
          "use server";
          try {
            await signIn("resend", formData);
          } catch (err) {
            if (err instanceof AuthError) {
              redirect(`/login?error=${err.type}`);
            }
            throw err;
          }
        }}
        className="flex flex-col gap-3"
      >
        <input type="hidden" name="redirectTo" value={returnTo} />
        <input
          type="email"
          name="email"
          placeholder="you@example.com"
          required
          className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="pixel-button rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--accent-foreground)]"
        >
          Send sign-in link
        </button>
      </form>
    </div>
  );
}
