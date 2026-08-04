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
