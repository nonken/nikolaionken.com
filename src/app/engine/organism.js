"use client";

import { ParticlePool, getGlowSprite } from "./particles.js";
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
    this.bloomInterval = 600;
    this.breathPhase = 0;
    this.centerX = canvas.width / 2;
    this.centerY = canvas.height / 2;
    this.organismRadius = Math.min(canvas.width, canvas.height) * 0.25;
    this.baseOrganismRadius = this.organismRadius;
    this.running = false;
    this.lastFrame = 0;
    this.rafId = null;

    this.discoveredOverlay = null;
    this.overlayFade = 0;
    this.textFormationTargets = [];
    this.textFormationActive = false;
    this.textReleaseTimer = 0; // for graceful text release
    this.firstFrame = true;

    // Birth animation state
    this.birthPhase = "seed"; // seed | blooming | alive
    this.birthTimer = 0;
    this.birthIndex = 0; // next memory to birth
    this.memoriesPlaced = false;
    // Particles with pending target release (timestamp-based, no setTimeout)
    this.birthTargetReleases = []; // { particle, releaseAt }

    // Idle respiration state
    this.idleTimer = 0;
    this.idlePulseTimer = 0;
    this.isIdle = false;

    // Cached memory particle list (only changes during birth phase)
    this._memoryParticles = [];

    // Adaptive quality — circular buffer avoids O(n) shift
    this._ftSamples = new Float64Array(60);
    this._ftIndex = 0;
    this._ftCount = 0;
    this.qualityLevel = 1.0; // 1.0 = full, 0.75 = reduced
    this.useGlowSprites = true;

    // Cursor glow trail
    this.cursorTrail = [];
    this.maxCursorTrail = 12;

    // Keyboard navigation
    this.focusedMemoryIndex = -1;
    this.memoryIds = MEMORIES.map(m => m.id);
    this._boundKeyDown = this._handleKeyboard.bind(this);
    window.addEventListener("keydown", this._boundKeyDown);

    // Circadian refresh timer
    this.circadianTimer = 0;

    // Touch burst callback
    this.input.state.onTouchBurst = (x, y) => this._touchBurst(x, y);

    this._boundResize = this._onResize.bind(this);
    window.addEventListener("resize", this._boundResize, { passive: true });
    this._onResize();

    // Pre-render glow sprite
    this._glowSprite = null;

    // Bind loop once (avoid creating new function every frame)
    this._boundLoop = this._loop.bind(this);
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
    this.baseOrganismRadius = Math.min(w, h) * 0.25;
    this.organismRadius = this.baseOrganismRadius;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastFrame = performance.now();

    // Only spawn seed particle — memories birth later via animation
    this._spawnSeed();

    this.music.setScale(this.profile.scale);
    this.music.setMood(this.profile.musicMood);

    // Initialize glow sprite
    this._glowSprite = getGlowSprite(16);

    this.rafId = requestAnimationFrame(this._boundLoop);
  }

  _spawnSeed() {
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

  _birthNextMemory() {
    if (this.birthIndex >= MEMORIES.length) {
      this.birthPhase = "alive";
      this.memoriesPlaced = true;
      return;
    }

    const i = this.birthIndex;
    const count = MEMORIES.length;
    const angle = i * GOLDEN_ANGLE;
    const r = this.organismRadius * 0.3 + (i / count) * this.organismRadius * 0.7;
    // Birth from center, target position on spiral
    const targetX = this.centerX + Math.cos(angle) * r;
    const targetY = this.centerY + Math.sin(angle) * r;

    const mem = MEMORIES[i];
    const hue = mem.type === "identity" ? 0 :
                mem.type === "root" ? this.profile.accent.h :
                this.profile.primary.h;
    const sat = mem.type === "identity" ? 65 : this.profile.primary.s;
    const light = mem.type === "root" ? 85 : mem.type === "identity" ? 60 : this.profile.primary.l;

    // Spawn at center, will drift to target
    const p = this.pool.add(this.centerX, this.centerY, {
      generation: 0,
      radius: mem.type === "root" ? 5 : 3.5,
      mass: 3,
      hue,
      saturation: sat,
      lightness: light,
      alpha: 0.95,
      maxTrail: 3,
      // Small initial velocity toward target
      vx: (targetX - this.centerX) * 0.015,
      vy: (targetY - this.centerY) * 0.015,
    });
    if (p) {
      this.memory.assignParticle(mem.id, p);
      // Set temporary target to guide particle to spiral position
      p.targetX = targetX;
      p.targetY = targetY;
      p.targetForce = 0.008;
      // Schedule target release via update loop (no setTimeout — safe on destroy)
      this.birthTargetReleases.push({ particle: p, releaseAt: this.time + 2000 });
      // Cache memory particle reference
      this._memoryParticles.push(p);
    }

    this.birthIndex++;
  }

  _touchBurst(x, y) {
    // Spawn small burst of particles at touch point
    const count = 6;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * TWO_PI;
      const speed = 1 + Math.random() * 2;
      this.pool.add(x, y, {
        generation: this.generation,
        radius: 1 + Math.random(),
        hue: this.profile.primary.h,
        saturation: this.profile.primary.s,
        lightness: this.profile.primary.l + 10,
        alpha: 0.6,
        decay: 0.08,
        maxTrail: 4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      });
    }
  }

  _loop(ts) {
    if (!this.running) return;
    this.dt = Math.min(ts - this.lastFrame, 50);
    this.lastFrame = ts;
    this.time += this.dt;

    // Adaptive quality monitoring — circular buffer (O(1) per frame)
    this._ftSamples[this._ftIndex] = this.dt;
    this._ftIndex = (this._ftIndex + 1) % 60;
    if (this._ftCount < 60) this._ftCount++;
    if (this._ftCount === 60 && this.qualityLevel === 1.0) {
      let sum = 0;
      for (let i = 0; i < 60; i++) sum += this._ftSamples[i];
      if (sum / 60 > 25) { // <40fps
        this.qualityLevel = 0.75;
        this.pool.max = Math.floor(500 * 0.75);
        this.useGlowSprites = true;
      }
    }

    this._update();
    this._draw();

    this.rafId = requestAnimationFrame(this._boundLoop);
  }

  _update() {
    const dt = this.dt;
    this.breathPhase += dt * 0.001 * this.profile.breathRate;
    this.input.update(0.3);

    // Sync touch state to memory system
    this.memory.isTouch = this.input.state.isTouch;

    // Refresh circadian every 60s
    this.circadianTimer += dt;
    if (this.circadianTimer > 60000) {
      this.circadianTimer = 0;
      this.profile = getCircadianProfile();
      this.music.setScale(this.profile.scale);
      this.music.setMood(this.profile.musicMood);
    }

    // Process birth target releases (timestamp-based, replaces setTimeout)
    for (let i = this.birthTargetReleases.length - 1; i >= 0; i--) {
      const entry = this.birthTargetReleases[i];
      if (this.time >= entry.releaseAt) {
        entry.particle.targetX = null;
        entry.particle.targetY = null;
        entry.particle.targetForce = 0;
        this.birthTargetReleases.splice(i, 1);
      }
    }

    // Birth animation: stagger memory placement
    if (this.birthPhase === "seed") {
      this.birthTimer += dt;
      if (this.birthTimer > 800) { // wait 800ms then start birthing
        this.birthPhase = "blooming";
        this.birthTimer = 0;
      }
    } else if (this.birthPhase === "blooming") {
      this.birthTimer += dt;
      if (this.birthTimer > 80) { // birth one every 80ms = ~2.5s for all 20
        this.birthTimer = 0;
        this._birthNextMemory();
      }
    }

    // Bloom — spawn new particles on user interaction
    if (this.input.state.active && this.generation < this.maxGeneration) {
      this.bloomTimer += dt;
      if (this.bloomTimer > this.bloomInterval && this.pool.count < 350) {
        this.bloomTimer = 0;
        this._bloom();
      }
    }

    // Idle detection
    if (this.input.state.active) {
      this.idleTimer = 0;
      this.isIdle = false;
    } else {
      this.idleTimer += dt;
      if (this.idleTimer > 3000) {
        this.isIdle = true;
      }
    }

    // Idle respiration — emit ambient pulse particles
    if (this.isIdle && this.memoriesPlaced) {
      this.idlePulseTimer += dt;
      if (this.idlePulseTimer > 2000 && this.pool.count < 300) {
        this.idlePulseTimer = 0;
        // Pick a random memory particle to pulse from (cached list, no allocation)
        const memParticles = this._memoryParticles;
        if (memParticles.length > 0) {
          const mp = memParticles[Math.floor(Math.random() * memParticles.length)];
          const angle = Math.random() * TWO_PI;
          const speed = 0.3 + Math.random() * 0.5;
          this.pool.add(mp.x, mp.y, {
            generation: 1,
            radius: 1 + Math.random() * 0.5,
            hue: mp.hue,
            saturation: mp.saturation,
            lightness: mp.lightness + 10,
            alpha: 0.3,
            decay: 0.015,
            maxTrail: this.profile.trailLength,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
          });
        }
      }
    }

    // Swipe scatter
    if (this.input.state.isSwipe) {
      const particles = this.pool.particles;
      const svx = this.input.state.swipeVx * 0.3;
      const svy = this.input.state.swipeVy * 0.3;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!p.isMemory) {
          p.addForce(svx * (0.5 + Math.random() * 0.5), svy * (0.5 + Math.random() * 0.5));
        }
      }
      this.input.state.isSwipe = false;
    }

    // Pinch zoom
    if (this.input.state.isPinching && this.input.state.pinchDelta !== 0) {
      const delta = this.input.state.pinchDelta;
      this.organismRadius = Math.max(
        this.baseOrganismRadius * 0.5,
        Math.min(this.baseOrganismRadius * 2.0, this.organismRadius + delta * 0.5)
      );
      // Pitch shift based on radius ratio
      const ratio = this.organismRadius / this.baseOrganismRadius;
      this.music.setPitchShift(1.0 / ratio); // smaller = higher pitch
    }

    // Physics
    const particles = this.pool.particles;
    const cx = this.centerX;
    const cy = this.centerY;
    const breath = Math.sin(this.breathPhase) * (this.isIdle ? 0.5 : 0.3);
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

      // Breathing oscillation (stronger when idle)
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

      // Multi-touch membrane forces
      if (this.input.state.touches.length >= 2 && !p.isMemory) {
        const touches = this.input.state.touches;
        for (let t = 0; t < touches.length - 1; t++) {
          const t1 = touches[t];
          const t2 = touches[t + 1];
          // Attract particles to the line between touch points
          const lx = t2.x - t1.x;
          const ly = t2.y - t1.y;
          const len = Math.sqrt(lx * lx + ly * ly) || 1;
          // Project particle onto line
          const px = p.x - t1.x;
          const py = p.y - t1.y;
          const proj = Math.max(0, Math.min(1, (px * lx + py * ly) / (len * len)));
          const closestX = t1.x + lx * proj;
          const closestY = t1.y + ly * proj;
          const lineDist = Math.sqrt((p.x - closestX) ** 2 + (p.y - closestY) ** 2);
          if (lineDist < 150 && lineDist > 5) {
            const membraneForce = 0.002 * (1 - lineDist / 150);
            p.addForce((closestX - p.x) * membraneForce, (closestY - p.y) * membraneForce);
          }
        }
      }

      // Gyroscope gravity
      if (this.input.state.hasGyro) {
        const gx = this.input.state.gyro.x * 0.15 * speed;
        const gy = this.input.state.gyro.y * 0.15 * speed;
        p.addForce(gx, gy);
      }

      // Text formation targets (with graceful release)
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

        this._formText(node.label);

        if (this._onDiscoveryChange) this._onDiscoveryChange();
      }
    }

    // Graceful text release (fade targetForce over 500ms instead of snapping)
    if (this.overlayFade > 0) {
      this.overlayFade -= dt * 0.0003;
      if (this.overlayFade <= 0.3 && this.textFormationActive) {
        this._startGracefulRelease();
      }
      if (this.overlayFade < 0) {
        this.overlayFade = 0;
      }
    }

    // Decay text formation force during graceful release
    if (this.textReleaseTimer > 0) {
      this.textReleaseTimer -= dt;
      const releasePct = Math.max(0, this.textReleaseTimer / 500);
      for (const p of this.textFormationTargets) {
        p.targetForce = 0.03 * releasePct;
      }
      if (this.textReleaseTimer <= 0) {
        this._releaseText();
      }
    }

    // Update cursor trail
    if (this.input.state.active) {
      this.cursorTrail.unshift({ x: this.input.state.x, y: this.input.state.y });
      if (this.cursorTrail.length > this.maxCursorTrail) {
        this.cursorTrail.pop();
      }
    } else {
      // Fade out cursor trail when inactive
      if (this.cursorTrail.length > 0) {
        this.cursorTrail.pop();
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

    const offsetX = this.centerX - width / 2;
    const offsetY = this.centerY - height / 2 - 80;

    // Sort available particles by distance to text center for natural flow
    const textCenterX = this.centerX;
    const textCenterY = offsetY + height / 2;
    const available = this.pool.particles
      .filter(p => !p.isMemory && p.targetX === null)
      .sort((a, b) => {
        const da = (a.x - textCenterX) ** 2 + (a.y - textCenterY) ** 2;
        const db = (b.x - textCenterX) ** 2 + (b.y - textCenterY) ** 2;
        return da - db;
      });
    const usable = Math.min(available.length, positions.length);

    this.textFormationActive = true;
    this.textFormationTargets = [];
    this.textReleaseTimer = 0;

    for (let i = 0; i < usable; i++) {
      const p = available[i];
      p.targetX = positions[i].x + offsetX;
      p.targetY = positions[i].y + offsetY;
      p.targetForce = 0.03;
      this.textFormationTargets.push(p);
    }
  }

  _startGracefulRelease() {
    if (!this.textFormationActive) return;
    this.textFormationActive = false;
    this.textReleaseTimer = 500; // 500ms graceful release
  }

  _releaseText() {
    this.textReleaseTimer = 0;
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

    const [br, bg, bb] = this.profile.bg;
    if (this.firstFrame) {
      ctx.fillStyle = `rgb(${br}, ${bg}, ${bb})`;
      ctx.fillRect(0, 0, w, h);
      this.firstFrame = false;
    } else {
      ctx.fillStyle = `rgba(${br}, ${bg}, ${bb}, 0.15)`;
      ctx.fillRect(0, 0, w, h);
    }

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
    const glowSprite = this._glowSprite;

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

      // Glow — use sprite for non-memory, dynamic gradient for memory
      if (p.isMemory) {
        const glowSize = p.radius * 6;
        const particleGlow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
        particleGlow.addColorStop(0, `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${p.alpha * p.life * 0.4})`);
        particleGlow.addColorStop(1, "transparent");
        ctx.fillStyle = particleGlow;
        ctx.fillRect(p.x - glowSize, p.y - glowSize, glowSize * 2, glowSize * 2);
      } else if (glowSprite) {
        // Pre-rendered sprite glow
        const spriteSize = p.radius * 3;
        ctx.globalAlpha = p.alpha * p.life * 0.3;
        ctx.drawImage(glowSprite, p.x - spriteSize, p.y - spriteSize, spriteSize * 2, spriteSize * 2);
        ctx.globalAlpha = 1;
      }

      // Core
      const breathScale = p.isMemory ? 1 + Math.sin(p.breathPhase + this.breathPhase * 3) * 0.15 : 1;
      const r = p.radius * breathScale;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, TWO_PI);
      ctx.fillStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness + 15}%, ${p.alpha * p.life})`;
      ctx.fill();

      // Memory indicator
      if (p.isMemory) {
        const node = this.memory.nodes.get(p.memoryId);

        if (node?.discovered) {
          // Discovered: solid ring
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 2.5, 0, TWO_PI);
          ctx.strokeStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, 0.6)`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        } else if (node) {
          // Undiscovered: pulsing ring (subtle invitation to explore)
          const pulseAlpha = 0.1 + Math.sin(node.pulsePhase) * 0.1;
          const pulseRadius = p.radius * 2.5 + Math.sin(node.pulsePhase) * 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, pulseRadius, 0, TWO_PI);
          ctx.strokeStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${pulseAlpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    // Custom cursor glow (renders at raw position for immediate feedback)
    if (this.input.state.active && !this.input.state.isTouch) {
      const cx = this.input.state.x;
      const cy = this.input.state.y;

      // Cursor trail
      if (this.cursorTrail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(this.cursorTrail[0].x, this.cursorTrail[0].y);
        for (let t = 1; t < this.cursorTrail.length; t++) {
          ctx.lineTo(this.cursorTrail[t].x, this.cursorTrail[t].y);
        }
        ctx.strokeStyle = `hsla(${this.profile.primary.h}, 80%, 70%, 0.15)`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Cursor dot
      const cursorBreath = 1 + Math.sin(this.breathPhase * 2) * 0.2;
      const cursorR = 4 * cursorBreath;
      const cursorGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, cursorR * 4);
      cursorGlow.addColorStop(0, `hsla(${this.profile.primary.h}, 80%, 80%, 0.6)`);
      cursorGlow.addColorStop(0.5, `hsla(${this.profile.primary.h}, 70%, 60%, 0.15)`);
      cursorGlow.addColorStop(1, "transparent");
      ctx.fillStyle = cursorGlow;
      ctx.fillRect(cx - cursorR * 4, cy - cursorR * 4, cursorR * 8, cursorR * 8);

      ctx.beginPath();
      ctx.arc(cx, cy, cursorR, 0, TWO_PI);
      ctx.fillStyle = `hsla(${this.profile.primary.h}, 80%, 85%, 0.7)`;
      ctx.fill();
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

  _handleKeyboard(e) {
    const memIds = this.memoryIds;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      if (this.focusedMemoryIndex < 0) {
        this.focusedMemoryIndex = 0;
      } else {
        this.focusedMemoryIndex = (this.focusedMemoryIndex + 1) % memIds.length;
      }
      this._focusMemory(memIds[this.focusedMemoryIndex]);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      if (this.focusedMemoryIndex < 0) {
        this.focusedMemoryIndex = memIds.length - 1;
      } else {
        this.focusedMemoryIndex = (this.focusedMemoryIndex - 1 + memIds.length) % memIds.length;
      }
      this._focusMemory(memIds[this.focusedMemoryIndex]);
    } else if (e.key === "Enter" && this.focusedMemoryIndex >= 0) {
      const id = memIds[this.focusedMemoryIndex];
      const node = this.memory.nodes.get(id);
      if (node && !node.discovered) {
        this.memory.discover(id);
        if (!node.musicPlayed) {
          node.musicPlayed = true;
          const melody = stringToMelody(node.label);
          this.music.playMelody(melody);
          this.discoveredOverlay = node;
          this.overlayFade = 1.0;
          this._formText(node.label);
        }
        if (this._onDiscoveryChange) this._onDiscoveryChange();
      } else if (node?.discovered && node?.url) {
        window.open(node.url, "_blank", "noopener,noreferrer");
      }
    }
    // Space for audio toggle is handled by React
  }

  _focusMemory(id) {
    const node = this.memory.nodes.get(id);
    if (node?.particle) {
      this.input.state.px = node.particle.x;
      this.input.state.py = node.particle.y;
      this.input.state.x = node.particle.x;
      this.input.state.y = node.particle.y;
      this.input.state.active = true;
    }
  }

  /* Returns discovered memory nodes with their current screen positions */
  getDiscoveredPositions() {
    const result = [];
    for (const [id, node] of this.memory.nodes) {
      if (node.discovered && node.particle) {
        result.push({
          id,
          label: node.label,
          desc: node.desc || null,
          url: node.url || null,
          type: node.type,
          x: node.particle.x,
          y: node.particle.y,
        });
      }
    }
    return result;
  }

  onDiscoveryChange(fn) {
    this._onDiscoveryChange = fn;
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
    window.removeEventListener("resize", this._boundResize);
    window.removeEventListener("keydown", this._boundKeyDown);
  }
}
