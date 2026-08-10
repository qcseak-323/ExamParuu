"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useQuizAttempts, useFlashcardProgress } from "@/lib/storage";
import { computeXp, computeLevel } from "@/lib/gamification";
import { PAL_SPECIES, stageForLevel } from "@/lib/pals";
import { usePreferences, setPreference } from "@/lib/preferences";
import PalSprite from "@/components/PalSprite";
import { useSfx } from "@/components/AudioProvider";
import { ForwardGlyph } from "@/components/Glyph";

/**
 * The top ribbon: the brand, one action, and everything else behind a menu.
 *
 * It used to carry three nav links, two toggles, an email address and a log
 * out button in a single row, which wrapped to two lines on a phone and gave
 * five things equal weight. Now the bar is slim and states exactly one thing
 * to press — whichever action the current page implies — with the rest
 * folded into the ☰ menu.
 */

/**
 * `forward` rather than a ▶ inside `label`: the mark is a sprite now, and a
 * sprite cannot live in a string. Only the actions that move the trainer
 * *onward* carry it — "End session" and "Back to AZ-900" are retreats.
 */
type PrimaryAction = {
  href: string;
  label: string;
  brass: boolean;
  forward?: boolean;
};

/** The one action the ribbon offers, derived from where the trainer is. */
function primaryActionFor(
  pathname: string,
  signedIn: boolean,
  priorityExam: string | null,
): PrimaryAction | null {
  if (!signedIn) {
    // Nothing on the login page itself — the form is the action.
    if (pathname.startsWith("/login")) return null;
    return { href: "/login", label: "Log in", brass: true };
  }

  const examMatch = pathname.match(/^\/exams\/([^/]+)(\/.*)?$/);
  if (examMatch) {
    const [, code, rest = ""] = examMatch;
    const upper = code.toUpperCase();
    // Mid-battle the only useful action is a way out of it.
    if (/^\/(quiz|gym|exam)/.test(rest)) {
      return { href: `/exams/${code}`, label: "End session", brass: false };
    }
    // On the route's own page, the action is to start practising.
    if (rest === "") {
      return {
        href: `/exams/${code}/quiz`,
        label: "Practice battle",
        brass: true,
        forward: true,
      };
    }
    return { href: `/exams/${code}`, label: `Back to ${upper}`, brass: false };
  }

  // Anywhere else: pick the pinned route back up, or head for the map.
  if (priorityExam) {
    return {
      href: `/exams/${priorityExam}`,
      label: `Continue ${priorityExam.toUpperCase()}`,
      brass: true,
      forward: true,
    };
  }
  return { href: "/catalog", label: "Dungeon", brass: true, forward: true };
}

const MENU_LINKS = [
  // The route stays /catalog (bookmarks, guards); only the word changed.
  { href: "/catalog", label: "Dungeon" },
  { href: "/progress", label: "Trainer card" },
  { href: "/preferences", label: "Options" },
];

export default function Nav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const attempts = useQuizAttempts();
  const flashcardProgress = useFlashcardProgress();
  const { level } = computeLevel(computeXp(attempts, flashcardProgress));
  const prefs = usePreferences();
  const playSfx = useSfx();

  const menuId = useId();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const signedIn = status === "authenticated" && Boolean(session?.user);
  const palType = session?.user?.examPal ?? null;
  const species = palType ? PAL_SPECIES[palType] : null;
  const stage = palType ? stageForLevel(palType, level) : null;
  const action = primaryActionFor(
    pathname,
    signedIn,
    session?.user?.priorityExam ?? null,
  );
  const dark = prefs.theme === "dark";

  // Close on a click anywhere else, and on Escape — a popover that can only
  // be dismissed by pressing its own button is a trap on a phone.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Navigating away closes it; the popover is not a place to come back to.
  // Adjusted during render rather than in an effect so the menu never paints
  // for a frame over the page it just left.
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    if (open) setOpen(false);
  }

  return (
    <header className="border-b-2 border-[var(--border)] bg-[var(--panel)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-1.5">
        {/* Always home, signed in or not. 32px renders the 32px source at
            exactly 1× — a fractional scale of pixel art shimmers. */}
        <Link href="/" className="tap-target flex items-center gap-2">
          {species && stage && <PalSprite sheet={stage.image} size={32} />}
          <span className="font-pixel text-title">ExamParuu</span>
          {signedIn && (
            <span className="rounded bg-[var(--accent)] px-1.5 py-0.5 text-caption font-semibold text-[var(--accent-foreground)]">
              Lv.{level}
            </span>
          )}
        </Link>

        <div className="relative flex items-center gap-2">
          {action && (
            <Link
              href={action.href}
              className={`pixel-button hidden rounded-md px-4 py-2 text-body font-medium sm:inline-flex ${
                action.brass
                  ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                  : "bg-[var(--panel)]"
              }`}
            >
              {action.label}
              {action.forward && <ForwardGlyph />}
            </Link>
          )}

          {/* Weather and sound sit on the bar itself, not in the menu: they
              are the two things people reach for mid-session, and a toggle
              you have to open a menu to find may as well not be there. */}
          <button
            type="button"
            aria-pressed={dark}
            title={dark ? "Switch to Low Tide (light)" : "Switch to Storm Watch (dark)"}
            onClick={() => {
              setPreference("theme", dark ? "bright" : "dark");
              playSfx("confirm");
            }}
            className="pixel-button min-h-11 min-w-11 rounded-md bg-[var(--panel)] text-body-lg"
          >
            <span aria-hidden="true">{dark ? "☾" : "☀"}</span>
            <span className="sr-only">
              {dark ? "Storm Watch on — switch to Low Tide" : "Low Tide on — switch to Storm Watch"}
            </span>
          </button>

          <button
            type="button"
            aria-pressed={prefs.bgmEnabled}
            title={prefs.bgmEnabled ? "Turn music off" : "Turn music on"}
            onClick={() => {
              // The click that turns music on is itself the gesture that
              // unlocks audio, so the blip lands only when switching on.
              setPreference("bgmEnabled", !prefs.bgmEnabled);
              if (!prefs.bgmEnabled) playSfx("confirm");
            }}
            className="pixel-button min-h-11 min-w-11 rounded-md bg-[var(--panel)] text-body-lg"
          >
            <span aria-hidden="true">{prefs.bgmEnabled ? "♪" : "🔇"}</span>
            <span className="sr-only">
              {prefs.bgmEnabled ? "Music on — turn off" : "Music off — turn on"}
            </span>
          </button>

          <button
            ref={buttonRef}
            type="button"
            aria-haspopup="true"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label="Menu"
            onClick={() => {
              playSfx(open ? "back" : "cursor");
              setOpen((o) => !o);
            }}
            className={`pixel-button min-h-11 min-w-11 rounded-md bg-[var(--panel)] text-body-lg ${
              // Signed out the menu holds only the action, which is already
              // on the bar from sm up — an empty menu button is a dead end.
              signedIn ? "" : "sm:hidden"
            }`}
          >
            <span aria-hidden="true">☰</span>
          </button>

          {open && (
            <div
              ref={menuRef}
              id={menuId}
              className="pixel-panel pixel-panel--raised absolute right-0 top-[calc(100%+0.75rem)] z-50 grid min-w-[15rem] gap-0.5 p-2"
            >
              {/* The one action again, for phones where it is hidden above. */}
              {action && (
                <Link
                  href={action.href}
                  className="tap-target justify-start rounded-md px-3 py-2 text-body font-medium hover:bg-[var(--panel-raised)] sm:hidden"
                >
                  {action.label}
                  {action.forward && <ForwardGlyph />}
                </Link>
              )}

              {signedIn &&
                MENU_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`tap-target justify-start rounded-md px-3 py-2 text-body hover:bg-[var(--panel-raised)] ${
                      pathname.startsWith(link.href)
                        ? "font-semibold text-[var(--accent-ink)]"
                        : ""
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}

              {signedIn && (
                <>
                  <hr className="my-1 border-0 border-t-2 border-dashed border-[var(--line)]" />
                  <p className="px-3 pb-1 text-caption text-[var(--foreground-muted)]">
                    {session?.user?.email}
                  </p>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="tap-target justify-start rounded-md px-3 py-2 text-left text-body hover:bg-[var(--panel-raised)]"
                  >
                    Log out
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
