"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useQuizAttempts, useFlashcardProgress } from "@/lib/storage";
import { computeXp, computeLevel } from "@/lib/gamification";

const links = [
  { href: "/", label: "Home" },
  { href: "/catalog", label: "Catalog" },
  { href: "/progress", label: "Progress" },
  { href: "/preferences", label: "Preferences" },
];

export default function Nav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const attempts = useQuizAttempts();
  const flashcardProgress = useFlashcardProgress();
  const { level } = computeLevel(computeXp(attempts, flashcardProgress));

  return (
    <header className="border-b-4 border-[var(--border)]">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-pixel text-sm">ExamReady</span>
          <span className="rounded bg-[var(--accent)] px-1.5 py-1 text-[10px] font-medium text-[var(--accent-foreground)]">
            Lv.{level}
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  active
                    ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                    : "text-[var(--foreground-muted)] hover:bg-black/5 dark:hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {status === "authenticated" && session?.user ? (
            <>
              <span className="px-2 text-xs text-[var(--foreground-muted)]">
                {session.user.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-md px-3 py-1.5 text-[var(--foreground-muted)] hover:bg-black/5 dark:hover:bg-white/10"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className={`rounded-md px-3 py-1.5 transition-colors ${
                pathname.startsWith("/login")
                  ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                  : "text-[var(--foreground-muted)] hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
