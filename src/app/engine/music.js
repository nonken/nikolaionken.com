"use client";

import { SCALES } from "./circadian.js";

/*
 * Generative music engine.
 * - Additive synthesis: harmonic drone with independent LFOs for living timbre
 * - Chord progressions: slow morphing between scale degrees
 * - Karplus-Strong: plucked strings with velocity/duration variation
 * - Circadian integration: mood shapes timbre, reverb, pitch
 * - Ambient texture layer: filtered noise bed
 * - All procedural, no samples.
 */

const BASE_FREQ = 110; // A2

function midiToFreq(semitones) {
  return BASE_FREQ * Math.pow(2, semitones / 12);
}

// Mood presets for circadian integration
const MOOD_PARAMS = {
  ambient: { pitchOffset: -1, reverbDecay: 4.0, brightness: 0.3, tremolo: 0, noteGap: 0.28 },
  contemplative: { pitchOffset: 0, reverbDecay: 3.0, brightness: 0.5, tremolo: 0, noteGap: 0.24 },
  rhythmic: { pitchOffset: 0, reverbDecay: 2.0, brightness: 0.8, tremolo: 0, noteGap: 0.18 },
  melancholic: { pitchOffset: -0.5, reverbDecay: 3.5, brightness: 0.4, tremolo: 0.3, noteGap: 0.26 },
};

// Chord progressions per mood (scale degrees, 0-indexed)
const CHORD_PROGRESSIONS = {
  ambient:       [[0, 4], [3, 6], [4, 1], [2, 5]],       // sparse open voicings
  contemplative: [[0, 2, 4], [3, 5, 0], [4, 6, 1]],      // triads
  rhythmic:      [[0, 2, 4, 6], [3, 5, 0, 2], [4, 6, 1, 3], [5, 0, 2, 4]], // fuller
  melancholic:   [[0, 2, 4], [5, 0, 3], [3, 5, 1], [4, 6, 2]],  // minor feel
};

export class MusicEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.droneGain = null;
    this.drones = [];
    this.enabled = false;
    this.initialized = false;
    this.currentScale = "aeolian";
    this.mood = "ambient";
    this.generationCount = 0;
    this.reverbNode = null;
    this.pitchShift = 1.0;

    // Living drone state
    this._lfoPhases = [];    // independent LFO phases for each harmonic
    this._lfoRates = [];     // Hz rates for each harmonic's LFO
    this._detunePhases = []; // detuning LFO phases
    this._detuneRates = [];  // detuning rates

    // Chord progression state
    this._chordIndex = 0;
    this._chordTimer = 0;
    this._chordInterval = 45000; // 45s between chord changes
    this._targetHarmonics = null;

    // Formant sweep
    this._formantPhase = 0;
    this._formantRate = 0.00004; // very slow sweep

    // Ambient texture
    this._noiseSource = null;
    this._noiseFilter = null;
    this._noiseGain = null;

    // Mood transition
    this._moodParams = { ...MOOD_PARAMS.ambient };
    this._targetMoodParams = null;

    // Update timer
    this._updateTimer = 0;
  }

  init() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.initialized = true;

    // Master output
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;

    // Create reverb
    this.reverbNode = this._createReverb(this._moodParams.reverbDecay);
    this._reverbGain = this.ctx.createGain();
    this._reverbGain.gain.value = 0.3;
    this.master.connect(this._reverbGain);
    this._reverbGain.connect(this.reverbNode);
    this.reverbNode.connect(this.ctx.destination);

    // Dry path
    this._dryGain = this.ctx.createGain();
    this._dryGain.gain.value = 0.7;
    this.master.connect(this._dryGain);
    this._dryGain.connect(this.ctx.destination);

    // Start with fundamental drone
    this._addDrone(BASE_FREQ, 0.08);

    // Start ambient noise texture
    this._startAmbientTexture();
  }

  _createReverb(decay) {
    const length = this.ctx.sampleRate * (decay ?? 2.5);
    const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
      }
    }
    const convolver = this.ctx.createConvolver();
    convolver.buffer = impulse;
    return convolver;
  }

  _addDrone(freq, volume) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq * this.pitchShift;

    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();

    // Initialize independent LFO for this harmonic
    const idx = this.drones.length;
    this._lfoPhases[idx] = Math.random() * Math.PI * 2;
    this._lfoRates[idx] = 0.02 + Math.random() * 0.06; // 0.02-0.08 Hz
    this._detunePhases[idx] = Math.random() * Math.PI * 2;
    this._detuneRates[idx] = 0.01 + Math.random() * 0.03; // slower

    this.drones.push({ osc, gain, baseFreq: freq, baseVolume: volume });
    return { osc, gain };
  }

  _startAmbientTexture() {
    if (!this.ctx) return;
    // Pink-ish noise through a resonant bandpass = filtered air
    const bufferSize = this.ctx.sampleRate * 4;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    // Approximate pink noise with simple 1/f filter
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    this._noiseSource = this.ctx.createBufferSource();
    this._noiseSource.buffer = noiseBuffer;
    this._noiseSource.loop = true;

    this._noiseFilter = this.ctx.createBiquadFilter();
    this._noiseFilter.type = "bandpass";
    this._noiseFilter.frequency.value = BASE_FREQ;
    this._noiseFilter.Q.value = 2.0;

    this._noiseGain = this.ctx.createGain();
    this._noiseGain.gain.value = 0.012; // very quiet

    this._noiseSource.connect(this._noiseFilter);
    this._noiseFilter.connect(this._noiseGain);
    this._noiseGain.connect(this.master);
    this._noiseSource.start();
  }

  setScale(scaleName) {
    this.currentScale = scaleName;
  }

  setMood(mood) {
    if (this.mood === mood) return;
    this.mood = mood;
    this._targetMoodParams = { ...(MOOD_PARAMS[mood] ?? MOOD_PARAMS.ambient) };
  }

  /* Called each frame from the organism to drive LFOs and transitions */
  update(dt) {
    if (!this.ctx || !this.enabled) return;

    this._updateTimer += dt;
    // Throttle updates to ~30fps for audio modulation (every ~33ms)
    if (this._updateTimer < 33) return;
    const elapsed = this._updateTimer;
    this._updateTimer = 0;

    const t = this.ctx.currentTime;
    const dtSec = elapsed * 0.001;

    // ── Mood parameter interpolation ──
    if (this._targetMoodParams) {
      const mp = this._moodParams;
      const tp = this._targetMoodParams;
      const rate = 0.02; // slow blend
      let settled = true;
      for (const key of Object.keys(tp)) {
        const diff = tp[key] - mp[key];
        if (Math.abs(diff) > 0.001) {
          mp[key] += diff * rate;
          settled = false;
        } else {
          mp[key] = tp[key];
        }
      }
      if (settled) this._targetMoodParams = null;

      // Apply pitch offset
      const pitchMod = Math.pow(2, mp.pitchOffset / 12);
      for (const d of this.drones) {
        d.osc.frequency.setTargetAtTime(
          d.baseFreq * this.pitchShift * pitchMod,
          t, 0.5
        );
      }

      // Update ambient noise filter to track root
      if (this._noiseFilter) {
        this._noiseFilter.frequency.setTargetAtTime(
          BASE_FREQ * pitchMod,
          t, 0.3
        );
      }
    }

    // ── Living drone — amplitude LFOs (breathing timbre) ──
    this._formantPhase += dtSec * this._formantRate;
    const formantBrightness = this._moodParams.brightness +
      Math.sin(this._formantPhase * Math.PI * 2) * 0.2;

    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];

      // Amplitude LFO — each harmonic breathes independently
      this._lfoPhases[i] += dtSec * this._lfoRates[i] * Math.PI * 2;
      const lfoAmp = Math.sin(this._lfoPhases[i]) * 0.35; // ±35% modulation

      // Formant-based brightness: higher harmonics get more energy when bright
      const harmonicIndex = i / Math.max(1, this.drones.length - 1); // 0..1
      const formantWeight = formantBrightness * (1 - harmonicIndex) +
        (1 - formantBrightness) * harmonicIndex;
      const brightnessMod = 0.5 + formantWeight * 0.5;

      // Tremolo from mood
      const tremoloMod = this._moodParams.tremolo > 0 ?
        1 - this._moodParams.tremolo * 0.3 * (Math.sin(t * 4 + i) * 0.5 + 0.5) : 1;

      const targetVol = d.baseVolume * (1 + lfoAmp) * brightnessMod * tremoloMod;
      d.gain.gain.setTargetAtTime(Math.max(0, targetVol), t, 0.15);

      // Detuning drift — subtle chorusing
      this._detunePhases[i] += dtSec * this._detuneRates[i] * Math.PI * 2;
      const detuneCents = Math.sin(this._detunePhases[i]) * 4; // ±4 cents
      const pitchMod = Math.pow(2, (this._moodParams.pitchOffset + detuneCents / 100) / 12);
      d.osc.frequency.setTargetAtTime(
        d.baseFreq * this.pitchShift * pitchMod,
        t, 0.3
      );
    }

    // ── Ambient noise breathing ──
    if (this._noiseGain) {
      const noiseLfo = Math.sin(this._formantPhase * Math.PI * 1.3) * 0.5 + 0.5;
      this._noiseGain.gain.setTargetAtTime(
        0.008 + noiseLfo * 0.008,
        t, 0.5
      );
    }

    // ── Chord progression ──
    this._chordTimer += elapsed;
    if (this._chordTimer > this._chordInterval) {
      this._chordTimer = 0;
      this._advanceChord();
    }
  }

  _advanceChord() {
    const progression = CHORD_PROGRESSIONS[this.mood] ?? CHORD_PROGRESSIONS.ambient;
    this._chordIndex = (this._chordIndex + 1) % progression.length;
    const chord = progression[this._chordIndex];
    const scale = SCALES[this.currentScale] ?? SCALES.aeolian;

    // Morph drone frequencies toward chord tones
    const t = this.ctx.currentTime;
    for (let i = 0; i < this.drones.length && i < chord.length; i++) {
      const degree = chord[i];
      const semitone = scale[degree % scale.length] ?? 0;
      const octave = Math.floor(degree / scale.length);
      const newFreq = BASE_FREQ * Math.pow(2, (semitone + octave * 12) / 12);
      this.drones[i].baseFreq = newFreq;
      this.drones[i].osc.frequency.linearRampToValueAtTime(
        newFreq * this.pitchShift,
        t + 8 // slow 8s crossfade to new chord
      );
    }
  }

  /* Called when particles bloom to a new generation */
  onGeneration(gen) {
    if (!this.ctx || !this.enabled) return;
    this.generationCount = gen;

    if (gen <= 5 && this.drones.length < gen + 1) {
      const harmonics = [1, 1.5, 2, 2.5, 3];
      const volumes = [0.08, 0.05, 0.04, 0.025, 0.02];
      if (gen < harmonics.length) {
        this._addDrone(BASE_FREQ * harmonics[gen], volumes[gen]);
      }
    }
  }

  /* Modulate drones based on cursor position */
  modulate(nx, ny) {
    if (!this.ctx || !this.enabled || this.drones.length === 0) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
      const detune = (nx - 0.5) * 20 + (ny - 0.5) * 10 * (i + 1);
      d.osc.frequency.linearRampToValueAtTime(
        (d.baseFreq + detune) * this.pitchShift,
        t + 0.15
      );
    }
  }

  /* Shift pitch for pinch gesture */
  setPitchShift(factor) {
    this.pitchShift = Math.max(0.5, Math.min(2.0, factor));
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    for (const d of this.drones) {
      d.osc.frequency.linearRampToValueAtTime(
        d.baseFreq * this.pitchShift,
        t + 0.1
      );
    }
  }

  /* Karplus-Strong plucked string with dynamic variation */
  pluck(semitones, duration = 1.5, velocity = 1.0) {
    if (!this.ctx || !this.enabled) return;
    const freq = midiToFreq(semitones) * this.pitchShift;
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = Math.round(sampleRate / freq);

    // Velocity and duration variation
    const varDuration = duration * (0.8 + Math.random() * 0.4); // ±20%
    const totalSamples = Math.round(sampleRate * varDuration);

    const buffer = this.ctx.createBuffer(1, totalSamples, sampleRate);
    const data = buffer.getChannelData(0);

    // Mood-dependent brightness: filter the initial noise
    const brightness = this._moodParams.brightness;
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    // Low-pass the excitation for darker tones
    if (brightness < 0.6) {
      for (let i = 1; i < bufferSize; i++) {
        data[i] = data[i] * brightness + data[i - 1] * (1 - brightness);
      }
    }

    for (let i = bufferSize; i < totalSamples; i++) {
      data[i] = (data[i - bufferSize] + data[i - bufferSize + 1]) * 0.498;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    const vol = 0.15 * velocity * (0.75 + Math.random() * 0.5); // ±30% velocity variation
    gain.gain.value = vol;
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + varDuration);
    source.connect(gain);
    gain.connect(this.master);
    source.start();
    source.stop(this.ctx.currentTime + varDuration);
  }

  /* Play a memory's melodic signature with dynamic variation and harmony */
  playMelody(semitoneArray) {
    if (!this.ctx || !this.enabled) return;
    const scale = SCALES[this.currentScale] || SCALES.aeolian;
    const noteGap = this._moodParams.noteGap;
    const speed = this._moodParams.brightness > 0.6 ? 0.85 : 1.15; // faster in bright moods

    semitoneArray.forEach((semi, i) => {
      const scaleNote = scale[semi % scale.length];
      const octave = Math.floor(semi / scale.length);
      const finalSemitone = scaleNote + octave * 12;

      const delay = i * noteGap * speed * 1000;
      // Small random timing variation for organic feel
      const jitter = (Math.random() - 0.5) * 30; // ±15ms

      setTimeout(() => {
        this.pluck(finalSemitone, 2.0, 1.0);

        // Harmony: sometimes add a 3rd or 5th above at lower volume
        // Probability increases with more notes played
        const harmonyChance = 0.2 + (i / semitoneArray.length) * 0.3;
        if (Math.random() < harmonyChance) {
          const interval = Math.random() < 0.6 ? 4 : 7; // major 3rd or perfect 5th
          const harmonySemitone = finalSemitone + interval;
          setTimeout(() => {
            this.pluck(harmonySemitone, 1.8, 0.4); // quieter harmony
          }, 20 + Math.random() * 40);
        }
      }, delay + jitter);
    });
  }

  enable() {
    if (!this.initialized) this.init();
    if (this.ctx.state === "suspended") this.ctx.resume();
    this.enabled = true;
    this.master.gain.linearRampToValueAtTime(1.0, this.ctx.currentTime + 0.5);
  }

  disable() {
    if (!this.ctx) return;
    this.enabled = false;
    this.master.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
  }

  toggle() {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
    return this.enabled;
  }

  destroy() {
    if (!this.ctx) return;
    this.drones.forEach((d) => {
      try { d.osc.stop(); } catch (e) { /* already stopped */ }
    });
    this.drones = [];
    if (this._noiseSource) {
      try { this._noiseSource.stop(); } catch (e) { /* */ }
    }
    this.ctx.close();
    this.ctx = null;
    this.initialized = false;
  }
}
