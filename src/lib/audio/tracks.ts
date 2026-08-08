import type { Pitch } from "./notes";

/**
 * Original chiptune compositions, written as data rather than shipped as
 * audio files. Nothing here is transcribed from an existing game — these are
 * simple original loops in the style of 8-bit console music.
 *
 * Each channel loops independently on its own total length, so a four-beat
 * drum pattern can sit under a thirty-two-beat melody without repeating the
 * pattern data eight times.
 */

/** `[pitch, duration in beats]`. A null pitch is a rest. */
export type Step = readonly [Pitch, number];

export type Waveform = "square" | "pulse" | "triangle" | "sawtooth" | "noise";

export type Channel = {
  wave: Waveform;
  /** Relative level, 0–1, before the master music gain. */
  gain: number;
  steps: readonly Step[];
};

export type Track = {
  bpm: number;
  loop: boolean;
  channels: readonly Channel[];
};

export type TrackName =
  | "town"
  | "battle"
  | "intro"
  | "victory"
  | "defeat"
  | "starter";

// Percussion reuses the pitch slot as a drum-voice selector:
// K = kick, S = snare, H = hat.
const DRUM_BEAT: readonly Step[] = [
  ["K", 0.5],
  ["H", 0.5],
  ["S", 0.5],
  ["H", 0.5],
  ["K", 0.5],
  ["H", 0.5],
  ["S", 0.5],
  ["H", 0.5],
];

/** Bright, bouncy overworld loop. Plays everywhere outside a battle. */
const TOWN: Track = {
  bpm: 138,
  loop: true,
  channels: [
    {
      wave: "pulse",
      gain: 0.22,
      steps: [
        ["E5", 1], ["G5", 1], ["A5", 1], ["G5", 1],
        ["E5", 1], ["D5", 1], ["C5", 2],
        ["D5", 1], ["F5", 1], ["G5", 1], ["F5", 1],
        ["D5", 1], ["C5", 1], ["A4", 2],
        ["C5", 1], ["E5", 1], ["G5", 1], ["E5", 1],
        ["F5", 1], ["E5", 1], ["D5", 2],
        ["G5", 1], ["A5", 1], ["G5", 1], ["E5", 1],
        ["D5", 1], ["E5", 1], ["C5", 2],
      ],
    },
    {
      wave: "triangle",
      gain: 0.3,
      steps: [
        ["C3", 2], ["G3", 2],
        ["C3", 2], ["G3", 2],
        ["F3", 2], ["C4", 2],
        ["F3", 2], ["C4", 2],
        ["C3", 2], ["G3", 2],
        ["F3", 2], ["C4", 2],
        ["G3", 2], ["D4", 2],
        ["C3", 2], ["G3", 2],
      ],
    },
    { wave: "noise", gain: 0.12, steps: DRUM_BEAT },
  ],
};

/** Driving minor-key loop for quiz battles. */
const BATTLE: Track = {
  bpm: 168,
  loop: true,
  channels: [
    {
      wave: "pulse",
      gain: 0.22,
      steps: [
        ["A4", 0.5], ["C5", 0.5], ["E5", 0.5], ["A5", 0.5], ["G5", 1], ["E5", 1],
        ["F5", 0.5], ["E5", 0.5], ["D5", 0.5], ["C5", 0.5], ["D5", 1], ["E5", 1],
        ["A4", 0.5], ["C5", 0.5], ["E5", 0.5], ["A5", 0.5], ["G5", 1], ["B5", 1],
        ["A5", 2], [null, 2],
      ],
    },
    {
      wave: "triangle",
      gain: 0.32,
      steps: [
        ["A2", 1], ["A2", 1], ["A2", 1], ["A2", 1],
        ["F2", 1], ["F2", 1], ["G2", 1], ["G2", 1],
        ["A2", 1], ["A2", 1], ["A2", 1], ["A2", 1],
        ["E2", 2], ["E2", 2],
      ],
    },
    { wave: "noise", gain: 0.14, steps: DRUM_BEAT },
  ],
};

/**
 * The standoff. Plays for the length of the battle introduction only — the
 * cast walking on, the banner naming the opponent — and hands over to BATTLE
 * the moment the first question is drawn.
 *
 * Deliberately not a shortened BATTLE: this is the beat *before* the fight,
 * so it holds instead of driving. The lead is two stabs and a rest over a
 * pedal bass that will not resolve, and the drums keep time without a
 * backbeat. BATTLE arriving underneath the first question is then a release,
 * which is the whole job of an introduction.
 *
 * It loops because the introduction is skippable and can therefore end at any
 * moment; a one-shot would leave silence for whatever was left of the hold.
 */
const INTRO: Track = {
  bpm: 132,
  loop: true,
  channels: [
    {
      wave: "pulse",
      gain: 0.2,
      steps: [
        ["A4", 0.5], [null, 0.5], ["A4", 0.5], [null, 0.5],
        ["C5", 0.5], [null, 0.5], ["E5", 1],
        ["D5", 0.5], [null, 0.5], ["D5", 0.5], [null, 0.5],
        ["F5", 0.5], [null, 0.5], ["A5", 1],
      ],
    },
    {
      wave: "triangle",
      gain: 0.3,
      steps: [
        ["A2", 1], ["A2", 1], ["A2", 1], ["A2", 1],
        ["F2", 1], ["F2", 1], ["G2", 1], ["G2", 1],
      ],
    },
    {
      wave: "noise",
      gain: 0.12,
      steps: [["H", 1], ["H", 1], ["S", 1], ["H", 1]],
    },
  ],
};

/** Short fanfare after clearing a battle. Does not loop. */
const VICTORY: Track = {
  bpm: 150,
  loop: false,
  channels: [
    {
      wave: "pulse",
      gain: 0.26,
      steps: [
        ["C5", 0.25], ["E5", 0.25], ["G5", 0.25], ["C6", 0.75],
        ["G5", 0.25], ["C6", 1.5],
      ],
    },
    {
      wave: "triangle",
      gain: 0.3,
      steps: [["C3", 0.75], ["G3", 0.75], ["C3", 0.25], ["C3", 1.5]],
    },
  ],
};

/** Short descending sting when your pal faints. Does not loop. */
const DEFEAT: Track = {
  bpm: 108,
  loop: false,
  channels: [
    {
      wave: "pulse",
      gain: 0.22,
      steps: [["E5", 0.5], ["D5", 0.5], ["C5", 0.5], ["B4", 0.5], ["A4", 2]],
    },
    {
      wave: "triangle",
      gain: 0.28,
      steps: [["A3", 1], ["G3", 1], ["F3", 2]],
    },
  ],
};

/** Gentle, curious loop for the starter-select screen. */
const STARTER: Track = {
  bpm: 108,
  loop: true,
  channels: [
    {
      wave: "triangle",
      gain: 0.26,
      steps: [
        ["C5", 1], ["E5", 1], ["G5", 1], ["E5", 1],
        ["F5", 1], ["A5", 1], ["G5", 2],
        ["E5", 1], ["G5", 1], ["C6", 1], ["G5", 1],
        ["F5", 1], ["E5", 1], ["C5", 2],
      ],
    },
    {
      wave: "triangle",
      gain: 0.24,
      steps: [
        ["C3", 2], ["G3", 2], ["F3", 2], ["C4", 2],
        ["C3", 2], ["G3", 2], ["F3", 2], ["C3", 2],
      ],
    },
  ],
};

export const TRACKS: Record<TrackName, Track> = {
  town: TOWN,
  battle: BATTLE,
  intro: INTRO,
  victory: VICTORY,
  defeat: DEFEAT,
  starter: STARTER,
};

export function trackBeats(track: Track): number {
  return track.channels.reduce(
    (longest, channel) =>
      Math.max(
        longest,
        channel.steps.reduce((sum, [, beats]) => sum + beats, 0),
      ),
    0,
  );
}

// --- Blackout cues ----------------------------------------------------------

/**
 * The three musical builds that play under a blackout transition.
 *
 * A cue is a Track that never loops and is never "the music": the engine
 * ducks whatever loop is running to silence, plays the cue over the top, and
 * lifts the loop back afterwards (see `playCue`). That is what lets the same
 * cue work when the screen is leaving the overworld for a battle — the town
 * loop drops out, the build takes over, and the intro theme is what comes
 * back up.
 *
 * All three intensify the same way an encounter should: note values halve as
 * the cue runs, so the last bar is eight times the rate of the first, and the
 * percussion thickens underneath. They differ in *how* — a climbing run, a
 * hovering flutter, a hammering toll — so hearing one twice in a row is
 * obvious enough to be worth having three.
 *
 * Each is exactly 8 beats at 240bpm = 2000ms, matching the blackout keyframes
 * in globals.css. That pairing is not decorative: a cue shorter than the
 * blackout leaves dead air in the dark, which is the whole reason the opening
 * bars here are slow and sparse rather than the tempo simply being dropped.
 * Lengthening the blackout means lengthening these. `cueDurationMs` is how
 * the engine knows when to hand the loop back.
 */
export type CueName = "ladder" | "flutter" | "toll";

/**
 * A chromatic climb that accelerates into a pair of low slams. Pairs with the
 * blinds blackout: the run rises, the bands close on the slam.
 */
const CUE_LADDER: Track = {
  bpm: 240,
  loop: false,
  channels: [
    {
      wave: "pulse",
      gain: 0.26,
      steps: [
        ["C4", 1], ["E4", 1],
        ["G4", 0.5], ["A#4", 0.5], ["C5", 0.5], ["D5", 0.5],
        ["E5", 0.25], ["F#5", 0.25], ["G#5", 0.25], ["A#5", 0.25],
        ["C6", 0.25], ["C6", 0.25], ["D6", 0.25], ["D6", 0.25],
        ["E6", 0.125], ["E6", 0.125], ["E6", 0.125], ["E6", 0.125],
        ["E6", 0.125], ["E6", 0.125], ["E6", 0.125], ["E6", 0.125],
        [null, 1],
      ],
    },
    {
      wave: "triangle",
      gain: 0.34,
      steps: [
        ["C2", 2], ["C2", 1], ["C2", 1],
        ["C2", 0.5], ["C2", 0.5], ["C2", 0.5], ["C2", 0.5],
        ["F1", 1], ["C2", 1],
      ],
    },
    {
      wave: "noise",
      gain: 0.16,
      steps: [
        ["H", 1], ["H", 1],
        ["H", 0.5], ["H", 0.5], ["H", 0.5], ["H", 0.5],
        ["S", 0.25], ["S", 0.25], ["S", 0.25], ["S", 0.25],
        ["S", 0.25], ["S", 0.25], ["S", 0.25], ["S", 0.25],
        ["K", 0.5], ["K", 0.5], ["K", 0.5], ["K", 0.5],
      ],
    },
  ],
};

/**
 * The hovering one: a two-note flutter that tightens and climbs a step at a
 * time. Pairs with the iris blackout — it circles before it closes.
 */
const CUE_FLUTTER: Track = {
  bpm: 240,
  loop: false,
  channels: [
    {
      wave: "pulse",
      gain: 0.24,
      steps: [
        ["E5", 0.5], ["A4", 0.5], ["E5", 0.5], ["A4", 0.5],
        ["F5", 0.25], ["A#4", 0.25], ["F5", 0.25], ["A#4", 0.25],
        ["G5", 0.25], ["C5", 0.25], ["G5", 0.25], ["C5", 0.25],
        ["A5", 0.25], ["D5", 0.25], ["A5", 0.25], ["D5", 0.25],
        ["A#5", 0.125], ["D#5", 0.125], ["A#5", 0.125], ["D#5", 0.125],
        ["A#5", 0.125], ["D#5", 0.125], ["A#5", 0.125], ["D#5", 0.125],
        ["C6", 0.125], ["C6", 0.125], ["C6", 0.125], ["C6", 0.125],
        ["C6", 0.125], ["C6", 0.125], ["C6", 0.125], ["C6", 0.125],
        ["C6", 1],
      ],
    },
    {
      wave: "triangle",
      gain: 0.32,
      steps: [
        ["A2", 2], ["A#2", 2],
        ["C3", 1], ["D3", 1],
        ["E3", 0.5], ["F3", 0.5], ["A2", 1],
      ],
    },
    {
      wave: "noise",
      gain: 0.15,
      steps: [
        ["H", 1], ["H", 1], ["H", 1], ["H", 1],
        ["H", 0.5], ["H", 0.5], ["H", 0.5], ["H", 0.5],
        ["S", 0.25], ["S", 0.25], ["S", 0.25], ["S", 0.25],
        ["K", 0.5], ["K", 0.5],
      ],
    },
  ],
};

/**
 * The heaviest of the three: one note hammered at a doubling rate under a
 * falling bass. Pairs with the stagger blackout, whose false start lands on
 * the second toll.
 */
const CUE_TOLL: Track = {
  bpm: 240,
  loop: false,
  channels: [
    {
      wave: "pulse",
      gain: 0.26,
      steps: [
        ["A4", 1], ["A4", 1],
        ["A4", 0.5], ["A4", 0.5], ["A4", 0.5], ["A4", 0.5],
        ["C5", 0.5], ["C5", 0.5], ["D5", 0.5], ["D5", 0.5],
        ["E5", 0.25], ["E5", 0.25], ["E5", 0.25], ["E5", 0.25],
        ["A5", 1],
      ],
    },
    {
      wave: "sawtooth",
      gain: 0.2,
      steps: [
        ["A3", 2], ["G3", 2],
        ["F3", 1], ["E3", 1],
        ["D3", 1], ["A2", 1],
      ],
    },
    {
      wave: "noise",
      gain: 0.18,
      steps: [
        ["K", 1], ["K", 1],
        ["K", 0.5], ["K", 0.5], ["K", 0.5], ["K", 0.5],
        ["K", 0.25], ["K", 0.25], ["K", 0.25], ["K", 0.25],
        ["K", 0.25], ["K", 0.25], ["K", 0.25], ["K", 0.25],
        ["S", 0.25], ["S", 0.25], ["S", 0.25], ["S", 0.25],
        ["K", 1],
      ],
    },
  ],
};

export const TRANSITION_CUES: Record<CueName, Track> = {
  ladder: CUE_LADDER,
  flutter: CUE_FLUTTER,
  toll: CUE_TOLL,
};

/** How long a cue sounds, in milliseconds — its longest channel. */
export function cueDurationMs(name: CueName): number {
  const cue = TRANSITION_CUES[name];
  return (trackBeats(cue) / cue.bpm) * 60_000;
}
