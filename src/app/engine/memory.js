"use client";

/*
 * Memory system — content nodes that live inside the organism.
 * Constellation layout: work nodes on chronological spiral, identity at cardinal positions.
 * Flowing connection streams between related nodes.
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
export function textToPositions(text, fontSize, maxWidth, maxHeight, step) {
  const s = step || 3;
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

  for (let y = 0; y < maxHeight; y += s) {
    for (let x = 0; x < maxWidth; x += s) {
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

/* Cardinal positions for identity nodes (angle in radians from east) */
const IDENTITY_ANGLES = {
  coder: 0,                        // east
  builder: Math.PI * 0.33,         // north-east
  musician: Math.PI * 1.5,         // south
  nature: Math.PI * 0.75,          // north-west-ish
  humans: Math.PI * 1.15,          // south-west-ish
  universe: Math.PI * 0.55,        // north
};

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
    this.warmTarget = null;

    // Flowing connection streams (persistent, not temporary trails)
    this.flowStreams = [];

    // Shockwave effects
    this.shockwaves = [];

    for (const m of MEMORIES) {
      this.nodes.set(m.id, {
        ...m,
        particle: null,
        discovered: false,
        musicPlayed: false,
        pulsePhase: Math.random() * Math.PI * 2,
        anchorX: null,
        anchorY: null,
        // Enhanced visual state
        flickerPhase: Math.random() * Math.PI * 2,
        flickerSpeed: 0.8 + Math.random() * 1.5,
        approachGlow: 0, // 0-1: how close cursor is (gravitational lensing)
        resonancePulse: 0, // 0-1: pulse intensity for post-completion resonance
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

  /*
   * Compute constellation layout positions.
   * Root: center. Work: chronological spiral (inner=recent). Identity: cardinal edges.
   */
  computeConstellationLayout(centerX, centerY, radiusX, radiusY) {
    const GOLDEN_ANGLE = 137.508 * (Math.PI / 180);

    // Sort work nodes by year (oldest first = outermost)
    const workNodes = MEMORIES
      .filter(m => m.type === "work")
      .sort((a, b) => (a.year || 2000) - (b.year || 2000));

    const identityNodes = MEMORIES.filter(m => m.type === "identity");

    // Root: center
    const rootNode = this.nodes.get("root");
    if (rootNode) {
      rootNode.anchorX = centerX;
      rootNode.anchorY = centerY;
    }

    // Work nodes: chronological spiral from outer (oldest) to inner (newest)
    // Spread wider across screen — 30-90% of radius
    const workCount = workNodes.length;
    for (let i = 0; i < workCount; i++) {
      const node = this.nodes.get(workNodes[i].id);
      if (!node) continue;
      const t = workCount > 1 ? i / (workCount - 1) : 0.5;
      const r = (0.90 - t * 0.60); // 0.90 → 0.30
      const angle = i * GOLDEN_ANGLE;
      node.anchorX = centerX + Math.cos(angle) * radiusX * r;
      node.anchorY = centerY + Math.sin(angle) * radiusY * r;
    }

    // Identity nodes: pushed to far edges (85-95% radius)
    for (const m of identityNodes) {
      const node = this.nodes.get(m.id);
      if (!node) continue;
      const angle = IDENTITY_ANGLES[m.id] ?? Math.random() * Math.PI * 2;
      const r = 0.85 + Math.random() * 0.10; // 85-95% radius
      node.anchorX = centerX + Math.cos(angle) * radiusX * r;
      node.anchorY = centerY + Math.sin(angle) * radiusY * r;
    }
  }

  checkDwell(cursorX, cursorY, dt) {
    const dwellRadius = this.isTouch ? 100 : 50;
    const dwellThreshold = this.isTouch ? 400 : 500;
    const warmRadius = this.isTouch ? 120 : 100;
    const approachRadius = 250;

    let nearestDist = Infinity;
    let nearest = null;
    let warmNearest = null;
    let warmNearestDist = Infinity;

    for (const [id, node] of this.nodes) {
      if (!node.particle || node.discovered) continue;
      const dx = node.particle.x - cursorX;
      const dy = node.particle.y - cursorY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Approach glow — gravitational lensing effect
      if (dist < approachRadius) {
        node.approachGlow = Math.max(node.approachGlow, 1 - dist / approachRadius);
      } else {
        node.approachGlow *= 0.95; // fade out
      }

      if (dist < dwellRadius && dist < nearestDist) {
        nearestDist = dist;
        nearest = id;
      }
      if (dist < warmRadius && dist < warmNearestDist) {
        warmNearestDist = dist;
        warmNearest = id;
      }
    }

    this.warmTarget = warmNearest;

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

  /* Compute anchor positions for discovered nodes — uses constellation layout */
  computeAnchors(centerX, centerY, radiusX, radiusY) {
    // Use the constellation layout (positions are pre-computed per node type)
    this.computeConstellationLayout(centerX, centerY, radiusX, radiusY);
  }

  discover(id) {
    const node = this.nodes.get(id);
    if (!node || node.discovered) return;
    node.discovered = true;
    this.discovered.add(id);

    // Spawn shockwave from discovery point
    if (node.particle) {
      this.shockwaves.push({
        x: node.particle.x,
        y: node.particle.y,
        radius: 0,
        maxRadius: 400,
        speed: 600, // px/sec
        alpha: 0.8,
        hue: node.particle.hue,
      });
    }

    // Create connection trails
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
          // Also add persistent flow stream
          this._addFlowStream(id, connId);
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

  _addFlowStream(fromId, toId) {
    // Check if stream already exists
    for (const s of this.flowStreams) {
      if ((s.from === fromId && s.to === toId) ||
          (s.from === toId && s.to === fromId)) return;
    }
    this.flowStreams.push({
      from: fromId,
      to: toId,
      particles: [
        { t: 0, speed: 0.15 + Math.random() * 0.1 },
        { t: 0.33, speed: 0.12 + Math.random() * 0.1 },
        { t: 0.66, speed: 0.18 + Math.random() * 0.1 },
      ],
    });
  }

  pulseConnected(id) {
    const connections = _connectionMap.get(id);
    if (!connections) return;
    for (const connId of connections) {
      const node = this.nodes.get(connId);
      if (node?.discovered) {
        node.resonancePulse = 1.0;
      }
    }
  }

  update(dt) {
    // Update temporary connection trails
    for (let i = this.connectionTrails.length - 1; i >= 0; i--) {
      this.connectionTrails[i].age += dt;
      if (this.connectionTrails[i].age > this.connectionTrails[i].maxAge) {
        this.connectionTrails.splice(i, 1);
      }
    }

    // Update node pulse/flicker and resonance decay
    for (const [, node] of this.nodes) {
      if (!node.discovered) {
        node.pulsePhase += dt * 0.002;
        node.flickerPhase += dt * 0.001 * node.flickerSpeed;
      }
      if (node.resonancePulse > 0) {
        node.resonancePulse -= dt * 0.001; // decay over ~1s
        if (node.resonancePulse < 0) node.resonancePulse = 0;
      }
    }

    // Update flow stream particles
    for (const stream of this.flowStreams) {
      for (const p of stream.particles) {
        p.t += dt * 0.001 * p.speed;
        if (p.t > 1) p.t -= 1;
      }
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.speed * dt * 0.001;
      sw.alpha = 0.8 * (1 - sw.radius / sw.maxRadius);
      if (sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(i, 1);
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
