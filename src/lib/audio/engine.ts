import { noteToFreq } from "./notes";
import { TRACKS, type Channel, type Track, type TrackName } from "./tracks";

/**
 * A small chiptune engine built on Web Audio.
 *
 * Everything is synthesized at runtime — there are no audio files in this
 * project. That keeps the bundle unchanged, sidesteps any question about
 * music licensing, and lets the "instrument" definitions live next to the
 * note data.
 *
 * Notes are scheduled ahead of time against `AudioContext.currentTime` rather
 * than fired from timers. `setTimeout` drift is audible as a wobbling tempo,
 * whereas the audio clock is sample-accurate; the repeating timer only decides
 * *what* to queue, never *when* it sounds.
 */

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.15;

export type SfxName =
  | "cursor"
  | "confirm"
  | "back"
  | "correct"
  | "wrong"
  | "damage"
  | "faint"
  | "levelUp"
  | "text";

type ChannelState = {
  channel: Channel;
  stepIndex: number;
  nextNoteTime: number;
  /** Set once a non-looping channel runs out of steps. */
  done: boolean;
};

class ChiptuneEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private pulseWave: PeriodicWave | null = null;

  private timer: ReturnType<typeof setInterval> | null = null;
  private states: ChannelState[] = [];
  private currentTrack: Track | null = null;
  private currentName: TrackName | null = null;

  private musicEnabled = true;
  private sfxEnabled = true;
  private unlocked = false;

  // --- Lifecycle ----------------------------------------------------------

  /**
   * Creates the AudioContext. Browsers hand it to us in a `suspended` state
   * unless a user gesture is in progress, which is why `unlock()` exists.
   */
  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (this.ctx) return this.ctx;

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;

    const ctx = new Ctor();
    this.ctx = ctx;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.6;
    this.masterGain.connect(ctx.destination);

    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = this.musicEnabled ? 1 : 0;
    this.musicGain.connect(this.masterGain);

    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = this.sfxEnabled ? 1 : 0;
    this.sfxGain.connect(this.masterGain);

    // Two seconds of white noise, reused for every percussion hit.
    const frames = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;

    // A 25%-duty pulse, which is the sound most people actually mean by
    // "8-bit lead". A plain square wave is 50% and noticeably rounder.
    const harmonics = 32;
    const real = new Float32Array(harmonics);
    const imag = new Float32Array(harmonics);
    const duty = 0.25;
    for (let n = 1; n < harmonics; n += 1) {
      imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    }
    this.pulseWave = ctx.createPeriodicWave(real, imag, {
      disableNormalization: false,
    });

    return ctx;
  }

  /**
   * Must be called from inside a real user gesture. Returns true once audio
   * is actually permitted to sound.
   */
  async unlock(): Promise<boolean> {
    const ctx = this.ensureContext();
    if (!ctx) return false;

    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        return false;
      }
    }

    this.unlocked = ctx.state === "running";
    return this.unlocked;
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }

  // --- Settings -----------------------------------------------------------

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (this.musicGain && this.ctx) {
      // A short ramp instead of a hard set — an instantaneous gain change on
      // a sounding oscillator is a click.
      const now = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
      this.musicGain.gain.linearRampToValueAtTime(enabled ? 1 : 0, now + 0.08);
    }
    if (!enabled) this.stopTrack();
  }

  setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
    if (this.sfxGain) this.sfxGain.gain.value = enabled ? 1 : 0;
  }

  // --- Music --------------------------------------------------------------

  getCurrentTrack(): TrackName | null {
    return this.currentName;
  }

  playTrack(name: TrackName): void {
    if (!this.musicEnabled) return;
    if (this.currentName === name && this.timer !== null) return;

    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== "running") return;

    this.stopTrack();

    const track = TRACKS[name];
    this.currentTrack = track;
    this.currentName = name;

    const startAt = ctx.currentTime + 0.06;
    this.states = track.channels.map((channel) => ({
      channel,
      stepIndex: 0,
      nextNoteTime: startAt,
      done: false,
    }));

    this.timer = setInterval(() => this.schedule(), LOOKAHEAD_MS);
    this.schedule();
  }

  stopTrack(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.states = [];
    this.currentTrack = null;
    this.currentName = null;
  }

  private schedule(): void {
    const ctx = this.ctx;
    const track = this.currentTrack;
    if (!ctx || !track || !this.musicGain) return;

    const secondsPerBeat = 60 / track.bpm;
    const horizon = ctx.currentTime + SCHEDULE_AHEAD_S;

    for (const state of this.states) {
      while (!state.done && state.nextNoteTime < horizon) {
        const steps = state.channel.steps;
        const [pitch, beats] = steps[state.stepIndex];
        const duration = beats * secondsPerBeat;

        if (pitch !== null) {
          this.playVoice(
            state.channel,
            pitch,
            state.nextNoteTime,
            duration,
            this.musicGain,
          );
        }

        state.nextNoteTime += duration;
        state.stepIndex += 1;

        if (state.stepIndex >= steps.length) {
          // Channels loop on their own length, so a 4-beat drum pattern sits
          // under a 32-beat melody without the data being repeated.
          if (track.loop) {
            state.stepIndex = 0;
          } else {
            state.done = true;
          }
        }
      }
    }

    if (this.states.every((s) => s.done)) this.stopTrack();
  }

  private playVoice(
    channel: Channel,
    pitch: string,
    at: number,
    duration: number,
    destination: GainNode,
  ): void {
    if (channel.wave === "noise") {
      this.playDrum(pitch, at, channel.gain, destination);
      return;
    }

    const freq = noteToFreq(pitch);
    if (freq === null) return;

    const ctx = this.ctx;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    if (channel.wave === "pulse" && this.pulseWave) {
      osc.setPeriodicWave(this.pulseWave);
    } else {
      osc.type = channel.wave === "pulse" ? "square" : channel.wave;
    }
    osc.frequency.setValueAtTime(freq, at);

    // Leave a sliver of silence at the end of every note so repeated pitches
    // articulate instead of running together as one long tone.
    const sustain = Math.max(duration * 0.85, duration - 0.04);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(channel.gain, at + 0.008);
    env.gain.setValueAtTime(channel.gain, at + sustain * 0.6);
    env.gain.exponentialRampToValueAtTime(0.0001, at + sustain);

    osc.connect(env);
    env.connect(destination);
    osc.start(at);
    osc.stop(at + sustain + 0.02);
  }

  private playDrum(
    voice: string,
    at: number,
    gain: number,
    destination: GainNode,
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;

    if (voice === "K") {
      // A pitch-swept sine reads as a kick more clearly than filtered noise
      // at this volume.
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, at);
      osc.frequency.exponentialRampToValueAtTime(45, at + 0.11);

      const env = ctx.createGain();
      env.gain.setValueAtTime(gain * 2.2, at);
      env.gain.exponentialRampToValueAtTime(0.0001, at + 0.13);

      osc.connect(env);
      env.connect(destination);
      osc.start(at);
      osc.stop(at + 0.15);
      return;
    }

    if (!this.noiseBuffer) return;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();

    if (voice === "S") {
      filter.type = "bandpass";
      filter.frequency.value = 1800;
      env.gain.setValueAtTime(gain * 1.6, at);
      env.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
      src.start(at);
      src.stop(at + 0.14);
    } else {
      filter.type = "highpass";
      filter.frequency.value = 7000;
      env.gain.setValueAtTime(gain * 0.8, at);
      env.gain.exponentialRampToValueAtTime(0.0001, at + 0.04);
      src.start(at);
      src.stop(at + 0.06);
    }

    src.connect(filter);
    filter.connect(env);
    env.connect(destination);
  }

  // --- Sound effects ------------------------------------------------------

  playSfx(name: SfxName): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== "running" || !this.sfxGain) return;

    const now = ctx.currentTime;

    switch (name) {
      case "cursor":
        this.blip(880, now, 0.035, 0.18);
        break;
      case "text":
        this.blip(1320, now, 0.012, 0.05);
        break;
      case "confirm":
        this.blip(660, now, 0.05, 0.2);
        this.blip(990, now + 0.05, 0.08, 0.2);
        break;
      case "back":
        this.blip(520, now, 0.05, 0.18);
        this.blip(330, now + 0.05, 0.08, 0.18);
        break;
      case "correct":
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          this.blip(f, now + i * 0.055, 0.09, 0.2);
        });
        break;
      case "wrong":
        this.sweep(320, 120, now, 0.32, 0.22, "sawtooth");
        break;
      case "damage":
        this.noiseBurst(now, 0.16, 0.25, 900);
        this.sweep(420, 180, now, 0.18, 0.16, "square");
        break;
      case "faint":
        this.sweep(660, 90, now, 0.7, 0.22, "square");
        break;
      case "levelUp":
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
          this.blip(f, now + i * 0.07, 0.12, 0.22);
        });
        break;
    }
  }

  private blip(
    freq: number,
    at: number,
    duration: number,
    gain: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain) return;

    const osc = ctx.createOscillator();
    if (this.pulseWave) {
      osc.setPeriodicWave(this.pulseWave);
    } else {
      osc.type = "square";
    }
    osc.frequency.setValueAtTime(freq, at);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(gain, at + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(at);
    osc.stop(at + duration + 0.02);
  }

  private sweep(
    from: number,
    to: number,
    at: number,
    duration: number,
    gain: number,
    type: OscillatorType,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain) return;

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), at + duration);

    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, at);
    env.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(at);
    osc.stop(at + duration + 0.02);
  }

  private noiseBurst(
    at: number,
    duration: number,
    gain: number,
    cutoff: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain || !this.noiseBuffer) return;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = cutoff;

    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, at);
    env.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    src.connect(filter);
    filter.connect(env);
    env.connect(this.sfxGain);
    src.start(at);
    src.stop(at + duration + 0.02);
  }
}

/**
 * One engine per tab. Module scope rather than React context because audio
 * hardware is genuinely global — two engines would mean two AudioContexts
 * and doubled music.
 */
export const audio = new ChiptuneEngine();
