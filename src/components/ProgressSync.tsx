"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { syncProgressWithDb } from "@/lib/actions";
import {
  mergeRemoteProgress,
  getQuizAttemptsForSync,
  getFlashcardProgress,
} from "@/lib/storage";

/**
 * Reconciles local progress with the signed-in user's account exactly once
 * per session: pushes up anything earned while signed out, then merges the
 * account's full history back down so it shows on this device too.
 */
export default function ProgressSync() {
  const { data: session, status } = useSession();
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    const userId = session?.user?.id;
    if (status !== "authenticated" || !userId) return;
    if (syncedFor.current === userId) return;
    syncedFor.current = userId;

    let cancelled = false;
    syncProgressWithDb(getQuizAttemptsForSync(), getFlashcardProgress())
      .then((remote) => {
        if (!cancelled) mergeRemoteProgress(remote);
      })
      .catch((err) => {
        // Non-fatal: the local copy is still intact and usable, so let the
        // user carry on rather than blocking the UI on a sync failure.
        syncedFor.current = null;
        console.error("Could not sync progress with your account", err);
      });

    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.id]);

  return null;
}
