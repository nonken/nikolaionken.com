"use client";

import { ParticlePool, getGlowSprite, StarField } from "./particles.js";
import { MemorySystem, MEMORIES, textToPositions, stringToMelody } from "./memory.js";
import { createInputHandler } from "./input.js";
import { getCircadianProfile } from "./circadian.js";
import { MusicEngine } from "./music.js";

/*
 * The Organism — "Constellation" design.
 * Full-screen living star map with parallax depth, dramatic discovery,
 * and edge-to-edge visual presence.
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
    // Full-screen layout — use separate X/Y radii for edge-to-edge spread
    this.organismRadius = Math.min(canvas.width, canvas.height) * 0.42;
    this.baseOrganismRadius = this.organismRadius;
    // Text formation hold timer (auto-release after hold)
    this.textHoldTimer = 0;
    this.textHoldDuration = 3000; // hold text for 3s then release
    // Text formation age (for progressive force ramping)
    this.textFormationAge = 0;
    // Nebula clouds
    this.nebulae = [];
    this._nebulaSeeded = false;
    this.running = false;
    this.lastFrame = 0;
    this.rafId = null;

    this.discoveredOverlay = null;
    this.overlayFade = 0;
    this.textFormationTargets = [];
    this.textFormationActive = false;
    this.textReleaseTimer = 0;
    this.firstFrame = true;

    // Intro sequence state: genesis | burst | coalesce | nameform | namehold | ready
    this.introPhase = "genesis";
    this.introTimer = 0;
    this.introParticles = []; // particles spawned during burst
    this.introNameTimer = 0;

    // Birth animation state (post-intro)
    this.birthPhase = "waiting"; // waiting | blooming | alive
    this.birthTimer = 0;
    this.birthIndex = 0;
    this.memoriesPlaced = false;
    this.birthTargetReleases = [];

    // Idle respiration
    this.idleTimer = 0;
    this.idlePulseTimer = 0;
    this.isIdle = false;

    // Idle text formation (B1)
    this.idleTextTimer = 0;
    this.idleTextCooldown = 0;
    this.idleTextIndex = 0;

    // Cursor resonance (A1) — post-completion hover interactions
    this.resonanceTarget = null;
    this.resonanceCooldown = 0;

    // Constellation complete state (A2)
    this.constellationComplete = false;
    this.orbitPhase = 0;
    this.networkPulseTimer = 0;
    this.networkPulseWave = null;
    this.stellarWindTimer = 0;
    this._originalAnchors = new Map(); // snapshot of anchors at completion time

    // Space-key auto-tour (C3)
    this.tourActive = false;
    this.tourIndex = 0;
    this.tourTimer = 0;
    this.tourNodeOrder = []; // filled on completion

    // Click-to-revisit (A3) — exposed for page.jsx
    this._onRevisit = null;

    // Completion callback (C1)
    this._onConstellationComplete = null;

    // Cached memory particle list
    this._memoryParticles = [];

    // Adaptive quality
    this._ftSamples = new Float64Array(60);
    this._ftIndex = 0;
    this._ftCount = 0;
    this.qualityLevel = 1.0;
    this.useGlowSprites = true;

    // Cursor trail
    this.cursorTrail = [];
    this.maxCursorTrail = 12;

    // Keyboard navigation
    this.focusedMemoryIndex = -1;
    this.memoryIds = MEMORIES.map(m => m.id);
    this._boundKeyDown = this._handleKeyboard.bind(this);
    window.addEventListener("keydown", this._boundKeyDown);

    // Circadian refresh timer
    this.circadianTimer = 0;

    // Star field (background layer)
    this.starField = null; // initialized on first resize

    // Parallax offset (updated per frame based on cursor)
    this.parallaxX = 0;
    this.parallaxY = 0;

    // Corona rotation for root node
    this.coronaAngle = 0;

    // Discovery progress ring
    this.progressAngle = 0;

    // Touch burst callback
    this.input.state.onTouchBurst = (x, y) => this._touchBurst(x, y);

    this._boundResize = this._onResize.bind(this);
    window.addEventListener("resize", this._boundResize, { passive: true });
    this._onResize();

    this._glowSprite = null;
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
    // Edge-to-edge: use max dimension so nodes fill the screen
    this.baseOrganismRadius = Math.max(w, h) * 0.42;
    this.organismRadius = this.baseOrganismRadius;

    // Star field
    if (this.starField) {
      this.starField.resize(w, h);
    } else {
      this.starField = new StarField(w, h);
    }

    // Seed nebulae on first resize or regenerate on significant size change
    this._seedNebulae(w, h);

    // Recompute anchors — use separate X/Y radii for proper aspect ratio coverage
    if (this.memory && this.memoriesPlaced) {
      const rx = w * 0.42;
      const ry = h * 0.40;
      this.memory.computeAnchors(this.centerX, this.centerY, rx, ry);
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastFrame = performance.now();

    this.music.setScale(this.profile.scale);
    this.music.setMood(this.profile.musicMood);

    this._glowSprite = getGlowSprite(16);

    // Don't spawn seed particle yet — intro sequence handles it
    this.introPhase = "genesis";
    this.introTimer = 0;

    this.rafId = requestAnimationFrame(this._boundLoop);
  }

  // ── Intro Sequence ───────────────────────────────────────

  _updateIntro(dt) {
    this.introTimer += dt;

    if (this.introPhase === "genesis") {
      // 0-1.5s: single point of light grows at center
      if (this.introTimer > 1500) {
        this.introPhase = "burst";
        this.introTimer = 0;
        this._introBurst();
      }
    } else if (this.introPhase === "burst") {
      // 1.5-3.5s: particles expand outward filling screen
      if (this.introTimer > 2000) {
        this.introPhase = "coalesce";
        this.introTimer = 0;
      }
    } else if (this.introPhase === "coalesce") {
      // 3.5-5.5s: particles start gravitating to their constellation positions
      // Start birthing memory particles
      if (this.birthPhase === "waiting") {
        this.birthPhase = "blooming";
        this.birthTimer = 0;
      }
      if (this.introTimer > 2000) {
        this.introPhase = "nameform";
        this.introTimer = 0;
        this._formText("nikolai onken");
      }
    } else if (this.introPhase === "nameform") {
      // 5.5-7s: name forms from particles
      if (this.introTimer > 1500) {
        this.introPhase = "namehold";
        this.introTimer = 0;
      }
    } else if (this.introPhase === "namehold") {
      // 7-8s: hold name briefly, then release
      if (this.introTimer > 1000) {
        this.introPhase = "ready";
        this.introTimer = 0;
        if (this.textFormationActive) this._startGracefulRelease();
        if (this._onIntroComplete) this._onIntroComplete();
      }
    }
  }

  _introBurst() {
    // Big Bang — spawn 80 particles radiating outward from center
    const count = 80;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * TWO_PI + Math.random() * 0.3;
      const speed = 3 + Math.random() * 6;
      const dist = Math.random() * 10;
      const x = this.centerX + Math.cos(angle) * dist;
      const y = this.centerY + Math.sin(angle) * dist;
      const hueShift = Math.random() * 30;
      const p = this.pool.add(x, y, {
        generation: 1,
        radius: 1 + Math.random() * 2,
        hue: (this.profile.primary.h + hueShift) % 360,
        saturation: this.profile.primary.s,
        lightness: this.profile.primary.l + Math.random() * 20,
        alpha: 0.6 + Math.random() * 0.3,
        decay: 0.008 + Math.random() * 0.005,
        maxTrail: this.profile.trailLength,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      });
      if (p) this.introParticles.push(p);
    }
  }

  // ── Birth ───────────────────────────────────────────────

  _birthNextMemory() {
    if (this.birthIndex >= MEMORIES.length) {
      this.birthPhase = "alive";
      this.memoriesPlaced = true;
      // Compute constellation layout with full-screen radii
      const w = window.innerWidth;
      const h = window.innerHeight;
      const rx = w * 0.42;
      const ry = h * 0.40;
      this.memory.computeAnchors(this.centerX, this.centerY, rx, ry);
      return;
    }

    const i = this.birthIndex;
    const mem = MEMORIES[i];

    // Use the pre-computed constellation positions
    const node = this.memory.nodes.get(mem.id);
    // Compute a temporary target for birth animation
    const w = window.innerWidth;
    const h = window.innerHeight;
    const rx = w * 0.42;
    const ry = h * 0.40;
    this.memory.computeConstellationLayout(this.centerX, this.centerY, rx, ry);

    const targetX = node.anchorX || this.centerX;
    const targetY = node.anchorY || this.centerY;

    const hue = mem.type === "identity" ? (this.profile.primary.h + 40) % 360 :
                mem.type === "root" ? this.profile.accent.h :
                this.profile.primary.h;
    const sat = mem.type === "identity" ? 50 : this.profile.primary.s;
    const light = mem.type === "root" ? 85 : mem.type === "identity" ? 55 : this.profile.primary.l;

    const p = this.pool.add(this.centerX, this.centerY, {
      generation: 0,
      radius: mem.type === "root" ? 5 : mem.type === "identity" ? 4 : 3.5,
      mass: 3,
      hue,
      saturation: sat,
      lightness: light,
      alpha: 0.95,
      maxTrail: 3,
      vx: (targetX - this.centerX) * 0.012,
      vy: (targetY - this.centerY) * 0.012,
    });
    if (p) {
      this.memory.assignParticle(mem.id, p);
      p.targetX = targetX;
      p.targetY = targetY;
      p.targetForce = 0.008;
      this.birthTargetReleases.push({ particle: p, releaseAt: this.time + 2500 });
      this._memoryParticles.push(p);
    }

    this.birthIndex++;
  }

  _touchBurst(x, y) {
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

  // ── Main Loop ──────────────────────────────────────────

  _loop(ts) {
    if (!this.running) return;
    this.dt = Math.min(ts - this.lastFrame, 50);
    this.lastFrame = ts;
    this.time += this.dt;

    // Adaptive quality
    this._ftSamples[this._ftIndex] = this.dt;
    this._ftIndex = (this._ftIndex + 1) % 60;
    if (this._ftCount < 60) this._ftCount++;
    if (this._ftCount === 60 && this.qualityLevel === 1.0) {
      let sum = 0;
      for (let i = 0; i < 60; i++) sum += this._ftSamples[i];
      if (sum / 60 > 25) {
        this.qualityLevel = 0.75;
        this.pool.max = Math.floor(500 * 0.75);
      }
    }

    this._update();
    this._draw();

    this.rafId = requestAnimationFrame(this._boundLoop);
  }

  _update() {
    const dt = this.dt;
    this.breathPhase += dt * 0.001 * this.profile.breathRate;
    this.coronaAngle += dt * 0.00008; // slow corona rotation
    this.input.update(0.3);

    this.memory.isTouch = this.input.state.isTouch;

    // Refresh circadian every 60s
    this.circadianTimer += dt;
    if (this.circadianTimer > 60000) {
      this.circadianTimer = 0;
      this.profile = getCircadianProfile();
      this.music.setScale(this.profile.scale);
      this.music.setMood(this.profile.musicMood);
    }

    // Update star field (shooting stars, etc.)
    if (this.starField) {
      this.starField.update(dt);
    }

    // Update nebula drift
    for (const neb of this.nebulae) {
      neb.x += neb.vx * dt * 0.001;
      neb.y += neb.vy * dt * 0.001;
      // Gentle wrap
      if (neb.x < -neb.r) neb.x = w + neb.r;
      if (neb.x > w + neb.r) neb.x = -neb.r;
      if (neb.y < -neb.r) neb.y = h + neb.r;
      if (neb.y > h + neb.r) neb.y = -neb.r;
    }

    // Parallax from cursor position
    if (this.input.state.active) {
      const mx = (this.input.state.x / window.innerWidth - 0.5) * 2;
      const my = (this.input.state.y / window.innerHeight - 0.5) * 2;
      this.parallaxX += (mx * 15 - this.parallaxX) * 0.05;
      this.parallaxY += (my * 15 - this.parallaxY) * 0.05;
    } else {
      this.parallaxX *= 0.98;
      this.parallaxY *= 0.98;
    }

    // Intro sequence
    if (this.introPhase !== "ready") {
      this._updateIntro(dt);
    }

    // Process birth target releases
    for (let i = this.birthTargetReleases.length - 1; i >= 0; i--) {
      const entry = this.birthTargetReleases[i];
      if (this.time >= entry.releaseAt) {
        entry.particle.targetX = null;
        entry.particle.targetY = null;
        entry.particle.targetForce = 0;
        this.birthTargetReleases.splice(i, 1);
      }
    }

    // Birth animation
    if (this.birthPhase === "blooming") {
      this.birthTimer += dt;
      if (this.birthTimer > 90) {
        this.birthTimer = 0;
        this._birthNextMemory();
      }
    }

    // Bloom
    if (this.input.state.active && this.generation < this.maxGeneration && this.introPhase === "ready") {
      this.bloomTimer += dt;
      if (this.bloomTimer > this.bloomInterval && this.pool.count < 350) {
        this.bloomTimer = 0;
        this._bloom();
      }
    }

    // Idle detection (tour counts as active — don't trigger idle during auto-tour)
    if (this.input.state.active || this.tourActive) {
      this.idleTimer = 0;
      this.idleTextTimer = 0; // reset idle text timer on any input
      this.idleTextCooldown = 0; // reset cooldown so it doesn't accumulate across idle periods
      this.isIdle = false;
    } else {
      this.idleTimer += dt;
      if (this.idleTimer > 3000) {
        this.isIdle = true;
      }
    }

    // Idle respiration
    if (this.isIdle && this.memoriesPlaced) {
      this.idlePulseTimer += dt;
      if (this.idlePulseTimer > 2000 && this.pool.count < 300) {
        this.idlePulseTimer = 0;
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
            decay: 0.012,
            maxTrail: this.profile.trailLength,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
          });
        }
      }
    }

    // ── Idle text formation (B1) — with auto-release ──
    if (this.isIdle && this.memoriesPlaced && this.introPhase === "ready" && !this.tourActive) {
      this.idleTextTimer += dt;
      this.idleTextCooldown -= dt;
      if (this.idleTextTimer > 8000 && this.idleTextCooldown <= 0 && !this.textFormationActive && this.textReleaseTimer <= 0) {
        this.idleTextCooldown = 10000; // 10s between idle texts
        this.idleTextTimer = 8000; // keep timer at threshold
        const labels = this._getIdleTextLabels();
        if (labels.length > 0) {
          const label = labels[this.idleTextIndex % labels.length];
          this.idleTextIndex++;
          this._formText(label);
          this.textHoldTimer = 0; // start hold timer
          this.discoveredOverlay = { label, desc: null };
          this.overlayFade = 1.0;
          this.music.playMelody(stringToMelody(label));
        }
      }
    }

    // ── Cursor resonance (A1) — post-completion hover ──
    if (this.constellationComplete && this.input.state.active && this.introPhase === "ready") {
      this.resonanceCooldown -= dt;
      this._updateResonance(dt);
    }

    // ── Constellation breathing (A2) — post-completion ambient life ──
    if (this.constellationComplete) {
      this._updateCompletedConstellation(dt);
    }

    // ── Auto-tour (C3) ──
    if (this.tourActive) {
      this._updateTour(dt);
    }

    // ── Check constellation completion ──
    if (!this.constellationComplete && this.memoriesPlaced && this.memory.discovered.size === MEMORIES.length) {
      this.constellationComplete = true;
      // Snapshot original anchor positions for orbital drift
      for (const [id, node] of this.memory.nodes) {
        if (node.anchorX !== null) {
          const dx = node.anchorX - this.centerX;
          const dy = node.anchorY - this.centerY;
          this._originalAnchors.set(id, {
            dist: Math.sqrt(dx * dx + dy * dy) || 1,
            angle: Math.atan2(dy, dx),
          });
        }
      }
      this._buildTourOrder();
      if (this._onConstellationComplete) this._onConstellationComplete();
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
      const ratio = this.organismRadius / this.baseOrganismRadius;
      this.music.setPitchShift(1.0 / ratio);
    }

    // Physics
    const particles = this.pool.particles;
    const cx = this.centerX;
    const cy = this.centerY;
    const breath = Math.sin(this.breathPhase) * (this.isIdle ? 0.5 : 0.3);
    const cohesionStrength = 0.0002; // slightly weaker for wider spread
    const separationDist = 18;
    const damping = 0.97;
    const speed = this.profile.particleSpeed;

    this.pool.rebuild();

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Anchor spring for discovered memory particles
      if (p.isMemory && p.memoryId) {
        const node = this.memory.nodes.get(p.memoryId);
        if (node?.discovered && node.anchorX !== null) {
          const ax = node.anchorX - p.x;
          const ay = node.anchorY - p.y;
          const wobbleX = Math.sin(this.breathPhase * 2 + p.breathPhase) * 3;
          const wobbleY = Math.cos(this.breathPhase * 2 + p.breathPhase) * 3;
          p.addForce((ax + wobbleX) * 0.02, (ay + wobbleY) * 0.02);
          p.verletStep(dt, damping);
          p.updateTrail();
          if (p.decay > 0) p.life -= p.decay * dt * 0.001;
          continue;
        }
      }

      // Breathing
      const dx = cx - p.x;
      const dy = cy - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      // Cohesion: gentler for wider constellation
      p.addForce(dx * cohesionStrength * speed, dy * cohesionStrength * speed);

      // Breathing oscillation
      const breathForce = breath * 0.02;
      p.addForce(-dx / dist * breathForce, -dy / dist * breathForce);

      // Separation
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

      // Cursor attraction
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

      // Multi-touch membrane
      if (this.input.state.touches.length >= 2 && !p.isMemory) {
        const touches = this.input.state.touches;
        for (let t = 0; t < touches.length - 1; t++) {
          const t1 = touches[t];
          const t2 = touches[t + 1];
          const lx = t2.x - t1.x;
          const ly = t2.y - t1.y;
          const len = Math.sqrt(lx * lx + ly * ly) || 1;
          const ppx = p.x - t1.x;
          const ppy = p.y - t1.y;
          const proj = Math.max(0, Math.min(1, (ppx * lx + ppy * ly) / (len * len)));
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

      // Text formation targets with convergence damping
      if (p.targetX !== null && p.targetForce > 0) {
        const tx = p.targetX - p.x;
        const ty = p.targetY - p.y;
        const tDist = Math.sqrt(tx * tx + ty * ty);
        p.addForce(tx * p.targetForce, ty * p.targetForce);
        // Extra velocity damping when close — kills wobble
        if (tDist < 8) {
          const dampFactor = 0.85;
          const vx = (p.x - p.px) * dampFactor;
          const vy = (p.y - p.py) * dampFactor;
          p.px = p.x - vx;
          p.py = p.y - vy;
        }
      }

      // Shockwave push
      for (const sw of this.memory.shockwaves) {
        const sdx = p.x - sw.x;
        const sdy = p.y - sw.y;
        const sdist = Math.sqrt(sdx * sdx + sdy * sdy) || 1;
        const waveFront = sw.radius;
        const waveWidth = 40;
        if (Math.abs(sdist - waveFront) < waveWidth && !p.isMemory) {
          const pushStrength = 2.0 * sw.alpha * (1 - Math.abs(sdist - waveFront) / waveWidth);
          p.addForce((sdx / sdist) * pushStrength, (sdy / sdist) * pushStrength);
        }
      }

      p.verletStep(dt, damping);

      // Clamp to prevent NaN/Infinity propagation from unbounded physics
      if (!isFinite(p.x) || !isFinite(p.y)) {
        p.x = cx;
        p.y = cy;
        p.px = cx;
        p.py = cy;
      }

      p.updateTrail();

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

    // Memory dwell detection (only when intro is done)
    if (this.input.state.active && this.introPhase === "ready") {
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
        // D2: First discovery has amplified effects
        const isFirstDiscovery = this.memory.discovered.size === 1;
        const melody = stringToMelody(node.label);
        this.music.playMelody(melody);
        this.discoveredOverlay = node;
        this.overlayFade = isFirstDiscovery ? 1.5 : 1.0; // longer overlay for first

        this._formText(node.label);

        // D2: amplified shockwave for first discovery — replace the normal
        // shockwave already pushed by discover() to avoid a double shockwave
        if (isFirstDiscovery && node.particle && this.memory.shockwaves.length > 0) {
          const last = this.memory.shockwaves[this.memory.shockwaves.length - 1];
          last.maxRadius = 600;
          last.speed = 400;
          last.alpha = 1.0;
        }

        const rx = window.innerWidth * 0.42;
        const ry = window.innerHeight * 0.40;
        this.memory.computeAnchors(this.centerX, this.centerY, rx, ry);

        if (this._onDiscoveryChange) this._onDiscoveryChange();
      }
    }

    // Graceful text release
    if (this.overlayFade > 0) {
      this.overlayFade -= dt * 0.0003;
      if (this.overlayFade <= 0.3 && this.textFormationActive) {
        this._startGracefulRelease();
      }
      if (this.overlayFade < 0) {
        this.overlayFade = 0;
      }
    }

    // Auto-release text after hold duration
    if (this.textFormationActive) {
      this.textHoldTimer += dt;
      this.textFormationAge += dt;
      // Progressive force ramp: 0.03 → 0.06 over 500ms for crisp convergence
      const rampT = Math.min(1, this.textFormationAge / 500);
      const baseForce = 0.03 + rampT * 0.03;
      for (const p of this.textFormationTargets) {
        // Extra damping when close to target — reduces wobble
        const dx = (p.targetX || 0) - p.x;
        const dy = (p.targetY || 0) - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        p.targetForce = dist < 5 ? baseForce * 1.5 : baseForce;
      }
      if (this.textHoldTimer > this.textHoldDuration) {
        this._startGracefulRelease();
      }
    }

    // Decay text formation force
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

  // ── Idle text labels (B1) ──
  _getIdleTextLabels() {
    const labels = [];
    for (const [, node] of this.memory.nodes) {
      if (node.discovered) labels.push(node.label);
    }
    if (labels.length === 0) labels.push("nikolai onken");
    return labels;
  }

  // ── Cursor resonance (A1) ──
  _updateResonance(dt) {
    const px = this.input.state.px;
    const py = this.input.state.py;
    const resonanceRadius = 80;
    let nearest = null;
    let nearestDist = Infinity;

    for (const [id, node] of this.memory.nodes) {
      if (!node.particle || !node.discovered) continue;
      const dx = node.particle.x - px;
      const dy = node.particle.y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < resonanceRadius && dist < nearestDist) {
        nearestDist = dist;
        nearest = id;
      }
    }

    if (nearest && nearest !== this.resonanceTarget && this.resonanceCooldown <= 0) {
      this.resonanceTarget = nearest;
      this.resonanceCooldown = 3000; // 3s cooldown between resonances
      const node = this.memory.nodes.get(nearest);
      // Subtle text formation with lighter force
      if (!this.textFormationActive && this.textReleaseTimer <= 0) {
        this._formText(node.label, 0.015); // softer force than discovery
        this.discoveredOverlay = node;
        this.overlayFade = 0.6; // dimmer overlay for resonance
        this.music.playMelody(stringToMelody(node.label));
      }
      // Pulse connected nodes
      this.memory.pulseConnected(nearest);
    } else if (!nearest) {
      this.resonanceTarget = null;
    }
  }

  // ── Constellation breathing (A2) ──
  _updateCompletedConstellation(dt) {
    // Orbital drift — slow constant-velocity orbit of work nodes around root
    this.orbitPhase += dt * 0.00003;
    for (const [id, node] of this.memory.nodes) {
      if (node.type !== "work" || !node.particle || !node.discovered) continue;
      const orig = this._originalAnchors.get(id);
      if (!orig) continue;
      const angle = orig.angle + this.orbitPhase;
      node.anchorX = this.centerX + Math.cos(angle) * orig.dist;
      node.anchorY = this.centerY + Math.sin(angle) * orig.dist;
    }

    // Connection pulse waves — periodic network-wide pulse from root
    this.networkPulseTimer += dt;
    if (this.networkPulseTimer > 8000) { // every 8 seconds
      this.networkPulseTimer = 0;
      const rootNode = this.memory.nodes.get("root");
      if (rootNode?.particle) {
        this.networkPulseWave = {
          x: rootNode.particle.x,
          y: rootNode.particle.y,
          radius: 0,
          maxRadius: this.organismRadius * 2,
          speed: 200,
          alpha: 0.3,
        };
      }
    }
    if (this.networkPulseWave) {
      this.networkPulseWave.radius += this.networkPulseWave.speed * dt * 0.001;
      this.networkPulseWave.alpha = 0.3 * (1 - this.networkPulseWave.radius / this.networkPulseWave.maxRadius);
      if (this.networkPulseWave.radius >= this.networkPulseWave.maxRadius) {
        this.networkPulseWave = null;
      }
    }

    // Stellar wind — flowing particle currents between node clusters
    this.stellarWindTimer += dt;
    if (this.stellarWindTimer > 1200 && this.pool.count < 350) {
      this.stellarWindTimer = 0;
      const memParticles = this._memoryParticles;
      if (memParticles.length >= 2) {
        const src = memParticles[Math.floor(Math.random() * memParticles.length)];
        const dst = memParticles[Math.floor(Math.random() * memParticles.length)];
        if (src !== dst) {
          const dx = dst.x - src.x;
          const dy = dst.y - src.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const speed = 0.4 + Math.random() * 0.4;
          this.pool.add(src.x, src.y, {
            generation: 1,
            radius: 0.8 + Math.random() * 0.8,
            hue: (src.hue + dst.hue) / 2,
            saturation: src.saturation,
            lightness: src.lightness + 15,
            alpha: 0.25,
            decay: 0.008,
            maxTrail: this.profile.trailLength + 2,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed,
          });
        }
      }
    }
  }

  // ── Click-to-revisit (A3) ──
  revisitNode(id) {
    return this._revisitNode(id);
  }

  _revisitNode(id) {
    const node = this.memory.nodes.get(id);
    if (!node?.discovered || !node.particle) return;
    // Replay shockwave
    this.memory.shockwaves.push({
      x: node.particle.x,
      y: node.particle.y,
      radius: 0,
      maxRadius: 300,
      speed: 500,
      alpha: 0.6,
      hue: node.particle.hue,
    });
    // Release any active text formation before forming new text
    if (this.textFormationActive) this._releaseText();
    // Replay text formation + overlay
    this._formText(node.label);
    this.discoveredOverlay = node;
    this.overlayFade = 1.0;
    this.music.playMelody(stringToMelody(node.label));
    // Pulse connected nodes
    this.memory.pulseConnected(id);
    if (this._onRevisit) this._onRevisit(id);
  }

  // ── Auto-tour (C3) ──
  _buildTourOrder() {
    // Chronological: work nodes by year, then identity nodes
    const work = MEMORIES.filter(m => m.type === "work").sort((a, b) => (a.year || 0) - (b.year || 0)).map(m => m.id);
    const identity = MEMORIES.filter(m => m.type === "identity").map(m => m.id);
    this.tourNodeOrder = ["root", ...work, ...identity];
  }

  _updateTour(dt) {
    this.tourTimer += dt;
    if (this.tourTimer > 4000) { // 4s per node
      this.tourTimer = 0;
      this.tourIndex++;
      if (this.tourIndex >= this.tourNodeOrder.length) {
        this.tourActive = false;
        this.tourIndex = 0;
        return;
      }
      const id = this.tourNodeOrder[this.tourIndex];
      this._revisitNode(id);
      this._focusMemory(id);
    }
  }

  startTour() {
    if (this.tourNodeOrder.length === 0) return;
    this.tourActive = true;
    this.tourIndex = 0;
    this.tourTimer = 0;
    const id = this.tourNodeOrder[0];
    this._revisitNode(id);
    this._focusMemory(id);
  }

  stopTour() {
    this.tourActive = false;
  }

  // ── Find nearest discovered node to a screen position ──
  findNearestNode(x, y, maxDist) {
    let nearest = null;
    let nearestDist = maxDist || Infinity;
    for (const [id, node] of this.memory.nodes) {
      if (!node.discovered || !node.particle) continue;
      const dx = node.particle.x - x;
      const dy = node.particle.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = id;
      }
    }
    return nearest;
  }

  _formText(text, force) {
    const targetForce = force || 0.03;
    // B3: denser sampling for short labels
    const step = text.length <= 8 ? 2 : 3;
    const fontSize = Math.min(48, window.innerWidth / text.length * 0.8);
    const width = text.length * fontSize;
    const height = fontSize * 2;
    const positions = textToPositions(text, fontSize, width, height, step);

    const offsetX = this.centerX - width / 2;
    const offsetY = this.centerY - height / 2 - 80;

    const textCenterX = this.centerX;
    const textCenterY = offsetY + height / 2;
    const available = this.pool.particles
      .filter(p => !p.isMemory && p.targetX === null)
      .sort((a, b) => {
        const da = (a.x - textCenterX) ** 2 + (a.y - textCenterY) ** 2;
        const db = (b.x - textCenterX) ** 2 + (b.y - textCenterY) ** 2;
        return da - db;
      });

    // B3: spawn temporary particles if not enough available
    const needed = positions.length;
    const deficit = needed - available.length;
    if (deficit > 0) {
      const toSpawn = Math.min(deficit, 150);
      for (let i = 0; i < toSpawn; i++) {
        const angle = Math.random() * TWO_PI;
        const dist = 50 + Math.random() * 150;
        const px = textCenterX + Math.cos(angle) * dist;
        const py = textCenterY + Math.sin(angle) * dist;
        const p = this.pool.add(px, py, {
          generation: 1,
          radius: 0.8 + Math.random() * 0.8,
          hue: this.profile.primary.h,
          saturation: this.profile.primary.s,
          lightness: this.profile.primary.l + 10,
          alpha: 0.5,
          decay: 0.015, // auto-decay after release
          maxTrail: 2,
          vx: 0,
          vy: 0,
        });
        if (p) available.push(p);
      }
    }

    const usable = Math.min(available.length, positions.length);

    this.textFormationActive = true;
    this.textFormationTargets = [];
    this.textReleaseTimer = 0;
    this.textFormationAge = 0;
    this.textHoldTimer = 0;

    for (let i = 0; i < usable; i++) {
      const p = available[i];
      p.targetX = positions[i].x + offsetX;
      p.targetY = positions[i].y + offsetY;
      p.targetForce = targetForce;
      this.textFormationTargets.push(p);
    }
  }

  _startGracefulRelease() {
    if (!this.textFormationActive) return;
    this.textFormationActive = false;
    this.textReleaseTimer = 500;
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

  // ── Drawing ────────────────────────────────────────────

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

    // ── Star field (multi-layer parallax) ──
    if (this.starField && (this.introPhase !== "genesis")) {
      const result = this.starField.render(this.time * 0.001, this.parallaxX, this.parallaxY);
      const introAlpha = this.introPhase === "burst" ? Math.min(1, this.introTimer / 1000) : 1;
      ctx.globalAlpha = introAlpha;
      for (let li = 0; li < result.layers.length; li++) {
        const px = this.parallaxX * result.parallaxes[li];
        const py = this.parallaxY * result.parallaxes[li];
        ctx.drawImage(result.layers[li], px, py);
      }
      // Shooting stars on top of star layers
      this.starField.drawShootingStars(ctx);
      ctx.globalAlpha = 1;
    }

    // ── Nebula clouds ──
    this._drawNebulae(ctx, w, h);

    // ── Intro genesis point ──
    if (this.introPhase === "genesis") {
      const progress = Math.min(1, this.introTimer / 1500);
      const pulseSize = 3 + Math.sin(this.time * 0.005) * 2;
      const size = pulseSize * progress;
      const gi = 0.6 * progress;
      const grad = ctx.createRadialGradient(this.centerX, this.centerY, 0, this.centerX, this.centerY, Math.max(0.001, size * 10));
      grad.addColorStop(0, `hsla(${this.profile.primary.h}, 80%, 90%, ${gi})`);
      grad.addColorStop(0.3, `hsla(${this.profile.primary.h}, 70%, 70%, ${gi * 0.5})`);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(this.centerX - size * 10, this.centerY - size * 10, size * 20, size * 20);

      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, size, 0, TWO_PI);
      ctx.fillStyle = `hsla(${this.profile.primary.h}, 80%, 90%, ${0.8 * progress})`;
      ctx.fill();
      return; // Only draw genesis point during this phase
    }

    // ── Ambient nebula glow (wider than before) ──
    const glowR = this.organismRadius * 1.8;
    const ambGlow = ctx.createRadialGradient(this.centerX, this.centerY, 0, this.centerX, this.centerY, Math.max(0.001, glowR));
    const gi = this.profile.glowIntensity * 0.03;
    const ph = this.profile.primary.h;
    ambGlow.addColorStop(0, `hsla(${ph}, 70%, 50%, ${gi})`);
    ambGlow.addColorStop(0.3, `hsla(${ph}, 60%, 40%, ${gi * 0.5})`);
    ambGlow.addColorStop(0.7, `hsla(${ph}, 50%, 30%, ${gi * 0.15})`);
    ambGlow.addColorStop(1, "transparent");
    ctx.fillStyle = ambGlow;
    ctx.fillRect(this.centerX - glowR, this.centerY - glowR, glowR * 2, glowR * 2);

    // ── Root node stellar core ──
    const rootNode = this.memory.nodes.get("root");
    if (rootNode?.particle) {
      const rp = rootNode.particle;
      this._drawStellarCore(ctx, rp.x, rp.y);
    }

    // ── Shockwaves ──
    for (const sw of this.memory.shockwaves) {
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, TWO_PI);
      ctx.strokeStyle = `hsla(${sw.hue}, 80%, 80%, ${sw.alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      // Inner ring
      if (sw.radius > 10) {
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius * 0.9, 0, TWO_PI);
        ctx.strokeStyle = `hsla(${sw.hue}, 60%, 90%, ${sw.alpha * 0.4})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // ── Network pulse wave (A2) ──
    if (this.networkPulseWave) {
      const npw = this.networkPulseWave;
      ctx.beginPath();
      ctx.arc(npw.x, npw.y, npw.radius, 0, TWO_PI);
      ctx.strokeStyle = `hsla(${this.profile.accent.h}, 60%, 70%, ${npw.alpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // ── Flowing connection streams ──
    for (const stream of this.memory.flowStreams) {
      const fromNode = this.memory.nodes.get(stream.from);
      const toNode = this.memory.nodes.get(stream.to);
      if (!fromNode?.particle || !toNode?.particle) continue;

      const x1 = fromNode.particle.x;
      const y1 = fromNode.particle.y;
      const x2 = toNode.particle.x;
      const y2 = toNode.particle.y;

      // Curved path with perpendicular offset
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      // Perpendicular offset for curve
      const perpX = -dy / len * 20;
      const perpY = dx / len * 20;
      const cpx = mx + perpX;
      const cpy = my + perpY;

      // Faint connection line
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cpx, cpy, x2, y2);
      ctx.strokeStyle = `hsla(${this.profile.primary.h}, 50%, 50%, 0.08)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Flowing particles along the curve
      for (const fp of stream.particles) {
        const t = fp.t;
        const mt = 1 - t;
        // Quadratic bezier point
        const px = mt * mt * x1 + 2 * mt * t * cpx + t * t * x2;
        const py = mt * mt * y1 + 2 * mt * t * cpy + t * t * y2;
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, TWO_PI);
        ctx.fillStyle = `hsla(${this.profile.accent.h}, 80%, 70%, 0.5)`;
        ctx.fill();
      }
    }

    // ── Connection trails (temporary, on discovery) ──
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

    // ── Draw particles ──
    const particles = this.pool.particles;
    const glowSprite = this._glowSprite;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (!isFinite(p.x) || !isFinite(p.y) || p.radius <= 0) continue;

      // Snap rendering: when particle is near its text target, use target position for rendering
      let drawX = p.x;
      let drawY = p.y;
      if (p.targetX !== null && p.targetForce > 0) {
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        if (dx * dx + dy * dy < 4) { // within 2px
          drawX = p.targetX;
          drawY = p.targetY;
        }
      }

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

      // Glow (using drawX/drawY for snap rendering)
      if (p.isMemory) {
        const node = this.memory.nodes.get(p.memoryId);
        const isIdentity = node?.type === "identity";

        if (isIdentity && node?.discovered) {
          const nebulaR = Math.max(0.001, p.radius * 12);
          const nebulaGlow = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, nebulaR);
          nebulaGlow.addColorStop(0, `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${p.alpha * p.life * 0.15})`);
          nebulaGlow.addColorStop(0.5, `hsla(${p.hue}, ${p.saturation - 10}%, ${p.lightness - 10}%, ${p.alpha * p.life * 0.06})`);
          nebulaGlow.addColorStop(1, "transparent");
          ctx.fillStyle = nebulaGlow;
          ctx.fillRect(drawX - nebulaR, drawY - nebulaR, nebulaR * 2, nebulaR * 2);
        } else {
          const glowSize = Math.max(0.001, p.radius * 8);
          const particleGlow = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, glowSize);
          particleGlow.addColorStop(0, `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${p.alpha * p.life * 0.4})`);
          particleGlow.addColorStop(0.5, `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${p.alpha * p.life * 0.1})`);
          particleGlow.addColorStop(1, "transparent");
          ctx.fillStyle = particleGlow;
          ctx.fillRect(drawX - glowSize, drawY - glowSize, glowSize * 2, glowSize * 2);
        }
      } else if (glowSprite) {
        const spriteSize = p.radius * 3;
        ctx.globalAlpha = p.alpha * p.life * 0.3;
        ctx.drawImage(glowSprite, drawX - spriteSize, drawY - spriteSize, spriteSize * 2, spriteSize * 2);
        ctx.globalAlpha = 1;
      }

      // Core
      const breathScale = p.isMemory ? 1 + Math.sin(p.breathPhase + this.breathPhase * 3) * 0.15 : 1;
      const r = p.radius * breathScale;
      ctx.beginPath();
      ctx.arc(drawX, drawY, r, 0, TWO_PI);
      ctx.fillStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness + 15}%, ${p.alpha * p.life})`;
      ctx.fill();

      // Memory indicator
      if (p.isMemory) {
        const node = this.memory.nodes.get(p.memoryId);

        // Keyboard focus indicator
        const isFocused = this.focusedMemoryIndex >= 0 && this.memoryIds[this.focusedMemoryIndex] === p.memoryId;
        if (isFocused) {
          ctx.beginPath();
          ctx.arc(drawX, drawY, p.radius * 3.5, 0, TWO_PI);
          ctx.strokeStyle = `hsla(${p.hue}, ${p.saturation}%, 80%, 0.8)`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        if (node?.discovered) {
          // Discovered: solid ring
          ctx.beginPath();
          ctx.arc(drawX, drawY, p.radius * 2.5, 0, TWO_PI);
          ctx.strokeStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, 0.6)`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
          // Resonance pulse (A1)
          if (node.resonancePulse > 0) {
            const pulseR = p.radius * (3 + (1 - node.resonancePulse) * 8);
            ctx.beginPath();
            ctx.arc(drawX, drawY, pulseR, 0, TWO_PI);
            ctx.strokeStyle = `hsla(${p.hue}, ${p.saturation}%, 80%, ${node.resonancePulse * 0.5})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        } else if (node) {
          // Undiscovered: flickering anomaly
          const flicker = Math.sin(node.flickerPhase) * 0.5 + 0.5;
          const irregularPulse = Math.sin(node.pulsePhase * 1.3) * 0.3 + Math.cos(node.flickerPhase * 0.7) * 0.2;
          const isWarming = this.memory.warmTarget === p.memoryId;
          const approachBoost = node.approachGlow * 0.4;
          const baseAlpha = isWarming ? 0.45 : 0.15 + irregularPulse * 0.15;
          const pulseAlpha = baseAlpha + flicker * 0.1 + approachBoost;
          const pulseRadius = p.radius * 2.5 + Math.sin(node.pulsePhase) * 1.5 + flicker * 1.5;

          ctx.beginPath();
          ctx.arc(drawX, drawY, pulseRadius, 0, TWO_PI);
          ctx.strokeStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${pulseAlpha})`;
          ctx.lineWidth = isWarming ? 1.2 : 0.6 + flicker * 0.3;
          ctx.stroke();

          // Approach: gravitational lensing
          if (node.approachGlow > 0.1) {
            const lensR = 30 + node.approachGlow * 25;
            const lensGlow = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, Math.max(0.001, lensR));
            lensGlow.addColorStop(0, `hsla(${p.hue}, 60%, 70%, ${node.approachGlow * 0.15})`);
            lensGlow.addColorStop(1, "transparent");
            ctx.fillStyle = lensGlow;
            ctx.fillRect(drawX - lensR, drawY - lensR, lensR * 2, lensR * 2);
          }

          // Warming label preview
          if (isWarming) {
            ctx.globalAlpha = 0.3;
            ctx.font = `500 10px "Space Grotesk", sans-serif`;
            ctx.textAlign = "center";
            ctx.fillStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness + 20}%, 0.5)`;
            ctx.fillText(node.label, drawX, drawY - 20);
            ctx.globalAlpha = 1;
          }
        }
      }
    }

    // ── Discovery progress ring around core ──
    if (this.memory.discovered.size > 0 && rootNode?.particle) {
      const rp = rootNode.particle;
      const total = MEMORIES.length;
      const discovered = this.memory.discovered.size;
      const targetAngle = (discovered / total) * TWO_PI;
      this.progressAngle += (targetAngle - this.progressAngle) * 0.05;

      ctx.beginPath();
      ctx.arc(rp.x, rp.y, 35, -Math.PI / 2, -Math.PI / 2 + this.progressAngle);
      ctx.strokeStyle = `hsla(${this.profile.accent.h}, 80%, 65%, 0.4)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // ── Custom cursor ──
    if (this.input.state.active && !this.input.state.isTouch) {
      const curX = this.input.state.x;
      const curY = this.input.state.y;

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

      const cursorBreath = 1 + Math.sin(this.breathPhase * 2) * 0.2;
      const cursorR = 4 * cursorBreath;
      const cursorGlow = ctx.createRadialGradient(curX, curY, 0, curX, curY, Math.max(0.001, cursorR * 4));
      cursorGlow.addColorStop(0, `hsla(${this.profile.primary.h}, 80%, 80%, 0.6)`);
      cursorGlow.addColorStop(0.5, `hsla(${this.profile.primary.h}, 70%, 60%, 0.15)`);
      cursorGlow.addColorStop(1, "transparent");
      ctx.fillStyle = cursorGlow;
      ctx.fillRect(curX - cursorR * 4, curY - cursorR * 4, cursorR * 8, cursorR * 8);

      ctx.beginPath();
      ctx.arc(curX, curY, cursorR, 0, TWO_PI);
      ctx.fillStyle = `hsla(${this.profile.primary.h}, 80%, 85%, 0.7)`;
      ctx.fill();
    }

    // ── Text formation glow (B3) ──
    if (this.textFormationActive && this.textFormationTargets.length > 0) {
      const tCenterY = this.centerY - 80;
      const glowR = Math.max(0.001, this.organismRadius * 0.4);
      const tGlow = ctx.createRadialGradient(this.centerX, tCenterY, 0, this.centerX, tCenterY, glowR);
      tGlow.addColorStop(0, `hsla(${this.profile.primary.h}, 60%, 60%, 0.06)`);
      tGlow.addColorStop(0.5, `hsla(${this.profile.primary.h}, 50%, 50%, 0.02)`);
      tGlow.addColorStop(1, "transparent");
      ctx.fillStyle = tGlow;
      ctx.fillRect(this.centerX - glowR, tCenterY - glowR, glowR * 2, glowR * 2);
    }

    // ── Discovered content overlay ──
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

  // ── Nebula cloud system ──

  _seedNebulae(w, h) {
    this.nebulae = [];
    const count = 4 + Math.floor(Math.random() * 3); // 4-6 nebulae
    for (let i = 0; i < count; i++) {
      const hueOffset = (Math.random() - 0.5) * 60; // ±30 from primary
      this.nebulae.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 200 + Math.random() * 350,
        hue: (this.profile.primary.h + hueOffset + 360) % 360,
        sat: 20 + Math.random() * 30,
        alpha: 0.015 + Math.random() * 0.025, // very subtle: 1.5-4%
        vx: (Math.random() - 0.5) * 2, // slow drift
        vy: (Math.random() - 0.5) * 1.5,
      });
    }
    this._nebulaSeeded = true;
  }

  _drawNebulae(ctx, w, h) {
    for (const neb of this.nebulae) {
      const r = Math.max(0.001, neb.r);
      const grad = ctx.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, r);
      grad.addColorStop(0, `hsla(${neb.hue}, ${neb.sat}%, 50%, ${neb.alpha})`);
      grad.addColorStop(0.4, `hsla(${neb.hue}, ${neb.sat - 5}%, 40%, ${neb.alpha * 0.5})`);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(neb.x - r, neb.y - r, r * 2, r * 2);
    }
  }

  // ── Upgraded stellar core with lens flare, variable corona, chromatic bloom ──

  _drawStellarCore(ctx, x, y) {
    const coreSize = 25;
    const breathPulse = 1 + Math.sin(this.breathPhase * 1.5) * 0.08;
    const size = coreSize * breathPulse;

    // Outer halo — larger and more layered
    const haloR = size * 4;
    const halo = ctx.createRadialGradient(x, y, 0, x, y, Math.max(0.001, haloR));
    halo.addColorStop(0, `hsla(${this.profile.accent.h}, 70%, 80%, 0.1)`);
    halo.addColorStop(0.25, `hsla(${this.profile.accent.h}, 60%, 70%, 0.05)`);
    halo.addColorStop(0.5, `hsla(${this.profile.primary.h}, 60%, 60%, 0.02)`);
    halo.addColorStop(1, "transparent");
    ctx.fillStyle = halo;
    ctx.fillRect(x - haloR, y - haloR, haloR * 2, haloR * 2);

    // Variable corona rays — each ray has independent pulse
    const rayCount = 8;
    for (let i = 0; i < rayCount; i++) {
      const angle = this.coronaAngle + (i / rayCount) * TWO_PI;
      // Each ray pulses at its own frequency
      const rayPulse = Math.sin(this.breathPhase * (1.5 + i * 0.3) + i * 1.7);
      const rayLen = size * (1.5 + rayPulse * 0.8);
      const rx = x + Math.cos(angle) * rayLen;
      const ry = y + Math.sin(angle) * rayLen;
      const rayAlpha = 0.1 + rayPulse * 0.06;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(rx, ry);
      ctx.strokeStyle = `hsla(${this.profile.accent.h}, 70%, 75%, ${rayAlpha})`;
      ctx.lineWidth = 1 + rayPulse * 0.5;
      ctx.stroke();
    }

    // Lens flare — 2-3 hexagonal artifacts along a fixed axis
    const flareAngle = 0.7; // fixed axis
    for (let i = 1; i <= 3; i++) {
      const fd = size * (2.5 + i * 1.8);
      const fx = x + Math.cos(flareAngle) * fd;
      const fy = y + Math.sin(flareAngle) * fd;
      const fr = Math.max(0.001, size * (0.3 + i * 0.15));
      const fa = 0.04 - i * 0.008;
      if (fa <= 0) continue;
      const flare = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
      flare.addColorStop(0, `hsla(${(this.profile.accent.h + i * 20) % 360}, 50%, 80%, ${fa})`);
      flare.addColorStop(1, "transparent");
      ctx.fillStyle = flare;
      ctx.fillRect(fx - fr, fy - fr, fr * 2, fr * 2);
    }

    // Chromatic bloom — white-hot center fading to primary color at edge
    const innerR = size * 1.4;
    const inner = ctx.createRadialGradient(x, y, 0, x, y, Math.max(0.001, innerR));
    inner.addColorStop(0, `hsla(0, 0%, 98%, 0.7)`); // white-hot center
    inner.addColorStop(0.15, `hsla(${this.profile.accent.h}, 40%, 95%, 0.5)`);
    inner.addColorStop(0.4, `hsla(${this.profile.accent.h}, 60%, 80%, 0.2)`);
    inner.addColorStop(0.7, `hsla(${this.profile.primary.h}, 70%, 60%, 0.06)`);
    inner.addColorStop(1, "transparent");
    ctx.fillStyle = inner;
    ctx.fillRect(x - innerR, y - innerR, innerR * 2, innerR * 2);
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
        const rx = window.innerWidth * 0.42;
        const ry = window.innerHeight * 0.40;
        this.memory.computeAnchors(this.centerX, this.centerY, rx, ry);
        if (this._onDiscoveryChange) this._onDiscoveryChange();
      } else if (node?.discovered && node?.url) {
        window.open(node.url, "_blank", "noopener,noreferrer");
      } else if (node?.discovered) {
        // A3: Revisit identity/root nodes that have no URL
        this._revisitNode(id);
      }
    } else if (e.key === " ") {
      // C3: Space key toggles auto-tour (only when constellation is complete)
      e.preventDefault();
      if (this.constellationComplete) {
        if (this.tourActive) {
          this.stopTour();
        } else {
          this.startTour();
        }
      }
    } else if (e.key === "Escape") {
      this.overlayFade = 0;
      this.discoveredOverlay = null;
      if (this.textFormationActive) this._startGracefulRelease();
      if (this.tourActive) this.stopTour();
    }
  }

  _focusMemory(id) {
    const node = this.memory.nodes.get(id);
    if (node?.particle) {
      this.input.state.px = node.particle.x;
      this.input.state.py = node.particle.y;
      this.input.state.x = node.particle.x;
      this.input.state.y = node.particle.y;
      // Don't set active during tour — it would trigger tour cancellation
      if (!this.tourActive) {
        this.input.state.active = true;
      }
    }
  }

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

  getDiscoveryCount() {
    return { discovered: this.memory.discovered.size, total: MEMORIES.length };
  }

  onDiscoveryChange(fn) {
    this._onDiscoveryChange = fn;
  }

  onIntroComplete(fn) {
    this._onIntroComplete = fn;
  }

  onConstellationComplete(fn) {
    this._onConstellationComplete = fn;
  }

  onRevisit(fn) {
    this._onRevisit = fn;
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
