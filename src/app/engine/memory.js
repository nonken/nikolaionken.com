"use client";

/*
 * Memory system — content nodes that live inside the organism.
 * Memory particles are heavier, glow brighter, and reveal content when dwelled upon.
 * Text-to-particle mapping: renders text to offscreen canvas, samples pixel positions.
 */

export const MEMORIES = [
  {
    id: "root",
    label: "nikolai onken",
    desc: "Coder, builder, musician. Lover of nature, humans, and the universe.",
    type: "root",
    connections: ["asymmetric", "cloud9", "uxebu", "warpmetrics", "coder"],
  },
  {
    id: "asymmetric",
    label: "Asymmetric",
    desc: "CTO — crypto-focused investment firm",
    url: "https://asymmetric.financial/",
    type: "work",
    connections: ["mintline", "dailydots", "nangu"],
  },
  {
    id: "warpmetrics",
    label: "WarpMetrics",
    desc: "AI-powered coding agents",
    url: "https://warpmetrics.com/",
    type: "work",
    connections: ["coder"],
  },
  {
    id: "dailydots",
    label: "DailyDots",
    url: "https://www.dailydots.com/",
    type: "work",
    connections: [],
  },
  {
    id: "mintline",
    label: "Mintline.ai",
    desc: "AI-powered financial reconciliation",
    url: "https://mintline.ai/",
    type: "work",
    connections: [],
  },
  {
    id: "cloud9",
    label: "Cloud9 IDE",
    desc: "Site lead — established the Amsterdam office. Acquired by AWS in 2016",
    url: "https://c9.io",
    type: "work",
    connections: ["aws"],
  },
  {
    id: "aws",
    label: "AWS",
    desc: "Site lead, Amsterdam (Cloud9)",
    url: "https://aws.amazon.com/cloud9/",
    type: "work",
    connections: [],
  },
  {
    id: "nangu",
    label: "Nangu.eco",
    desc: "Co-founder",
    url: "https://nangu.eco/",
    type: "work",
    connections: ["baseline"],
  },
  {
    id: "baseline",
    label: "Baseline.dev",
    url: "https://baseline.dev/",
    type: "work",
    connections: ["saasmanual"],
  },
  {
    id: "saasmanual",
    label: "SaaS Manual",
    desc: "Learn how to build SaaS products from scratch",
    url: "https://saasmanual.com/",
    type: "work",
    connections: [],
  },
  {
    id: "uxebu",
    label: "uxebu",
    desc: "Co-founder — web & mobile development consultancy",
    url: "http://uxebu.com",
    type: "work",
    connections: ["bonsaijs"],
  },
  {
    id: "bonsaijs",
    label: "BonsaiJS",
    desc: "Open source HTML5 graphics library",
    type: "work",
    connections: ["dojo"],
  },
  {
    id: "dojo",
    label: "Dojo Toolkit",
    desc: "Committer & community evangelist",
    url: "https://dojotoolkit.org",
    type: "work",
    connections: [],
  },
  {
    id: "coder",
    label: "Coder",
    type: "identity",
    connections: ["builder"],
  },
  {
    id: "builder",
    label: "Builder",
    type: "identity",
    connections: ["musician"],
  },
  {
    id: "musician",
    label: "Musician",
    type: "identity",
    connections: ["nature", "humans"],
  },
  {
    id: "nature",
    label: "Nature",
    type: "identity",
    connections: ["universe", "humans"],
  },
  {
    id: "humans",
    label: "Humans",
    type: "identity",
    connections: [],
  },
  {
    id: "universe",
    label: "Universe",
    type: "identity",
    connections: [],
  },
];

/* Generate a musical signature from a string (character → pitch indices) */
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
  const step = 3; // sample every 3 pixels for density

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

export class MemorySystem {
  constructor() {
    this.nodes = new Map();
    this.discovered = new Set();
    this.activeNode = null;
    this.previousNode = null;
    this.dwellTime = 0;
    this.dwellTarget = null;
    this.textParticles = []; // target positions for text formation
    this.formingText = false;
    this.connectionTrails = []; // active connection visualizations

    for (const m of MEMORIES) {
      this.nodes.set(m.id, {
        ...m,
        particle: null, // will be assigned by organism
        discovered: false,
        musicPlayed: false,
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
    let nearestDist = Infinity;
    let nearest = null;

    for (const [id, node] of this.nodes) {
      if (!node.particle) continue;
      const dx = node.particle.x - cursorX;
      const dy = node.particle.y - cursorY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 50 && dist < nearestDist) {
        nearestDist = dist;
        nearest = id;
      }
    }

    if (nearest && nearest === this.dwellTarget) {
      this.dwellTime += dt;
      if (this.dwellTime > 800 && !this.nodes.get(nearest).discovered) {
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

    // Track for connection visualization
    if (this.activeNode) {
      this.previousNode = this.activeNode;
      // Check if there's a connection
      const prev = this.nodes.get(this.previousNode);
      if (prev && prev.connections.includes(id)) {
        this.connectionTrails.push({
          from: this.previousNode,
          to: id,
          age: 0,
          maxAge: 3000,
        });
      }
    }
    this.activeNode = id;

    return node;
  }

  update(dt) {
    // Age connection trails
    for (let i = this.connectionTrails.length - 1; i >= 0; i--) {
      this.connectionTrails[i].age += dt;
      if (this.connectionTrails[i].age > this.connectionTrails[i].maxAge) {
        this.connectionTrails.splice(i, 1);
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
