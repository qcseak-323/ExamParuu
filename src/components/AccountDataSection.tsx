"use client";

import { useState } from "react";
import {
  exportAccountData,
  deleteAccount,
  signOutAfterDeletion,
} from "@/lib/accountActions";
import { resetAllProgress } from "@/lib/storage";
import { useSfx } from "@/components/AudioProvider";

/**
 * Data-subject controls: take your data with you, or delete the account.
 *
 * Lives on Preferences rather than behind a support email, because an account
 * is now mandatory to use the app at all — telling people to write in and ask
 * isn't a reasonable way to handle data they were required to hand over.
 */
export default function AccountDataSection({ email }: { email: string | null }) {
  const playSfx = useSfx();
  const [exporting, setExporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typedEmail, setTypedEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const data = await exportAccountData();
      if (!data) {
        setError("Couldn't read your account. Try signing in again.");
        return;
      }

      // Built and revoked in the browser — the file never touches a server.
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `examready-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      playSfx("confirm");
    } catch (err) {
      console.error("Export failed", err);
      setError("Something went wrong building your export. Try again.");
    } finally {
      setExporting(false);
    }
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

    // The server rows are gone; clear this browser's copy too, or the next
    // sign-in would push the whole history back up from local storage.
    resetAllProgress();
    await signOutAfterDeletion();
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-pixel text-title">Your data</h2>

      <div className="pixel-panel flex flex-col gap-3 p-4">
        <div>
          <p className="text-body font-medium">Download everything we hold</p>
          <p className="mt-1 text-caption text-[var(--foreground-muted)]">
            A JSON file with your profile, every battle, your flashcard
            progress, and your lesson history. Session tokens are counted, not
            included — they&apos;re credentials.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="pixel-button w-fit rounded-md bg-[var(--panel)] px-4 py-2 text-body font-medium disabled:opacity-50"
        >
          {exporting ? "Preparing…" : "Export my data"}
        </button>
      </div>

      <div className="pixel-panel flex flex-col gap-3 p-4">
        <div>
          <p className="text-body font-medium">Delete my account</p>
          <p className="mt-1 text-caption text-[var(--foreground-muted)]">
            Removes your account, your ExamPal, and all of your progress from
            our servers and from this browser. This is immediate and cannot be
            undone — there is no grace period and no backup to restore from.
            Export first if you want a copy.
          </p>
        </div>

        {!confirmOpen ? (
          <button
            onClick={() => {
              playSfx("back");
              setConfirmOpen(true);
            }}
            className="w-fit rounded-md border border-[var(--danger)] px-4 py-2 text-body font-medium text-[var(--danger)] hover:bg-[var(--danger)]/10"
          >
            Delete my account…
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            className="flex flex-col gap-3"
          >
            <label htmlFor="confirm-email" className="text-body">
              Type <strong>{email ?? "your email address"}</strong> to confirm.
            </label>
            <input
              id="confirm-email"
              value={typedEmail}
              onChange={(e) => setTypedEmail(e.target.value)}
              autoComplete="off"
              placeholder={email ?? "you@example.com"}
              disabled={deleting}
              className="w-full max-w-sm rounded-md bg-[var(--panel)] px-3 py-2 text-body"
              style={{ border: "2px solid var(--window-edge)" }}
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={deleting || typedEmail.trim() === ""}
                className="rounded-md border border-[var(--danger)] bg-[var(--danger)]/10 px-4 py-2 text-body font-medium text-[var(--danger)] disabled:opacity-40"
              >
                {deleting ? "Deleting…" : "Permanently delete"}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setConfirmOpen(false);
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

      {error && (
        <p className="text-body text-[var(--danger)]">{error}</p>
      )}
    </section>
  );
}
