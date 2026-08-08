"use client";

import { useBlackout } from "@/components/battle/BlackoutProvider";

/**
 * The blackout, from a caller's point of view: `run(action)` covers the
 * screen, performs `action` behind the dark, and reveals whatever is there
 * once it is ready.
 *
 * The overlay itself is no longer returned. It is rendered once by
 * BlackoutProvider in the root layout, above the router, because an overlay
 * owned by the page being left cannot outlive that page — which is exactly
 * how it used to flash on a fast navigation and expire on a slow one. See
 * BlackoutProvider for the full account.
 *
 * `overlay` is kept in the return shape, as null, so the call sites that
 * render `{transitionOverlay}` keep compiling and keep meaning nothing. It
 * is the cheapest possible migration and it costs one harmless null.
 */
export function useBattleTransition() {
  const { run } = useBlackout();
  return { run, overlay: null };
}
