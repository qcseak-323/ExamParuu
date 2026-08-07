import Link from "next/link";

// The catalog link that used to live in this paragraph was removed when the
// app moved behind a session: the footer renders on the public landing page,
// where that link would only ever bounce a visitor to /login.
export default function Footer() {
  return (
    <footer className="mt-auto border-t-4 border-[var(--border)] px-4 py-6 text-center text-caption text-[var(--foreground-muted)]">
      <p className="prose-measure mx-auto">
        ExamParuu is an independent study resource and is not affiliated
        with, endorsed by, or sponsored by Microsoft. All practice questions
        are original, written from Microsoft&apos;s publicly published
        skills-measured outlines — never from real exam content. Each
        exam&apos;s official source link is on its overview page.
      </p>
      <div className="mt-3 flex justify-center gap-4">
        <Link
          href="/legal/terms"
          className="tap-target underline hover:text-[var(--accent-ink)]"
        >
          Terms
        </Link>
        <Link
          href="/legal/privacy"
          className="tap-target underline hover:text-[var(--accent-ink)]"
        >
          Privacy
        </Link>
      </div>
    </footer>
  );
}
