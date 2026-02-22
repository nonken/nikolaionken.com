"use client";

/*
 * Memory system — content nodes that live inside the organism.
 * Memory particles are heavier, glow brighter, and reveal content when dwelled upon.
 * Text-to-particle mapping: renders text to offscreen canvas, samples pixel positions.
 */

import { MEMORIES } from "./data.js";
export { MEMORIES };

/* Generate a musical signature from a string (character -> pitch indices) */
export function stringToMelody(str) {
  const notes = [];
  const clean = str.toLowerCase().replace(/[^a-z]/g, "");
  for (let i = 0; i < Math.min(clean.length, 5); i++) {
    notes.push((clean.charCodeAt(i) - 97) % 12);
  }
  return notes;
}

/* Sample text as particle positions using offscreen canvas */
export function textToPositions(text, fontSize, maxWidth, maxHeight) {
  const canvas = document.createElement("canvas");
  canvas.width = maxWidth;
  canvas.height = maxHeight;
  const ctx = canvas.getContext("2d");
  ctx.font = `bold ${fontSize}px "Space Grotesk", sans-serif`;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, maxWidth / 2, maxHeight / 2);

  const imageData = ctx.getImageData(0, 0, maxWidth, maxHeight);
  const positions = [];
  const step = 3;

  for (let y = 0; y < maxHeight; y += step) {
    for (let x = 0; x < maxWidth; x += step) {
      const i = (y * maxWidth + x) * 4;
      if (imageData.data[i + 3] > 128) {
        positions.push({ x, y });
      }
    }
  }

  return positions;
}

/* Build a bidirectional connection lookup for fast querying */
const _connectionMap = new Map();
for (const m of MEMORIES) {
  if (!_connectionMap.has(m.id)) _connectionMap.set(m.id, new Set());
  for (const c of m.connections) {
    _connectionMap.get(m.id).add(c);
    if (!_connectionMap.has(c)) _connectionMap.set(c, new Set());
    _connectionMap.get(c).add(m.id);
  }
}

export class MemorySystem {
  constructor() {
    this.nodes = new Map();
    this.discovered = new Set();
    this.activeNode = null;
    this.previousNode = null;
    this.dwellTime = 0;
    this.dwellTarget = null;
    this.textParticles = [];
    this.formingText = false;
    this.connectionTrails = [];
    this.isTouch = false;

    for (const m of MEMORIES) {
      this.nodes.set(m.id, {
        ...m,
        particle: null,
        discovered: false,
        musicPlayed: false,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  assignParticle(memoryId, particle) {
    const node = this.nodes.get(memoryId);
    if (node) {
      node.particle = particle;
      particle.isMemory = true;
      particle.memoryId = memoryId;
      particle.mass = 3;
      particle.radius = node.type === "root" ? 5 : 3.5;
    }
  }

  checkDwell(cursorX, cursorY, dt) {
    const dwellRadius = this.isTouch ? 80 : 50;
    const dwellThreshold = this.isTouch ? 600 : 800;

    let nearestDist = Infinity;
    let nearest = null;

    for (const [id, node] of this.nodes) {
      if (!node.particle) continue;
      const dx = node.particle.x - cursorX;
      const dy = node.particle.y - cursorY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < dwellRadius && dist < nearestDist) {
        nearestDist = dist;
        nearest = id;
      }
    }

    if (nearest && nearest === this.dwellTarget) {
      this.dwellTime += dt;
      if (this.dwellTime > dwellThreshold && !this.nodes.get(nearest).discovered) {
        this.discover(nearest);
      }
    } else {
      this.dwellTarget = nearest;
      this.dwellTime = 0;
    }

    return nearest;
  }

  discover(id) {
    const node = this.nodes.get(id);
    if (!node || node.discovered) return;
    node.discovered = true;
    this.discovered.add(id);

    const connections = _connectionMap.get(id);
    if (connections) {
      for (const connId of connections) {
        if (this.discovered.has(connId)) {
          this.connectionTrails.push({
            from: id,
            to: connId,
            age: 0,
            maxAge: 3000,
          });
        }
      }
    }

    this.previousNode = this.activeNode;
    this.activeNode = id;

    if (this.isTouch && navigator.vibrate) {
      navigator.vibrate(10);
    }

    return node;
  }

  update(dt) {
    for (let i = this.connectionTrails.length - 1; i >= 0; i--) {
      this.connectionTrails[i].age += dt;
      if (this.connectionTrails[i].age > this.connectionTrails[i].maxAge) {
        this.connectionTrails.splice(i, 1);
      }
    }

    for (const [, node] of this.nodes) {
      if (!node.discovered) {
        node.pulsePhase += dt * 0.002;
      }
    }
  }

  getDiscoveredContent() {
    const content = [];
    for (const id of this.discovered) {
      const node = this.nodes.get(id);
      if (node) content.push(node);
    }
    return content;
  }
}
