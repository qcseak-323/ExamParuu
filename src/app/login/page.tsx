import { signIn } from "@/auth";

export const metadata = { title: "Log in — ExamReady" };

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <div>
        <h1 className="font-pixel text-xl">Log in</h1>
        <p className="mt-3 text-sm text-[var(--foreground-muted)]">
          Enter your email and we&apos;ll send you a sign-in link — no
          password needed. Signing in saves your quiz history and flashcard
          progress to your account instead of just this browser.
        </p>
      </div>

      <form
        action={async (formData) => {
          "use server";
          await signIn("resend", formData);
        }}
        className="flex flex-col gap-3"
      >
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
