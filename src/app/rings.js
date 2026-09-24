/*
 * Growth rings — pure geometry for the cross-section drawing.
 * Deterministic from a seed, so server and client draw the same slice.
 * Coordinates live in a 1000×1000 viewBox.
 */

const TAU = Math.PI * 2;
const STEPS = 240;
const JUVENILE = 7; // thin unlabelled rings before the first year of work
const BARK_OUTER = 452;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) =>
  "#" +
  [0, 1, 2]
    .map((i) => {
      const a = parseInt(c1.slice(1 + i * 2, 3 + i * 2), 16);
      const b = parseInt(c2.slice(1 + i * 2, 3 + i * 2), 16);
      return Math.round(lerp(a, b, t)).toString(16).padStart(2, "0");
    })
    .join("");

// Heartwood is darker and redder; the last few rings are pale sapwood.
const HEART = { early: "#c2804c", late: "#8a4a27" };
const SAP = { early: "#e6bf8c", late: "#bf8550" };

export function growRings({ firstYear, lastYear, seed = 20080101 }) {
  const rand = rng(seed);
  const years = lastYear - firstYear + 1;
  const count = JUVENILE + years;

  // Shared wobble every ring inherits, so the slice reads as one tree.
  const harmonics = [0.034, 0.024, 0.014, 0.007].map((amp, i) => ({
    k: i + 1,
    amp,
    phase: rand() * TAU,
  }));

  const widths = [];
  for (let i = 0; i < count; i++) {
    const juvenile = i < JUVENILE;
    widths.push((juvenile ? 7 : 15) * lerp(0.62, 1.38, rand()));
  }
  const pith = 7;
  const total = widths.reduce((s, w) => s + w, 0);
  const scale = (BARK_OUTER - 30 - pith) / total;

  const center = { x: 486, y: 512 };
  const drift = { x: 22, y: -14 }; // eccentric growth, as in real trunks

  let radius = pith;
  const rings = [];
  for (let i = 0; i < count; i++) {
    const inner = radius;
    const width = widths[i] * scale;
    radius += width;
    const t = radius / BARK_OUTER;
    const jitter = [5, 7, 9].map((k) => ({ k, amp: 0.0035 * rand(), phase: rand() * TAU }));
    const heart = Math.min(1, Math.max(0, (i - (count - 6)) / 3));
    rings.push({
      index: i,
      year: i >= JUVENILE ? firstYear + i - JUVENILE : null,
      inner,
      outer: radius,
      width,
      latewood: width * lerp(0.22, 0.36, rand()),
      cx: center.x + drift.x * t,
      cy: center.y + drift.y * t,
      wobble: lerp(0.35, 1, t),
      jitter,
      early: mix(HEART.early, SAP.early, heart),
      late: mix(HEART.late, SAP.late, heart),
    });
  }

  const shape = (ring, r) => (theta) => {
    let f = 1;
    for (const h of harmonics) f += h.amp * ring.wobble * Math.sin(h.k * theta + h.phase);
    for (const j of ring.jitter) f += j.amp * Math.sin(j.k * theta + j.phase);
    if (ring.noise) f += ring.noise(theta);
    const rr = r * f;
    return [ring.cx + rr * Math.cos(theta), ring.cy + rr * Math.sin(theta)];
  };

  const loop = (fn, from = 0, to = TAU, steps = STEPS) => {
    const n = Math.max(2, Math.round((steps * (to - from)) / TAU));
    let d = "";
    for (let s = 0; s <= n; s++) {
      const [x, y] = fn(from + ((to - from) * s) / n);
      d += (s ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    }
    return d;
  };

  const closed = (fn) => loop(fn, 0, TAU, STEPS) + "Z";

  const last = rings[rings.length - 1];
  // Bark: its own uneven thickness, and a rough edge from seeded value noise.
  // Notch spacing and depth vary, and a slow envelope leaves some stretches smooth.
  const knots = 96;
  const notch = Array.from({ length: knots }, () => Math.pow(rand(), 1.6));
  const envelope = Array.from({ length: 7 }, () => Math.max(0, lerp(-0.4, 1.2, rand())));
  const periodic = (values, theta) => {
    const u = ((((theta / TAU) % 1) + 1) % 1) * values.length;
    const i = Math.floor(u);
    const f = (1 - Math.cos((u - i) * Math.PI)) / 2;
    return lerp(values[i], values[(i + 1) % values.length], f);
  };
  const barkRing = {
    ...last,
    jitter: [2, 3].map((k) => ({ k, amp: 0.008 + 0.006 * rand(), phase: rand() * TAU })),
    noise: (theta) => -0.022 * periodic(notch, theta) * Math.min(1, periodic(envelope, theta)),
  };
  const fissures = Array.from({ length: 150 }, () => {
    const theta = rand() * TAU;
    const [x1, y1] = shape(barkRing, lerp(last.outer + 10, BARK_OUTER - 14, rand()))(theta);
    const [x2, y2] = shape(barkRing, BARK_OUTER + 4)(theta + lerp(-0.012, 0.012, rand()));
    return { x1, y1, x2, y2, w: lerp(1.2, 3.4, rand()), light: rand() < 0.3 };
  });

  const discs = [];
  for (let i = rings.length - 1; i >= 0; i--) {
    const ring = rings[i];
    const growing = i === rings.length - 1;
    // The current year has not laid down its dark latewood yet.
    if (!growing) discs.push({ d: closed(shape(ring, ring.outer)), fill: ring.late });
    discs.push({ d: closed(shape(ring, ring.outer - (growing ? 0 : ring.latewood))), fill: ring.early });
  }

  // A band path per dated ring, for highlighting a year.
  const bands = {};
  for (const ring of rings) {
    if (ring.year == null) continue;
    const outer = closed(shape(ring, ring.outer));
    const inner = closed(shape(rings[ring.index - 1] ?? ring, ring.inner));
    bands[ring.year] = outer + inner;
  }

  // Latewood of the growing ring, drawn only as far as the year has come.
  const growingPath = shape(last, (last.inner + last.outer) / 2);
  const growingArc = (fraction, start = -Math.PI / 2) => loop(growingPath, start, start + TAU * fraction);
  const growingRest = (fraction, start = -Math.PI / 2) => loop(growingPath, start + TAU * fraction, start + TAU);
  const growingTip = (fraction, start = -Math.PI / 2) => growingPath(start + TAU * fraction);

  // Pencil core line, from the pith out past the bark, with a tick per year.
  const coreAngle = -0.42;
  const cos = Math.cos(coreAngle);
  const sin = Math.sin(coreAngle);
  const at = (ring, r) => shape(ring, r)(coreAngle);
  const ticks = rings
    .filter((r) => r.year != null)
    .map((r) => {
      const [x, y] = at(r, r.outer);
      const len = r.year % 5 === 3 || r.year === firstYear || r.year === lastYear ? 16 : 9;
      return { year: r.year, x, y, x1: x + sin * len, y1: y - cos * len, x2: x - sin * len, y2: y + cos * len };
    });
  const [coreX1, coreY1] = [center.x, center.y];
  const [barkX, barkY] = shape(barkRing, BARK_OUTER)(coreAngle);
  const [coreX2, coreY2] = shape(barkRing, BARK_OUTER + 34)(coreAngle);
  const [endX, endY] = shape(barkRing, BARK_OUTER + 48)(coreAngle);

  // Medullary rays and the drying check give the slice its grain.
  const rays = Array.from({ length: 70 }, () => {
    const theta = rand() * TAU;
    const ring = rings[Math.floor(lerp(JUVENILE, count - 1, rand()))];
    const r0 = ring.outer * lerp(0.2, 0.8, rand());
    const [x1, y1] = shape(ring, r0)(theta);
    const [x2, y2] = shape(last, last.outer * lerp(0.85, 1, rand()))(theta);
    return { x1, y1, x2, y2, o: lerp(0.08, 0.2, rand()) };
  });

  const checkAngle = 2.62;
  const check = (() => {
    const depth = 0.42;
    const pts = [];
    for (let s = 0; s <= 24; s++) {
      const u = s / 24;
      const r = lerp(last.outer + 20, last.outer * (1 - depth), u);
      const half = lerp(0.028, 0.001, Math.pow(u, 0.7));
      const wig = Math.sin(u * 9 + 1.3) * 0.012;
      pts.push({ r, a: checkAngle + wig, half });
    }
    const side = (sign) => pts.map((p) => shape(last, p.r)(p.a + sign * p.half));
    const pathPts = [...side(1), ...side(-1).reverse()];
    return pathPts.map(([x, y], i) => (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1)).join("") + "Z";
  })();

  // Pins: one per project, set mid-band in its year, spread by the golden angle.
  const pinFor = (year, nth, seq) => {
    const ring = rings.find((r) => r.year === year);
    if (!ring) return null;
    let theta = 0.9 + seq * 2.39996 + nth * 0.5;
    theta = ((theta % TAU) + TAU) % TAU;
    const near = (a, b, w) => Math.abs(((a - b + Math.PI * 3) % TAU) - Math.PI) < w;
    for (let guard = 0; guard < 12 && (near(theta, (coreAngle + TAU) % TAU, 0.32) || near(theta, checkAngle, 0.22)); guard++) {
      theta += 0.37;
    }
    const [x, y] = shape(ring, (ring.inner + ring.outer) / 2)(theta);
    return { x, y, theta };
  };

  return {
    bark: {
      outer: closed(shape(barkRing, BARK_OUTER)),
      inner: closed(shape(barkRing, last.outer + 9)),
      fissures,
    },
    discs,
    bands,
    growingArc,
    growingRest,
    growingTip,
    core: { x1: coreX1, y1: coreY1, barkX, barkY, x2: coreX2, y2: coreY2, endX, endY, ticks, angle: coreAngle },
    rays,
    check,
    pith: { x: center.x, y: center.y, r: pith },
    pinFor,
  };
}
