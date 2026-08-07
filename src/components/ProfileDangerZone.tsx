"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  deleteAccount,
  restartJourney,
  signOutAfterDeletion,
} from "@/lib/accountActions";
import { resetAllProgress } from "@/lib/storage";
import { useSfx } from "@/components/AudioProvider";

/**
 * The two ways out, at the bottom of the trainer card.
 *
 * Restart keeps the account but wipes every scrap of progress — battles,
 * flashcards, lesson history (which together are the XP and streak) — and
 * releases the Paruu, so the next page is first-run setup as a brand-new
 * trainer. Delete removes the account entirely; signing up again later
 * starts completely fresh because nothing survives the cascade.
 *
 * Both are irreversible, so both are two-step: restart confirms in place,
 * delete demands the account email typed back (same contract as the copy of
 * this control on Preferences).
 */
export default function ProfileDangerZone({ email }: { email: string | null }) {
  const router = useRouter();
  const { update } = useSession();
  const playSfx = useSfx();

  const [restartOpen, setRestartOpen] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [typedEmail, setTypedEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRestart() {
    setRestarting(true);
    setError(null);

    const result = await restartJourney();
    if (!result.ok) {
      setError(result.error);
      setRestarting(false);
      return;
    }

    // The server rows are gone; clear this browser's copy too, or the next
    // sync would push the whole history straight back up.
    resetAllProgress();
    playSfx("confirm");
    // The profile lives on the session, so it must be refetched before any
    // guard runs — otherwise requireTrainer still sees the old pal.
    await update();
    router.replace("/setup");
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    const result = await deleteAccount(typedEmail);
    if (!result.ok) {
      setError(result.error);
      setDeleting(false);
      return;
    }

    resetAllProgress();
    await signOutAfterDeletion();
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-pixel text-title">Leave the Belt</h2>

      <div className="pixel-panel flex flex-col gap-3 p-4">
        <div>
          <p className="text-body font-medium">Restart my journey</p>
          <p className="mt-1 text-caption text-[var(--foreground-muted)]">
            Releases your Paruu and erases all progress — every battle,
            flashcard, lesson, your XP, level and streak. Your account and
            email stay, and you&apos;ll go through first-run setup again with
            a fresh choice of companion. This cannot be undone.
          </p>
        </div>

        {!restartOpen ? (
          <button
            onClick={() => {
              playSfx("back");
              setRestartOpen(true);
            }}
            className="pixel-button w-fit rounded-md bg-[var(--panel)] px-4 py-2 text-body font-medium"
          >
            Restart my journey…
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRestart}
              disabled={restarting}
              className="tap-target rounded-md border-2 border-[var(--danger)] bg-[var(--danger)]/10 px-4 py-2 text-body font-medium text-[var(--danger)] disabled:opacity-40"
            >
              {restarting ? "Resetting…" : "Yes — erase everything and restart"}
            </button>
            <button
              type="button"
              disabled={restarting}
              onClick={() => {
                setRestartOpen(false);
                setError(null);
              }}
              className="pixel-button rounded-md bg-[var(--panel)] px-4 py-2 text-body font-medium"
            >
              Keep my progress
            </button>
          </div>
        )}
      </div>

      <div className="pixel-panel flex flex-col gap-3 p-4">
        <div>
          <p className="text-body font-medium">Delete my profile</p>
          <p className="mt-1 text-caption text-[var(--foreground-muted)]">
            Removes your account, your Paruu, and all of your progress from
            our servers and this browser — immediately, with no grace period.
            If you sign up again later you&apos;ll start completely fresh.
            You can export a copy first from Options.
          </p>
        </div>

        {!deleteOpen ? (
          <button
            onClick={() => {
              playSfx("back");
              setDeleteOpen(true);
            }}
            className="tap-target w-fit rounded-md border-2 border-[var(--danger)] px-4 py-2 text-body font-medium text-[var(--danger)] hover:bg-[var(--danger)]/10"
          >
            Delete my profile…
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            className="flex flex-col gap-3"
          >
            <label htmlFor="profile-confirm-email" className="text-body">
              Type <strong>{email ?? "your email address"}</strong> to confirm.
            </label>
            <input
              id="profile-confirm-email"
              value={typedEmail}
              onChange={(e) => setTypedEmail(e.target.value)}
              autoComplete="off"
              placeholder={email ?? "you@example.com"}
              disabled={deleting}
              className="w-full max-w-sm rounded-md bg-[var(--panel)] px-3 py-2 text-body"
              style={{ border: "2px solid var(--border)" }}
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={deleting || typedEmail.trim() === ""}
                className="tap-target rounded-md border-2 border-[var(--danger)] bg-[var(--danger)]/10 px-4 py-2 text-body font-medium text-[var(--danger)] disabled:opacity-40"
              >
                {deleting ? "Deleting…" : "Permanently delete"}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setDeleteOpen(false);
                  setTypedEmail("");
                  setError(null);
                }}
                className="pixel-button rounded-md bg-[var(--panel)] px-4 py-2 text-body font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {error && <p className="text-body text-[var(--danger)]">{error}</p>}
    </section>
  );
}
