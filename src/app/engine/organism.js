"use client";

import { ParticlePool } from "./particles.js";
import { MemorySystem, MEMORIES, textToPositions, stringToMelody } from "./memory.js";
import { createInputHandler } from "./input.js";
import { getCircadianProfile } from "./circadian.js";
import { MusicEngine } from "./music.js";

/*
 * The Organism — core simulation that unifies particles, music, and content.
 * A single living entity that breathes, responds, and reveals.
 */

const GOLDEN_ANGLE = 137.508 * (Math.PI / 180);
const TWO_PI = Math.PI * 2;

export class Organism {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.pool = new ParticlePool(500);
    this.memory = new MemorySystem();
    this.music = new MusicEngine();
    this.input = createInputHandler(canvas);
    this.profile = getCircadianProfile();

    this.time = 0;
    this.dt = 16;
    this.generation = 0;
    this.maxGeneration = 5;
    this.bloomTimer = 0;
    this.bloomInterval = 600; // ms between bloom waves
    this.breathPhase = 0;
    this.centerX = canvas.width / 2;
    this.centerY = canvas.height / 2;
    this.organismRadius = Math.min(canvas.width, canvas.height) * 0.25;
    this.running = false;
    this.lastFrame = 0;
    this.rafId = null;

    this.discoveredOverlay = null; // currently displayed memory info
    this.overlayFade = 0;
    this.textFormationTargets = [];
    this.textFormationActive = false;

    // Circadian refresh timer
    this.circadianTimer = 0;

    this._resize = this._onResize.bind(this);
    window.addEventListener("resize", this._resize, { passive: true });
    this._onResize();
  }

  _onResize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.centerX = w / 2;
    this.centerY = h / 2;
    this.organismRadius = Math.min(w, h) * 0.25;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastFrame = performance.now();

    // Spawn initial seed particle
    this._spawnSeed();

    // Place memory particles
    this._placeMemories();

    this.music.setScale(this.profile.scale);
    this.music.setMood(this.profile.musicMood);

    this.rafId = requestAnimationFrame(this._loop.bind(this));
  }

  _spawnSeed() {
    // The first particle — the organism's origin
    this.pool.add(this.centerX, this.centerY, {
      generation: 0,
      radius: 3,
      hue: this.profile.primary.h,
      saturation: this.profile.primary.s,
      lightness: this.profile.primary.l,
      alpha: 1.0,
      maxTrail: this.profile.trailLength,
    });
  }

  _placeMemories() {
    // Distribute memory particles in a spiral around center
    const count = MEMORIES.length;
    for (let i = 0; i < count; i++) {
      const angle = i * GOLDEN_ANGLE;
      const r = this.organismRadius * 0.3 + (i / count) * this.organismRadius * 0.7;
      const x = this.centerX + Math.cos(angle) * r;
      const y = this.centerY + Math.sin(angle) * r;

      const mem = MEMORIES[i];
      const hue = mem.type === "identity" ? 0 : // warm for identity
                  mem.type === "root" ? this.profile.accent.h :
                  this.profile.primary.h;
      const sat = mem.type === "identity" ? 65 : this.profile.primary.s;
      const light = mem.type === "root" ? 85 : mem.type === "identity" ? 60 : this.profile.primary.l;

      const p = this.pool.add(x, y, {
        generation: 0,
        radius: mem.type === "root" ? 5 : 3.5,
        mass: 3,
        hue,
        saturation: sat,
        lightness: light,
        alpha: 0.95,
        maxTrail: 3,
      });
      if (p) {
        this.memory.assignParticle(mem.id, p);
      }
    }
  }

  _loop(ts) {
    if (!this.running) return;
    this.dt = Math.min(ts - this.lastFrame, 50); // cap at 50ms
    this.lastFrame = ts;
    this.time += this.dt;

    this._update();
    this._draw();

    this.rafId = requestAnimationFrame(this._loop.bind(this));
  }

  _update() {
    const dt = this.dt;
    this.breathPhase += dt * 0.001 * this.profile.breathRate;
    this.input.update(0.1);

    // Refresh circadian every 60s
    this.circadianTimer += dt;
    if (this.circadianTimer > 60000) {
      this.circadianTimer = 0;
      this.profile = getCircadianProfile();
      this.music.setScale(this.profile.scale);
      this.music.setMood(this.profile.musicMood);
    }

    // Bloom — spawn new particles on user interaction
    if (this.input.state.active && this.generation < this.maxGeneration) {
      this.bloomTimer += dt;
      if (this.bloomTimer > this.bloomInterval && this.pool.count < 350) {
        this.bloomTimer = 0;
        this._bloom();
      }
    }

    // Physics
    const particles = this.pool.particles;
    const cx = this.centerX;
    const cy = this.centerY;
    const breath = Math.sin(this.breathPhase) * 0.3;
    const cohesionStrength = 0.0003;
    const separationDist = 18;
    const damping = 0.97;
    const speed = this.profile.particleSpeed;

    this.pool.rebuild();

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Breathing — expand/contract toward center
      const dx = cx - p.x;
      const dy = cy - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      // Cohesion: gentle pull toward center
      p.addForce(dx * cohesionStrength * speed, dy * cohesionStrength * speed);

      // Breathing oscillation
      const breathForce = breath * 0.02;
      p.addForce(-dx / dist * breathForce, -dy / dist * breathForce);

      // Separation from neighbors
      const neighbors = this.pool.query(p.x, p.y, separationDist);
      for (let j = 0; j < neighbors.length; j++) {
        const n = neighbors[j];
        if (n.id === p.id) continue;
        const ndx = p.x - n.x;
        const ndy = p.y - n.y;
        const nd = Math.sqrt(ndx * ndx + ndy * ndy) || 1;
        if (nd < separationDist) {
          const force = ((separationDist - nd) / separationDist) * 0.05 * speed;
          p.addForce(ndx / nd * force, ndy / nd * force);
        }
      }

      // Cursor attraction (non-memory particles)
      if (this.input.state.active && !p.isMemory) {
        const mx = this.input.state.px;
        const my = this.input.state.py;
        const cdx = mx - p.x;
        const cdy = my - p.y;
        const cdist = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
        if (cdist < 200) {
          const attract = 0.0008 * speed * (1 - cdist / 200);
          p.addForce(cdx * attract, cdy * attract);
        }
      }

      // Text formation targets
      if (p.targetX !== null && p.targetForce > 0) {
        const tx = p.targetX - p.x;
        const ty = p.targetY - p.y;
        p.addForce(tx * p.targetForce, ty * p.targetForce);
      }

      // Verlet integration
      p.verletStep(dt, damping);

      // Update trail
      p.updateTrail();

      // Decay
      if (p.decay > 0) {
        p.life -= p.decay * dt * 0.001;
      }
    }

    // Remove dead particles
    for (let i = particles.length - 1; i >= 0; i--) {
      if (particles[i].life <= 0) {
        this.pool.remove(particles[i]);
      }
    }

    // Memory dwell detection
    if (this.input.state.active) {
      const hoveredMemory = this.memory.checkDwell(
        this.input.state.px,
        this.input.state.py,
        dt
      );

      if (hoveredMemory) {
        this.music.modulate(
          this.input.state.px / window.innerWidth,
          this.input.state.py / window.innerHeight
        );
      }
    }

    // Memory system update
    this.memory.update(dt);

    // Handle newly discovered content
    if (this.memory.activeNode && this.memory.nodes.get(this.memory.activeNode).discovered) {
      const node = this.memory.nodes.get(this.memory.activeNode);
      if (!node.musicPlayed) {
        node.musicPlayed = true;
        const melody = stringToMelody(node.label);
        this.music.playMelody(melody);
        this.discoveredOverlay = node;
        this.overlayFade = 1.0;

        // Text formation for this node's label
        this._formText(node.label);
      }
    }

    // Fade overlay
    if (this.overlayFade > 0) {
      this.overlayFade -= dt * 0.0003;
      if (this.overlayFade < 0) {
        this.overlayFade = 0;
        this._releaseText();
      }
    }
  }

  _bloom() {
    this.generation++;
    this.music.onGeneration(this.generation);

    const count = 15 + Math.floor(Math.random() * 10);
    const mx = this.input.state.px;
    const my = this.input.state.py;

    for (let i = 0; i < count; i++) {
      const angle = i * GOLDEN_ANGLE + this.generation * 0.5;
      const r = 10 + Math.random() * 30;
      const x = mx + Math.cos(angle) * r;
      const y = my + Math.sin(angle) * r;

      // Color mutation per generation
      const hueShift = this.generation * 8;
      const h = (this.profile.primary.h + hueShift + Math.random() * 10) % 360;

      this.pool.add(x, y, {
        generation: this.generation,
        radius: 1.5 + Math.random() * 1.5,
        hue: h,
        saturation: this.profile.primary.s - this.generation * 3,
        lightness: this.profile.primary.l + Math.random() * 10,
        alpha: 0.7 - this.generation * 0.08,
        decay: 0.02 + this.generation * 0.005,
        maxTrail: this.profile.trailLength,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
      });
    }
  }

  _formText(text) {
    const fontSize = Math.min(48, window.innerWidth / text.length * 0.8);
    const width = text.length * fontSize;
    const height = fontSize * 2;
    const positions = textToPositions(text, fontSize, width, height);

    // Offset to center
    const offsetX = this.centerX - width / 2;
    const offsetY = this.centerY - height / 2 - 80;

    // Assign nearest non-memory particles to text positions
    const available = this.pool.particles.filter(p => !p.isMemory && p.targetX === null);
    const usable = Math.min(available.length, positions.length);

    this.textFormationActive = true;
    this.textFormationTargets = [];

    for (let i = 0; i < usable; i++) {
      const p = available[i];
      p.targetX = positions[i].x + offsetX;
      p.targetY = positions[i].y + offsetY;
      p.targetForce = 0.03;
      this.textFormationTargets.push(p);
    }
  }

  _releaseText() {
    this.textFormationActive = false;
    for (const p of this.textFormationTargets) {
      p.targetX = null;
      p.targetY = null;
      p.targetForce = 0;
    }
    this.textFormationTargets = [];
  }

  _draw() {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Clear with subtle fade (creates trail effect)
    const [br, bg, bb] = this.profile.bg;
    ctx.fillStyle = `rgba(${br}, ${bg}, ${bb}, 0.15)`;
    ctx.fillRect(0, 0, w, h);

    // Ambient center glow
    const glowR = this.organismRadius * 1.5;
    const glow = ctx.createRadialGradient(this.centerX, this.centerY, 0, this.centerX, this.centerY, glowR);
    const gi = this.profile.glowIntensity * 0.04;
    const ph = this.profile.primary.h;
    glow.addColorStop(0, `hsla(${ph}, 70%, 50%, ${gi})`);
    glow.addColorStop(0.5, `hsla(${ph}, 60%, 40%, ${gi * 0.4})`);
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(this.centerX - glowR, this.centerY - glowR, glowR * 2, glowR * 2);

    // Draw connection trails
    for (const trail of this.memory.connectionTrails) {
      const fromNode = this.memory.nodes.get(trail.from);
      const toNode = this.memory.nodes.get(trail.to);
      if (!fromNode?.particle || !toNode?.particle) continue;

      const progress = trail.age / trail.maxAge;
      const alpha = 1 - progress;

      ctx.beginPath();
      ctx.moveTo(fromNode.particle.x, fromNode.particle.y);
      ctx.lineTo(toNode.particle.x, toNode.particle.y);
      ctx.strokeStyle = `hsla(${this.profile.accent.h}, 80%, 60%, ${alpha * 0.3})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Flowing particles along connection
      const streamCount = 5;
      for (let i = 0; i < streamCount; i++) {
        const t = ((progress * 3 + i / streamCount) % 1);
        const sx = fromNode.particle.x + (toNode.particle.x - fromNode.particle.x) * t;
        const sy = fromNode.particle.y + (toNode.particle.y - fromNode.particle.y) * t;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, TWO_PI);
        ctx.fillStyle = `hsla(${this.profile.accent.h}, 90%, 70%, ${alpha * 0.6})`;
        ctx.fill();
      }
    }

    // Draw particles
    const particles = this.pool.particles;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Trail
      if (p.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(p.trail[0].x, p.trail[0].y);
        for (let t = 1; t < p.trail.length; t++) {
          ctx.lineTo(p.trail[t].x, p.trail[t].y);
        }
        ctx.strokeStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${p.alpha * p.life * 0.15})`;
        ctx.lineWidth = p.radius * 0.5;
        ctx.stroke();
      }

      // Glow
      const glowSize = p.radius * (p.isMemory ? 6 : 3);
      const particleGlow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
      particleGlow.addColorStop(0, `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${p.alpha * p.life * 0.4})`);
      particleGlow.addColorStop(1, "transparent");
      ctx.fillStyle = particleGlow;
      ctx.fillRect(p.x - glowSize, p.y - glowSize, glowSize * 2, glowSize * 2);

      // Core
      const breathScale = p.isMemory ? 1 + Math.sin(p.breathPhase + this.breathPhase * 3) * 0.15 : 1;
      const r = p.radius * breathScale;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, TWO_PI);
      ctx.fillStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness + 15}%, ${p.alpha * p.life})`;
      ctx.fill();

      // Memory indicator — subtle ring
      if (p.isMemory) {
        const node = this.memory.nodes.get(p.memoryId);
        const ringAlpha = node?.discovered ? 0.6 : 0.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.5, 0, TWO_PI);
        ctx.strokeStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${ringAlpha})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Label for memory particles when discovered or hovered
      if (p.isMemory && p.memoryId) {
        const node = this.memory.nodes.get(p.memoryId);
        if (node && (node.discovered || this.memory.dwellTarget === p.memoryId)) {
          const labelAlpha = node.discovered ? 0.8 : Math.min(this.memory.dwellTime / 800, 1) * 0.5;
          ctx.font = `${p.memoryId === "root" ? 14 : 11}px "Space Grotesk", sans-serif`;
          ctx.textAlign = "center";
          ctx.fillStyle = `hsla(0, 0%, 92%, ${labelAlpha})`;
          ctx.fillText(node.label, p.x, p.y - p.radius * 3 - 4);

          // Show description if discovered
          if (node.discovered && node.desc) {
            ctx.font = `10px "Space Grotesk", sans-serif`;
            ctx.fillStyle = `hsla(0, 0%, 70%, ${labelAlpha * 0.7})`;
            ctx.fillText(node.desc, p.x, p.y - p.radius * 3 + 12);
          }

          // Show URL if discovered
          if (node.discovered && node.url) {
            ctx.font = `9px "IBM Plex Mono", monospace`;
            ctx.fillStyle = `hsla(${this.profile.primary.h}, 70%, 60%, ${labelAlpha * 0.6})`;
            const displayUrl = node.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
            ctx.fillText(displayUrl, p.x, p.y - p.radius * 3 + 26);
          }
        }
      }
    }

    // Discovered content overlay (bottom of screen)
    if (this.discoveredOverlay && this.overlayFade > 0) {
      const node = this.discoveredOverlay;
      const oy = h - 60;
      ctx.globalAlpha = this.overlayFade;
      ctx.font = `bold 16px "Space Grotesk", sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = `hsl(${this.profile.primary.h}, 70%, 70%)`;
      ctx.fillText(node.label, w / 2, oy);
      if (node.desc) {
        ctx.font = `12px "Space Grotesk", sans-serif`;
        ctx.fillStyle = `hsl(0, 0%, 70%)`;
        ctx.fillText(node.desc, w / 2, oy + 22);
      }
      ctx.globalAlpha = 1;
    }
  }

  enableAudio() {
    this.music.enable();
  }

  toggleAudio() {
    return this.music.toggle();
  }

  get audioEnabled() {
    return this.music.enabled;
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  destroy() {
    this.stop();
    this.input.destroy();
    this.music.destroy();
    window.removeEventListener("resize", this._resize);
  }
}
