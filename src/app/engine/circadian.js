"use client";

/*
 * Circadian rhythm — the organism changes with the time of day.
 * Returns color palette, physics parameters, and music mood.
 */

const PHASES = [
  {
    name: "night",
    start: 20,
    end: 5,
    bg: [10, 10, 15],
    primary: { h: 174, s: 70, l: 55 },    // deep teal bioluminescence
    secondary: { h: 220, s: 60, l: 40 },   // midnight blue
    accent: { h: 174, s: 80, l: 65 },
    particleSpeed: 0.6,
    breathRate: 0.3,
    trailLength: 10,
    musicMood: "ambient",
    glowIntensity: 0.6,
    scale: "aeolian",
  },
  {
    name: "dawn",
    start: 5,
    end: 8,
    bg: [15, 12, 18],
    primary: { h: 30, s: 70, l: 60 },      // warm amber
    secondary: { h: 340, s: 40, l: 45 },    // rose
    accent: { h: 45, s: 80, l: 70 },
    particleSpeed: 0.8,
    breathRate: 0.5,
    trailLength: 8,
    musicMood: "contemplative",
    glowIntensity: 0.5,
    scale: "pentatonic",
  },
  {
    name: "day",
    start: 8,
    end: 17,
    bg: [10, 12, 18],
    primary: { h: 174, s: 75, l: 58 },     // bright teal
    secondary: { h: 160, s: 50, l: 45 },    // sea green
    accent: { h: 45, s: 90, l: 65 },        // gold
    particleSpeed: 1.0,
    breathRate: 0.7,
    trailLength: 6,
    musicMood: "rhythmic",
    glowIntensity: 0.4,
    scale: "major",
  },
  {
    name: "dusk",
    start: 17,
    end: 20,
    bg: [18, 10, 20],
    primary: { h: 280, s: 50, l: 50 },     // purple
    secondary: { h: 340, s: 60, l: 50 },    // rose-pink
    accent: { h: 30, s: 80, l: 55 },        // amber
    particleSpeed: 0.75,
    breathRate: 0.4,
    trailLength: 9,
    musicMood: "melancholic",
    glowIntensity: 0.55,
    scale: "dorian",
  },
];

function inRange(hour, start, end) {
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end; // wraps midnight
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(c1, c2, t) {
  // Handle hue wrapping
  let dh = c2.h - c1.h;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  return {
    h: (c1.h + dh * t + 360) % 360,
    s: lerp(c1.s, c2.s, t),
    l: lerp(c1.l, c2.l, t),
  };
}

export function getCircadianProfile() {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;

  // Find current and next phase
  let current = PHASES[0]; // default night
  let next = PHASES[1];
  for (let i = 0; i < PHASES.length; i++) {
    if (inRange(hour, PHASES[i].start, PHASES[i].end)) {
      current = PHASES[i];
      next = PHASES[(i + 1) % PHASES.length];
      break;
    }
  }

  // Calculate blend factor within current phase
  let duration, elapsed;
  if (current.start < current.end) {
    duration = current.end - current.start;
    elapsed = hour - current.start;
  } else {
    duration = (24 - current.start) + current.end;
    elapsed = hour >= current.start ? hour - current.start : hour + (24 - current.start);
  }

  // Blend near edges for smooth transitions
  const t = elapsed / duration;
  const edgeFade = t > 0.7 ? (t - 0.7) / 0.3 : 0;

  return {
    name: current.name,
    bg: current.bg.map((v, i) => Math.round(lerp(v, next.bg[i], edgeFade))),
    primary: lerpColor(current.primary, next.primary, edgeFade),
    secondary: lerpColor(current.secondary, next.secondary, edgeFade),
    accent: lerpColor(current.accent, next.accent, edgeFade),
    particleSpeed: lerp(current.particleSpeed, next.particleSpeed, edgeFade),
    breathRate: lerp(current.breathRate, next.breathRate, edgeFade),
    trailLength: Math.round(lerp(current.trailLength, next.trailLength, edgeFade)),
    musicMood: current.musicMood,
    glowIntensity: lerp(current.glowIntensity, next.glowIntensity, edgeFade),
    scale: current.scale,
  };
}

/* Musical scale definitions (semitones from root) */
export const SCALES = {
  major:         [0, 2, 4, 5, 7, 9, 11],
  aeolian:       [0, 2, 3, 5, 7, 8, 10],
  dorian:        [0, 2, 3, 5, 7, 9, 10],
  pentatonic:    [0, 2, 4, 7, 9],
};
