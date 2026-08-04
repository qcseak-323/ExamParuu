"use client";

import { useSession } from "next-auth/react";

/**
 * States where progress actually lives. This has to track reality: signed-in
 * users' attempts are mirrored to the database, so claiming "nothing is sent
 * anywhere" to everyone would be untrue.
 */
export default function StorageNotice() {
  const { status } = useSession();

  if (status === "authenticated") {
    return (
      <p className="mt-3 text-sm text-[var(--foreground-muted)]">
        Saved to your account, so it follows you across devices, and kept in
        this browser for offline use.
      </p>
    );
  }

  return (
    <p className="mt-3 text-sm text-[var(--foreground-muted)]">
      Stored only in this browser — nothing leaves your device unless you log
      in.
    </p>
  );
}
