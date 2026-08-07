"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useQuizAttempts, useFlashcardProgress } from "@/lib/storage";
import { computeXp, computeLevel } from "@/lib/gamification";
import { PAL_SPECIES, stageForLevel } from "@/lib/pals";
import PalSprite from "@/components/PalSprite";
import SoundToggle from "@/components/SoundToggle";
import ThemeToggle from "@/components/ThemeToggle";

const TRAINER_LINKS = [
  // The route stays /catalog (bookmarks, guards); only the word changed.
  { href: "/catalog", label: "Dungeon" },
  { href: "/progress", label: "Trainer" },
  { href: "/preferences", label: "Options" },
];

export default function Nav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const attempts = useQuizAttempts();
  const flashcardProgress = useFlashcardProgress();
  const { level } = computeLevel(computeXp(attempts, flashcardProgress));

  const signedIn = status === "authenticated" && Boolean(session?.user);
  const palType = session?.user?.examPal ?? null;
  const species = palType ? PAL_SPECIES[palType] : null;
  const stage = palType ? stageForLevel(palType, level) : null;

  return (
    <header className="border-b-4 border-[var(--border)]">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        {/* Always home, signed in or not. The logo used to point signed-in
            trainers at /catalog, which left them no way back to the landing
            page from inside the app. */}
        <Link href="/" className="tap-target flex items-center gap-2">
          {/* 32px, not 28: the badge renders the 32px source at exactly 1×.
              A fractional scale of pixel art shimmers. */}
          {species && stage && <PalSprite sheet={stage.image} size={32} />}
          <span className="font-pixel text-title">ExamParuu</span>
          {signedIn && (
            <span className="rounded bg-[var(--accent)] px-1.5 py-1 text-caption font-medium text-[var(--accent-foreground)]">
              Lv.{level}
            </span>
          )}
        </Link>

        <nav className="flex flex-wrap items-center gap-1 text-body">
          {/* Every trainer link goes somewhere gated, so showing them to a
              signed-out visitor would just be a set of redirects to /login. */}
          {signedIn &&
            TRAINER_LINKS.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`tap-target rounded-md px-3 py-1.5 transition-colors ${
                    active
                      ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                      : "text-[var(--foreground-muted)] hover:bg-black/5 dark:hover:bg-white/10"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

          <ThemeToggle />
          <SoundToggle />

          {signedIn ? (
            <>
              <span className="hidden px-2 text-caption text-[var(--foreground-muted)] sm:inline">
                {session?.user?.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="tap-target rounded-md px-3 py-1.5 text-[var(--foreground-muted)] hover:bg-black/5 dark:hover:bg-white/10"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className={`tap-target rounded-md px-3 py-1.5 transition-colors ${
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
