"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { audio } from "@/lib/audio/engine";
import { usePreferences } from "@/lib/preferences";
import { useSfx } from "@/components/AudioProvider";

/**
 * The blackout, owned above the router.
 *
 * This lives in the root layout, and that is the whole point. The overlay
 * used to be rendered by the page it was leaving, which made its lifetime a
 * fixed timer racing a navigation of unknown length. Both of the ways that
 * went wrong were reported:
 *
 *   - the new route committed FAST, the old tree unmounted, and the overlay
 *     went with it part-way through its own keyframe — a flash; or
 *   - the new route committed SLOWLY, the timer expired first, and the dark
 *     lifted to reveal the page we were supposed to be leaving.
 *
 * So the dark is no longer on a timer at all. It is a three-phase machine —
 * cover, hold, reveal — and the hold lasts exactly as long as it needs to:
 * the action runs inside `startTransition`, and the reveal does not begin
 * until React reports the transition settled. Rendered from the layout, it
 * survives the navigation that happens underneath it.
 *
 * MIN_HOLD_MS stops an instant navigation from strobing through the hold.
 * MAX_HOLD_MS is the safety valve: a navigation that never settles must not
 * leave someone staring at a black screen forever, so the reveal happens
 * anyway and they at least get an interactive page back.
 */

/** Must match the cover keyframes in globals.css. */
const COVER_MS = 700;
const MIN_HOLD_MS = 350;
const MAX_HOLD_MS = 4000;

const VARIANTS = [
  { name: "blinds", cue: "ladder" },
  { name: "iris", cue: "flutter" },
  { name: "dissolve", cue: "toll" },
] as const;

type Variant = (typeof VARIANTS)[number];
type Phase = "covering" | "holding" | "revealing";
type Blackout = { variant: Variant; phase: Phase };

type BlackoutContextValue = { run: (action: () => void) => void };

const BlackoutCtx = createContext<BlackoutContextValue | null>(null);

export function useBlackout(): BlackoutContextValue {
  const ctx = useContext(BlackoutCtx);
  // Deliberately not throwing: a component rendered outside the provider
  // should still work, just without the theatre.
  return ctx ?? { run: (action) => action() };
}

export default function BlackoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const playSfx = useSfx();
  const prefs = usePreferences();
  const [state, setState] = useState<Blackout | null>(null);
  const [minHoldDone, setMinHoldDone] = useState(false);
  const [isPending, startTransition] = useTransition();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const run = useCallback(
    (action: () => void) => {
      const drawn = VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
      playSfx("transition");
      audio.playCue(drawn.cue);

      // Reduced motion kills the keyframes, so waiting out a cover that isn't
      // playing is just dead time. The hold still happens — it is about the
      // page being ready, which has nothing to do with motion.
      const coverMs = prefs.reducedMotion ? 0 : COVER_MS;
      const minHoldMs = prefs.reducedMotion ? 0 : MIN_HOLD_MS;

      timers.current.forEach(clearTimeout);
      setMinHoldDone(false);
      setState({ variant: drawn, phase: "covering" });

      timers.current = [
        setTimeout(() => {
          // Inside a transition so `isPending` tracks it. For an in-page
          // action this settles almost at once and MIN_HOLD carries the beat.
          startTransition(() => action());
          setState((s) => (s ? { ...s, phase: "holding" } : s));
          timers.current.push(
            setTimeout(() => setMinHoldDone(true), minHoldMs),
          );
        }, coverMs),
        setTimeout(
          () =>
            setState((s) =>
              s && s.phase !== "revealing" ? { ...s, phase: "revealing" } : s,
            ),
          coverMs + MAX_HOLD_MS,
        ),
      ];
    },
    [playSfx, prefs.reducedMotion],
  );

  // The hold ends when the page is ready, not when a clock says so. Adjusted
  // during render — the sanctioned pattern here, because
  // `react-hooks/set-state-in-effect` forbids doing this in an effect body.
  const ready =
    state?.phase === "holding" && !isPending && minHoldDone;
  const [prevReady, setPrevReady] = useState(false);
  if (ready !== prevReady) {
    setPrevReady(ready);
    if (ready) setState((s) => (s ? { ...s, phase: "revealing" } : s));
  }

  return (
    <BlackoutCtx.Provider value={{ run }}>
      {children}
      {state && (
        <div
          className={`blackout blackout--${state.variant.name}`}
          data-phase={state.phase}
          aria-hidden="true"
          // The reveal clears itself when its own animation finishes rather
          // than on a matching timer, so the two can never drift apart.
          // Reduced motion collapses the keyframe and this still fires.
          onAnimationEnd={() => {
            if (state.phase === "revealing") setState(null);
          }}
        >
          {state.variant.name === "blinds" && (
            <>
              <i className="blackout-band blackout-band--top" />
              <i className="blackout-band blackout-band--bottom" />
            </>
          )}
          {state.variant.name === "iris" && <i className="blackout-iris" />}
          {state.variant.name === "dissolve" && (
            <i className="blackout-dissolve" />
          )}
        </div>
      )}
    </BlackoutCtx.Provider>
  );
}
