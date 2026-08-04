/**
 * Note-name to frequency conversion for the chiptune engine.
 *
 * Writing melodies as "C4" / "F#5" rather than raw hertz keeps the track data
 * in tracks.ts readable and transposable.
 */

const SEMITONES: Record<string, number> = {
  C: -9,
  "C#": -8,
  Db: -8,
  D: -7,
  "D#": -6,
  Eb: -6,
  E: -5,
  F: -4,
  "F#": -3,
  Gb: -3,
  G: -2,
  "G#": -1,
  Ab: -1,
  A: 0,
  "A#": 1,
  Bb: 1,
  B: 2,
};

const A4_HZ = 440;
const A4_OCTAVE = 4;

/** A rest. */
export const REST = null;

export type Pitch = string | null;

const cache = new Map<string, number>();

export function noteToFreq(note: Pitch): number | null {
  if (note === null) return null;

  const cached = cache.get(note);
  if (cached !== undefined) return cached;

  const match = /^([A-G][#b]?)(-?\d)$/.exec(note);
  if (!match) return null;

  const [, name, octaveText] = match;
  const semitone = SEMITONES[name];
  if (semitone === undefined) return null;

  const octave = Number(octaveText);
  const halfSteps = semitone + (octave - A4_OCTAVE) * 12;
  const freq = A4_HZ * Math.pow(2, halfSteps / 12);

  cache.set(note, freq);
  return freq;
}
