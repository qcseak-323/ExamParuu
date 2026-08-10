"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { sendSignInLink } from "@/lib/authActions";
import { DialogueFrame } from "@/components/DialogueBox";
import ProfessorPortrait from "@/components/ProfessorPortrait";
import { useSfx } from "@/components/AudioProvider";
import { ForwardGlyph } from "@/components/Glyph";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="pixel-button rounded-md bg-[var(--accent)] px-5 py-2.5 text-body font-medium text-[var(--accent-foreground)] disabled:opacity-50"
    >
      {pending ? (
        "Sending…"
      ) : (
        <>
          Send my link
          <ForwardGlyph />
        </>
      )}
    </button>
  );
}

/** Where a signed-in trainer goes when they press START. */
const CONTINUE_TO = "/catalog";

/**
 * The landing page's START button.
 *
 * For a signed-out visitor it opens a sign-in prompt — a dialogue window
 * rather than a separate page, so the music and the scene keep running behind
 * it. Pressing start on a handheld never took you somewhere else, it opened a
 * box. A trainer who is already signed in skips all that and goes straight to
 * picking an exam.
 */
export default function StartPrompt({
  label = "Play",
}: {
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const { status } = useSession();
  const router = useRouter();
  const playSfx = useSfx();
  const emailId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);

  function handleStart() {
    // This click is also the gesture that unlocks audio, so the blip and the
    // music tend to arrive together.
    playSfx("confirm");

    if (status === "unauthenticated") {
      setOpen(true);
      return;
    }

    // Authenticated, or still resolving. Navigating is right either way: the
    // page's own guard is authoritative, sending a signed-in trainer onward,
    // one still needing setup to /setup, and a signed-out visitor to the
    // login page. That last case only happens if someone clicks inside the
    // few hundred ms before the session resolves, and a working login page is
    // a fine outcome for it — better than showing a signed-in trainer a
    // sign-in box because we guessed wrong.
    router.push(CONTINUE_TO);
  }

  // Move focus into the prompt when it opens and back to START when it
  // closes, so keyboard and screen-reader users aren't stranded behind it.
  // The `hasOpened` guard matters: without it this effect also runs on mount,
  // where `open` is already false, and steals focus onto the START button as
  // soon as the page loads.
  const hasOpened = useRef(false);
  useEffect(() => {
    if (open) {
      hasOpened.current = true;
      inputRef.current?.focus();
    } else if (hasOpened.current) {
      hasOpened.current = false;
      startRef.current?.focus({ preventScroll: true });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* The one brass action on the screen: a single pixel-face word, big
          enough that it reads like a cartridge's title screen. */}
      <button
        ref={startRef}
        type="button"
        onClick={handleStart}
        className="start-button start-button--word tap-target w-full"
      >
        {label}
      </button>

      {open && (
        <div
          className="start-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${emailId}-title`}
            className="w-full max-w-md"
          >
            <DialogueFrame>
              <span className="dialogue-tab">Prof. Sequel</span>
              <div className="flex items-center gap-3">
                <ProfessorPortrait />
                <p id={`${emailId}-title`} className="dialogue-text flex-1">
                  Where should I send your trainer card?
                </p>
              </div>

              <form action={sendSignInLink} className="mt-4 flex flex-col gap-3">
                {/* One canonical destination: the catalog guard forwards a
                    brand-new trainer to /setup on its own, so this works
                    for first-time and returning visitors alike. */}
                <input type="hidden" name="redirectTo" value={CONTINUE_TO} />
                <label htmlFor={emailId} className="sr-only">
                  Email address
                </label>
                <input
                  ref={inputRef}
                  id={emailId}
                  type="email"
                  name="email"
                  required
                  placeholder="you@example.com"
                  className="min-h-11 w-full rounded-md bg-[var(--panel)] px-3 py-2 text-body"
                  style={{ border: "3px solid var(--border)" }}
                />
                <div className="flex flex-wrap gap-3">
                  <SubmitButton />
                  <button
                    type="button"
                    onClick={() => {
                      playSfx("back");
                      setOpen(false);
                    }}
                    className="pixel-button rounded-md bg-[var(--panel)] px-5 py-2.5 text-body font-medium"
                  >
                    Not yet
                  </button>
                </div>
              </form>
            </DialogueFrame>
          </div>
        </div>
      )}
    </>
  );
}
