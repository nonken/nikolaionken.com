"use client";

/*
 * Particle system with Verlet integration and spatial hashing.
 * Each particle stores current + previous position for implicit velocity.
 * Optimized: numeric hash keys, pre-rendered glow sprites, star field layer.
 */

const CELL_SIZE = 40;

export class SpatialHash {
  constructor() {
    this.cells = new Map();
  }

  clear() {
    this.cells.clear();
  }

  _key(x, y) {
    const cx = (x / CELL_SIZE) | 0;
    const cy = (y / CELL_SIZE) | 0;
    return (cx * 73856093) ^ (cy * 19349669);
  }

  insert(p) {
    const k = this._key(p.x, p.y);
    let arr = this.cells.get(k);
    if (!arr) {
      arr = [];
      this.cells.set(k, arr);
    }
    arr.push(p);
  }

  query(x, y, radius) {
    const result = [];
    const r2 = radius * radius;
    const minCx = ((x - radius) / CELL_SIZE) | 0;
    const maxCx = ((x + radius) / CELL_SIZE) | 0;
    const minCy = ((y - radius) / CELL_SIZE) | 0;
    const maxCy = ((y + radius) / CELL_SIZE) | 0;
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const k = (cx * 73856093) ^ (cy * 19349669);
        const arr = this.cells.get(k);
        if (!arr) continue;
        for (let i = 0; i < arr.length; i++) {
          const p = arr[i];
          const dx = p.x - x;
          const dy = p.y - y;
          if (dx * dx + dy * dy <= r2) result.push(p);
        }
      }
    }
    return result;
  }
}

let nextId = 0;

export class Particle {
  constructor(x, y, opts = {}) {
    this.id = nextId++;
    this.x = x;
    this.y = y;
    this.px = x - (opts.vx || 0);
    this.py = y - (opts.vy || 0);
    this.generation = opts.generation || 0;
    this.radius = opts.radius || 2;
    this.mass = opts.mass || 1;
    this.life = 1.0;
    this.maxLife = 1.0;
    this.decay = opts.decay || 0;
    this.hue = opts.hue || 174;
    this.saturation = opts.saturation || 70;
    this.lightness = opts.lightness || 55;
    this.alpha = opts.alpha || 0.8;
    this.isMemory = opts.isMemory || false;
    this.memoryId = opts.memoryId || null;
    this.targetX = null;
    this.targetY = null;
    this.targetForce = 0;
    this.breathPhase = Math.random() * Math.PI * 2;
    this.birthTime = performance.now();
    this.trail = [];
    this.maxTrail = opts.maxTrail || 6;
  }

  verletStep(dt, damping) {
    const vx = (this.x - this.px) * damping;
    const vy = (this.y - this.py) * damping;
    this.px = this.x;
    this.py = this.y;
    this.x += vx;
    this.y += vy;
  }

  addForce(fx, fy) {
    this.x += fx;
    this.y += fy;
  }

  updateTrail() {
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrail) {
      this.trail.pop();
    }
  }
}

export class ParticlePool {
  constructor(maxParticles = 600) {
    this.particles = [];
    this.max = maxParticles;
    this.hash = new SpatialHash();
  }

  add(x, y, opts) {
    if (this.particles.length >= this.max) return null;
    const p = new Particle(x, y, opts);
    this.particles.push(p);
    return p;
  }

  remove(p) {
    const idx = this.particles.indexOf(p);
    if (idx >= 0) {
      this.particles[idx] = this.particles[this.particles.length - 1];
      this.particles.pop();
    }
  }

  rebuild() {
    this.hash.clear();
    for (let i = 0; i < this.particles.length; i++) {
      this.hash.insert(this.particles[i]);
    }
  }

  query(x, y, r) {
    return this.hash.query(x, y, r);
  }

  get count() {
    return this.particles.length;
  }
}

/*
 * Pre-rendered glow sprite for non-memory particles.
 * Avoids creating radialGradient per particle per frame.
 */
let _glowCanvas = null;
let _glowSize = 0;

export function getGlowSprite(size) {
  if (_glowCanvas && _glowSize === size) return _glowCanvas;
  _glowSize = size;
  _glowCanvas = document.createElement("canvas");
  const s = size * 2;
  _glowCanvas.width = s;
  _glowCanvas.height = s;
  const ctx = _glowCanvas.getContext("2d");
  const grad = ctx.createRadialGradient(size, size, 0, size, size, Math.max(0.001, size));
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.3)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, s, s);
  return _glowCanvas;
}

/*
 * Star field — multi-layered background with Milky Way band,
 * colored stars, bright stars with diffraction spikes, and parallax depth.
 * Drawn to offscreen canvases per depth layer, composited each frame.
 */

// Star spectral classes with HSL colors
const STAR_COLORS = [
  { h: 220, s: 30, l: 85, weight: 0.35 },  // Blue-white (B/A class)
  { h: 0,   s: 0,  l: 90, weight: 0.30 },  // Pure white (F class)
  { h: 45,  s: 25, l: 85, weight: 0.15 },  // Yellow (G class, like our Sun)
  { h: 25,  s: 40, l: 75, weight: 0.12 },  // Amber/orange (K class)
  { h: 10,  s: 50, l: 65, weight: 0.05 },  // Red (M class)
  { h: 200, s: 40, l: 90, weight: 0.03 },  // Blue (O class, hot)
];

function pickStarColor() {
  let r = Math.random();
  for (const c of STAR_COLORS) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return STAR_COLORS[0];
}

export class StarField {
  constructor(w, h) {
    this.layers = []; // 3 depth layers
    // Two canvases per layer: static (pre-rendered) and twinkle (redrawn periodically)
    this.staticCanvases = [];
    this.twinkleCanvases = [];
    this.w = 0;
    this.h = 0;
    this.phase = 0;
    this.lastTwinklePhase = -1;
    this.shootingStars = [];
    this.nextShootingStarTime = 15000 + Math.random() * 20000;
    this.shootingStarTimer = 0;
    this._generate(w, h);
  }

  _generate(w, h) {
    this.w = w;
    this.h = h;
    this.layers = [];
    this.staticCanvases = [];
    this.twinkleCanvases = [];

    // Milky Way band parameters — diagonal across screen
    const mwAngle = Math.PI * 0.22;
    const mwCos = Math.cos(mwAngle);
    const mwSin = Math.sin(mwAngle);
    const mwWidth = Math.max(w, h) * 0.18;

    // Pre-compute Milky Way patch positions (deterministic per generate)
    this._mwPatches = [];
    const mwCx = w / 2;
    const mwCy = h / 2;
    const mwLen = Math.max(w, h) * 0.8;
    for (let i = 0; i < 8; i++) {
      const t = (i / 7 - 0.5) * mwLen;
      const scatter = (Math.random() - 0.5) * mwWidth * 0.5;
      this._mwPatches.push({
        x: mwCx + Math.cos(mwAngle) * t + Math.sin(mwAngle) * scatter,
        y: mwCy + Math.sin(mwAngle) * t - Math.cos(mwAngle) * scatter,
        r: mwWidth * (0.5 + Math.random() * 0.8),
      });
    }

    // 3 depth layers: far (most stars, dimmest), mid, near (fewest, brightest)
    const layerConfigs = [
      { count: 500, minR: 0.2, maxR: 0.6, minAlpha: 0.08, maxAlpha: 0.25, parallax: 0.03, brightCount: 0 },
      { count: 250, minR: 0.3, maxR: 0.9, minAlpha: 0.15, maxAlpha: 0.4,  parallax: 0.08, brightCount: 5 },
      { count: 100, minR: 0.5, maxR: 1.2, minAlpha: 0.2,  maxAlpha: 0.55, parallax: 0.15, brightCount: 12 },
    ];

    for (const cfg of layerConfigs) {
      const stars = [];

      for (let i = 0; i < cfg.count; i++) {
        let x = Math.random() * w;
        let y = Math.random() * h;

        // Increase density near Milky Way band
        if (Math.random() < 0.35) {
          const cx = w / 2;
          const cy = h / 2;
          const t = (Math.random() - 0.5) * 2 * Math.max(w, h) * 0.7;
          const scatter = (Math.random() - 0.5) * mwWidth;
          x = cx + mwCos * t + mwSin * scatter;
          y = cy + mwSin * t - mwCos * scatter;
          x = ((x % w) + w) % w;
          y = ((y % h) + h) % h;
        }

        const color = pickStarColor();
        stars.push({
          x, y,
          r: cfg.minR + Math.random() * (cfg.maxR - cfg.minR),
          baseAlpha: cfg.minAlpha + Math.random() * (cfg.maxAlpha - cfg.minAlpha),
          twinkleSpeed: 0.3 + Math.random() * 2.5,
          twinkleOffset: Math.random() * Math.PI * 2,
          hue: color.h,
          sat: color.s,
          light: color.l,
          bright: false,
        });
      }

      // Add bright stars with diffraction spikes
      for (let i = 0; i < cfg.brightCount; i++) {
        const color = pickStarColor();
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 1.5 + Math.random() * 1.5,
          baseAlpha: 0.5 + Math.random() * 0.3,
          twinkleSpeed: 0.2 + Math.random() * 1.0,
          twinkleOffset: Math.random() * Math.PI * 2,
          hue: color.h,
          sat: color.s,
          light: color.l,
          bright: true,
          spikeLen: 4 + Math.random() * 8,
          spikeAngle: Math.random() * Math.PI,
        });
      }

      this.layers.push({ stars, parallax: cfg.parallax });

      // Static canvas: Milky Way (far layer only) + non-bright stars at base alpha
      const sc = document.createElement("canvas");
      sc.width = w;
      sc.height = h;
      this.staticCanvases.push(sc);

      // Twinkle canvas: redrawn periodically with current twinkle state
      const tc = document.createElement("canvas");
      tc.width = w;
      tc.height = h;
      this.twinkleCanvases.push(tc);
    }

    // Pre-render static elements once
    this._renderStatic();
  }

  _renderStatic() {
    for (let li = 0; li < this.layers.length; li++) {
      const ctx = this.staticCanvases[li].getContext("2d");
      ctx.clearRect(0, 0, this.w, this.h);

      // Milky Way on far layer only
      if (li === 0) {
        this._renderMilkyWay(ctx);
      }

      // Non-bright stars at their base alpha (no twinkle)
      const layer = this.layers[li];
      for (let i = 0; i < layer.stars.length; i++) {
        const s = layer.stars[i];
        if (s.bright) continue; // bright stars go in twinkle layer only
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue}, ${s.sat}%, ${s.light}%, ${s.baseAlpha})`;
        ctx.fill();
      }
    }
  }

  _renderMilkyWay(ctx) {
    for (const patch of this._mwPatches) {
      const r = Math.max(0.001, patch.r);
      const grad = ctx.createRadialGradient(patch.x, patch.y, 0, patch.x, patch.y, r);
      grad.addColorStop(0, `hsla(220, 20%, 60%, 0.025)`);
      grad.addColorStop(0.4, `hsla(200, 15%, 50%, 0.012)`);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(patch.x - r, patch.y - r, r * 2, r * 2);
    }
  }

  resize(w, h) {
    if (w === this.w && h === this.h) return;
    this._generate(w, h);
  }

  update(dt) {
    // Update shooting stars with fixed threshold
    this.shootingStarTimer += dt;
    if (this.shootingStarTimer > this.nextShootingStarTime) {
      this.shootingStarTimer = 0;
      this.nextShootingStarTime = 15000 + Math.random() * 20000;
      this._spawnShootingStar();
    }

    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const ss = this.shootingStars[i];
      ss.age += dt;
      ss.x += ss.vx * dt * 0.001;
      ss.y += ss.vy * dt * 0.001;
      if (ss.age > ss.lifetime) {
        this.shootingStars.splice(i, 1);
      }
    }
  }

  _spawnShootingStar() {
    const angle = Math.random() * Math.PI * 2;
    const speed = 300 + Math.random() * 400;
    const edge = Math.random();
    let x, y;
    if (edge < 0.25) { x = 0; y = Math.random() * this.h; }
    else if (edge < 0.5) { x = this.w; y = Math.random() * this.h; }
    else if (edge < 0.75) { x = Math.random() * this.w; y = 0; }
    else { x = Math.random() * this.w; y = this.h; }

    this.shootingStars.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      age: 0,
      lifetime: 600 + Math.random() * 600,
      trailLen: 80 + Math.random() * 120,
      hue: Math.random() < 0.3 ? 45 : 200,
    });
  }

  render(phase) {
    this.phase = phase;

    // Throttle twinkle redraws to ~10fps (every 0.1 phase units ≈ 100ms)
    const phaseStep = Math.floor(phase * 10);
    if (phaseStep !== this.lastTwinklePhase) {
      this.lastTwinklePhase = phaseStep;
      this._renderTwinkle(phase);
    }

    return {
      staticLayers: this.staticCanvases,
      twinkleLayers: this.twinkleCanvases,
      parallaxes: this.layers.map(l => l.parallax),
    };
  }

  _renderTwinkle(phase) {
    for (let li = 0; li < this.layers.length; li++) {
      const layer = this.layers[li];
      const ctx = this.twinkleCanvases[li].getContext("2d");
      ctx.clearRect(0, 0, this.w, this.h);

      for (let i = 0; i < layer.stars.length; i++) {
        const s = layer.stars[i];
        const twinkle = Math.sin(phase * s.twinkleSpeed + s.twinkleOffset);

        if (s.bright) {
          // Bright stars: full render with spikes (only 17 total, acceptable)
          const alpha = s.baseAlpha + twinkle * 0.15;
          if (alpha <= 0.01) continue;
          const a = Math.min(1, alpha);

          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${s.hue}, ${s.sat}%, ${s.light}%, ${a})`;
          ctx.fill();

          // Diffraction spikes
          const spikeAlpha = a * 0.4;
          ctx.strokeStyle = `hsla(${s.hue}, ${s.sat}%, ${s.light}%, ${spikeAlpha})`;
          ctx.lineWidth = 0.5;
          for (let j = 0; j < 4; j++) {
            const sa = s.spikeAngle + j * Math.PI / 4;
            const sLen = s.spikeLen * (0.8 + twinkle * 0.2);
            ctx.beginPath();
            ctx.moveTo(s.x - Math.cos(sa) * sLen, s.y - Math.sin(sa) * sLen);
            ctx.lineTo(s.x + Math.cos(sa) * sLen, s.y + Math.sin(sa) * sLen);
            ctx.stroke();
          }

          // Soft glow
          const glowR = Math.max(0.001, s.r * 4);
          const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
          glow.addColorStop(0, `hsla(${s.hue}, ${s.sat}%, ${s.light}%, ${a * 0.3})`);
          glow.addColorStop(1, "transparent");
          ctx.fillStyle = glow;
          ctx.fillRect(s.x - glowR, s.y - glowR, glowR * 2, glowR * 2);
        } else {
          // Non-bright: only draw twinkle delta (additive alpha variation)
          const deltaAlpha = twinkle * 0.15;
          if (Math.abs(deltaAlpha) < 0.02) continue; // skip negligible changes
          const a = Math.min(1, Math.max(0, s.baseAlpha + deltaAlpha)) - s.baseAlpha;
          if (Math.abs(a) < 0.01) continue;
          // For positive delta, draw additive; for negative, we rely on
          // the composite being static + twinkle (twinkle just adds brightness)
          if (a > 0) {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${s.hue}, ${s.sat}%, ${s.light}%, ${a})`;
            ctx.fill();
          }
        }
      }
    }
  }

  drawShootingStars(ctx) {
    for (const ss of this.shootingStars) {
      const progress = ss.age / ss.lifetime;
      const fadeIn = Math.min(1, progress * 5);
      const fadeOut = Math.max(0, 1 - (progress - 0.6) / 0.4);
      const alpha = Math.min(fadeIn, fadeOut) * 0.8;
      if (alpha <= 0) continue;

      const speed = Math.sqrt(ss.vx * ss.vx + ss.vy * ss.vy);
      const nx = -ss.vx / speed;
      const ny = -ss.vy / speed;
      const tailX = ss.x + nx * ss.trailLen;
      const tailY = ss.y + ny * ss.trailLen;

      const grad = ctx.createLinearGradient(ss.x, ss.y, tailX, tailY);
      grad.addColorStop(0, `hsla(${ss.hue}, 30%, 95%, ${alpha})`);
      grad.addColorStop(0.1, `hsla(${ss.hue}, 40%, 85%, ${alpha * 0.6})`);
      grad.addColorStop(1, `hsla(${ss.hue}, 30%, 70%, 0)`);

      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(tailX, tailY);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Head glow
      ctx.beginPath();
      ctx.arc(ss.x, ss.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${ss.hue}, 20%, 95%, ${alpha})`;
      ctx.fill();
    }
  }
}
