"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { audio, type SfxName } from "@/lib/audio/engine";
import type { TrackName } from "@/lib/audio/tracks";
import { usePreferences } from "@/lib/preferences";

/**
 * Owns the one audio engine and decides what should be playing.
 *
 * On the "music starts automatically" requirement: every current browser
 * refuses to let a page produce sound before the visitor has interacted with
 * it, and there is no flag that opts out. So the *preference* defaults to on,
 * and the engine is unlocked on the first real gesture anywhere on the page —
 * a click, a key, a tap. In practice music begins the moment someone does
 * anything at all, and until then the page is silent rather than broken.
 */

type AudioContextValue = {
  /** Overrides the route's default track for as long as it is set. */
  setTrack: (track: TrackName | null) => void;
  playSfx: (name: SfxName) => void;
  /** True once the browser has actually allowed audio to start. */
  ready: boolean;
};

const AudioCtx = createContext<AudioContextValue | null>(null);

/** Which loop plays where, absent an explicit override from a component. */
function defaultTrackForPath(pathname: string): TrackName | null {
  if (pathname === "/choose-pal") return "starter";
  // The landing page is the one thing a signed-out visitor sees; leave it
  // silent so a first impression is never an unexpected noise.
  if (pathname === "/" || pathname.startsWith("/login")) return null;
  return "town";
}

export default function AudioProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const prefs = usePreferences();
  const pathname = usePathname();
  const [override, setOverride] = useState<TrackName | null>(null);
  const [ready, setReady] = useState(false);

  // Unlock on the first gesture of any kind, then stop listening.
  useEffect(() => {
    if (ready) return;

    let cancelled = false;
    const handler = () => {
      audio.unlock().then((ok) => {
        if (ok && !cancelled) setReady(true);
      });
    };

    const events: (keyof DocumentEventMap)[] = [
      "pointerdown",
      "keydown",
      "touchstart",
    ];
    events.forEach((event) =>
      document.addEventListener(event, handler, { once: true, passive: true }),
    );

    return () => {
      cancelled = true;
      events.forEach((event) => document.removeEventListener(event, handler));
    };
  }, [ready]);

  // Keep the engine in step with the user's saved preferences.
  useEffect(() => {
    audio.setMusicEnabled(prefs.bgmEnabled);
  }, [prefs.bgmEnabled]);

  useEffect(() => {
    audio.setSfxEnabled(prefs.sfxEnabled);
  }, [prefs.sfxEnabled]);

  // Decide what should be playing.
  useEffect(() => {
    if (!ready || !prefs.bgmEnabled) return;

    const target = override ?? defaultTrackForPath(pathname);
    if (target === null) {
      audio.stopTrack();
    } else {
      audio.playTrack(target);
    }
  }, [ready, prefs.bgmEnabled, override, pathname]);

  const playSfx = useCallback((name: SfxName) => audio.playSfx(name), []);
  const setTrack = useCallback(
    (track: TrackName | null) => setOverride(track),
    [],
  );

  const value = useMemo(
    () => ({ setTrack, playSfx, ready }),
    [setTrack, playSfx, ready],
  );

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

function useAudioContext(): AudioContextValue {
  const ctx = useContext(AudioCtx);
  if (!ctx) {
    throw new Error("Audio hooks must be used inside <AudioProvider>");
  }
  return ctx;
}

/** Plays one-shot sound effects. */
export function useSfx(): (name: SfxName) => void {
  return useAudioContext().playSfx;
}

/**
 * Requests a track for as long as the calling component is mounted, then
 * hands control back to the route default.
 */
export function useSceneTrack(track: TrackName | null): void {
  const { setTrack } = useAudioContext();

  useEffect(() => {
    setTrack(track);
    return () => setTrack(null);
  }, [setTrack, track]);
}

/** Imperative control, for components that change track mid-lifetime. */
export function useTrackControl(): (track: TrackName | null) => void {
  return useAudioContext().setTrack;
}
