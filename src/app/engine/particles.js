"use client";

/*
 * Particle system with Verlet integration and spatial hashing.
 * Each particle stores current + previous position for implicit velocity.
 * Optimized: numeric hash keys, pre-rendered glow sprites.
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
    // Numeric key avoids string allocation in hot path
    const cx = (x / CELL_SIZE) | 0;
    const cy = (y / CELL_SIZE) | 0;
    return cx * 73856093 + cy * 19349669;
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
        const k = cx * 73856093 + cy * 19349669;
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
  const grad = ctx.createRadialGradient(size, size, 0, size, size, size);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.3)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, s, s);
  return _glowCanvas;
}
