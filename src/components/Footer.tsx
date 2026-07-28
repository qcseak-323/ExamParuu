import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t-4 border-[var(--border)] px-4 py-6 text-center text-xs text-[var(--foreground-muted)]">
      <p className="mx-auto max-w-2xl">
        ExamReady is an independent study resource and is not affiliated
        with, endorsed by, or sponsored by Microsoft. All practice questions
        are original, written from Microsoft&apos;s publicly published
        skills-measured outlines — never from real exam content. See{" "}
        <Link href="/catalog" className="underline hover:text-[var(--accent)]">
          the catalog
        </Link>{" "}
        for each exam&apos;s official source link.
      </p>
      <div className="mt-3 flex justify-center gap-4">
        <Link href="/legal/terms" className="underline hover:text-[var(--accent)]">
          Terms
        </Link>
        <Link href="/legal/privacy" className="underline hover:text-[var(--accent)]">
          Privacy
        </Link>
      </div>
    </footer>
  );
}
