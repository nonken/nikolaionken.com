"use client";

import { SCALES } from "./circadian.js";

/*
 * Generative music engine.
 * - Additive synthesis: harmonic drone that builds with particle generations
 * - Karplus-Strong: plucked strings when connections form
 * - All procedural, no samples.
 */

const BASE_FREQ = 110; // A2

function midiToFreq(semitones) {
  return BASE_FREQ * Math.pow(2, semitones / 12);
}

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
  }

  init() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.initialized = true;

    // Master output
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;

    // Create reverb
    this.reverbNode = this._createReverb();
    const reverbGain = this.ctx.createGain();
    reverbGain.gain.value = 0.3;
    this.master.connect(reverbGain);
    reverbGain.connect(this.reverbNode);
    this.reverbNode.connect(this.ctx.destination);

    // Dry path
    const dryGain = this.ctx.createGain();
    dryGain.gain.value = 0.7;
    this.master.connect(dryGain);
    dryGain.connect(this.ctx.destination);

    // Start with fundamental drone
    this._addDrone(BASE_FREQ, 0.08);
  }

  _createReverb() {
    // Procedurally generated impulse response
    const length = this.ctx.sampleRate * 2.5;
    const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        // Exponential decay with slight randomization
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
    osc.frequency.value = freq;

    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();

    this.drones.push({ osc, gain, baseFreq: freq });
    return { osc, gain };
  }

  setScale(scaleName) {
    this.currentScale = scaleName;
  }

  setMood(mood) {
    this.mood = mood;
  }

  /* Called when particles bloom to a new generation */
  onGeneration(gen) {
    if (!this.ctx || !this.enabled) return;
    this.generationCount = gen;

    // Add harmonic layers as generations increase
    if (gen <= 5 && this.drones.length < gen + 1) {
      const harmonics = [1, 1.5, 2, 2.5, 3]; // fundamental, fifth, octave, etc
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
    // Subtle frequency modulation based on position
    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
      const detune = (nx - 0.5) * 20 + (ny - 0.5) * 10 * (i + 1);
      d.osc.frequency.linearRampToValueAtTime(
        d.baseFreq + detune,
        t + 0.15
      );
    }
  }

  /* Karplus-Strong plucked string for connection discovery */
  pluck(semitones, duration = 1.5) {
    if (!this.ctx || !this.enabled) return;
    const freq = midiToFreq(semitones);
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = Math.round(sampleRate / freq);
    const totalSamples = Math.round(sampleRate * duration);

    const buffer = this.ctx.createBuffer(1, totalSamples, sampleRate);
    const data = buffer.getChannelData(0);

    // Initialize with noise burst
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // Karplus-Strong: average adjacent samples with decay
    for (let i = bufferSize; i < totalSamples; i++) {
      data[i] = (data[i - bufferSize] + data[i - bufferSize + 1]) * 0.498;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.15;
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(this.master);
    source.start();
    source.stop(this.ctx.currentTime + duration);
  }

  /* Play a memory's melodic signature */
  playMelody(semitoneArray) {
    if (!this.ctx || !this.enabled) return;
    const scale = SCALES[this.currentScale] || SCALES.aeolian;
    const noteDelay = 0.2;

    semitoneArray.forEach((semi, i) => {
      // Map to current scale
      const scaleNote = scale[semi % scale.length];
      const octave = Math.floor(semi / scale.length);
      const finalSemitone = scaleNote + octave * 12;

      setTimeout(() => {
        this.pluck(finalSemitone, 2.0);
      }, i * noteDelay * 1000);
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
    this.ctx.close();
    this.ctx = null;
    this.initialized = false;
  }
}
