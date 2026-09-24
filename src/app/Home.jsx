"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { growRings } from "./rings.js";
import { PROFILE, WORK, ELSEWHERE } from "./content.js";

// The clock is read once on the client; the server render uses the build year.
let clientNow;
const readNow = () => (clientNow ??= new Date());
const noSubscribe = () => () => {};

function yearProgress(now) {
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear() + 1, 0, 1);
  return (now - start) / (end - start);
}

function Arrow() {
  return (
    <svg className="arrow" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M3 9 9 3M4.5 3H9v4.5" />
    </svg>
  );
}

function Slice({ year, fraction, active, onPin }) {
  const g = useMemo(() => growRings({ firstYear: PROFILE.firstYear, lastYear: year }), [year]);

  const pins = useMemo(() => {
    const seen = {};
    return WORK.map((w, i) => {
      const nth = (seen[w.year] = (seen[w.year] ?? -1) + 1);
      return { ...w, pos: g.pinFor(w.year, nth, i) };
    }).filter((p) => p.pos);
  }, [g]);

  const activeItem = pins.find((p) => p.id === active);
  const deg = (g.core.angle * 180) / Math.PI;
  const labelled = new Set([PROFILE.firstYear, 2013, 2018]);
  const [tipX, tipY] = fraction == null ? [0, 0] : g.growingTip(fraction);

  return (
    <svg className="slice" viewBox="0 0 1000 1000" role="img" aria-labelledby="slice-title">
      <title id="slice-title">
        {`A tree cross-section with one growth ring for every year from ${PROFILE.firstYear} to ${year}, each project pinned in the year it began.`}
      </title>
      <defs>
        <clipPath id="grow">
          <circle className="slice__grow" cx={g.pith.x} cy={g.pith.y} r="560" />
        </clipPath>
        <clipPath id="bark">
          <path d={g.bark.outer} />
        </clipPath>
        <clipPath id="wood">
          <path d={g.bark.inner} />
        </clipPath>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9 0.55" numOctaves="3" seed="11" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.24  0 0 0 0 0.12  0 0 0 0 0.05  1.9 0 0 0 -0.92"
          />
        </filter>
      </defs>

      <g clipPath="url(#grow)">
        <path d={g.bark.outer} fill="var(--bark)" />
        <g clipPath="url(#bark)">
          {g.bark.fissures.map((f, i) => (
            <line key={i} x1={f.x1} y1={f.y1} x2={f.x2} y2={f.y2} stroke={f.light ? "#8a5a38" : "#24140a"} strokeOpacity={f.light ? 0.5 : 0.6} strokeWidth={f.w} strokeLinecap="round" />
          ))}
        </g>
        <path d={g.bark.inner} fill="var(--bark-inner)" />
        {g.discs.map((d, i) => (
          <path key={i} d={d.d} fill={d.fill} />
        ))}
        <g clipPath="url(#wood)">
          <rect width="1000" height="1000" filter="url(#grain)" opacity="0.55" />
          {g.rays.map((r, i) => (
            <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke="#fff4e0" strokeOpacity={r.o} strokeWidth="1.1" />
          ))}
        </g>
        <path d={g.check} fill="var(--bark)" />
        <circle cx={g.pith.x} cy={g.pith.y} r={g.pith.r} fill="var(--bark)" />
      </g>

      <g className="slice__bands">
        {Object.entries(g.bands).map(([y, d]) => (
          <path
            key={y}
            d={d}
            fillRule="evenodd"
            className="slice__band"
            data-on={activeItem?.year === Number(y) ? "" : undefined}
          />
        ))}
      </g>

      {fraction != null && (
        <g className="slice__growing">
          <path d={g.growingArc(fraction)} pathLength="1" className="slice__arc" />
          <path d={g.growingRest(fraction)} className="slice__rest" />
          <circle cx={tipX} cy={tipY} r="7" className="slice__tip" />
        </g>
      )}

      <g className="slice__pencil">
        <line x1={g.core.x1} y1={g.core.y1} x2={g.core.barkX} y2={g.core.barkY} />
        <line x1={g.core.barkX} y1={g.core.barkY} x2={g.core.x2} y2={g.core.y2} className="slice__outside" />
        {g.core.ticks.map((t) => (
          <line key={t.year} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
        ))}
        {g.core.ticks
          .filter((t) => labelled.has(t.year))
          .map((t) => {
            const nx = t.x + Math.sin(g.core.angle) * 34;
            const ny = t.y - Math.cos(g.core.angle) * 34;
            return (
              <text key={t.year} className={t.year === PROFILE.firstYear ? undefined : "slice__minor"} transform={`translate(${nx.toFixed(1)} ${ny.toFixed(1)}) rotate(${deg.toFixed(1)})`} textAnchor="middle" dominantBaseline="middle">
                {t.year}
              </text>
            );
          })}
        <text
          className="slice__end"
          transform={`translate(${g.core.endX.toFixed(1)} ${g.core.endY.toFixed(1)}) rotate(${deg.toFixed(1)})`}
          dominantBaseline="middle"
        >
          {year}
        </text>
      </g>

      <g className="slice__pins">
        {pins.map((p) => (
          <circle
            key={p.id}
            cx={p.pos.x}
            cy={p.pos.y}
            r={p.id === active ? 12 : 8}
            className="slice__pin"
            data-on={p.id === active ? "" : undefined}
            onMouseEnter={() => onPin(p.id)}
            onMouseLeave={() => onPin(null)}
            onClick={() => onPin(p.id === active ? null : p.id)}
          />
        ))}
      </g>

      {activeItem && (
        <text
          className="slice__label"
          x={activeItem.pos.x + (activeItem.pos.x > 700 ? -22 : 22)}
          y={activeItem.pos.y}
          textAnchor={activeItem.pos.x > 700 ? "end" : "start"}
          dominantBaseline="middle"
        >
          <tspan className="slice__label-year">{activeItem.year}</tspan>
          <tspan dx="12">{activeItem.name}</tspan>
        </text>
      )}
    </svg>
  );
}

export default function Home({ buildYear }) {
  const now = useSyncExternalStore(noSubscribe, readNow, () => null);
  const year = now ? now.getFullYear() : buildYear;
  const fraction = now ? yearProgress(now) : null;
  const [active, setActive] = useState(null);

  const firstOfYear = (w, i) => i === 0 || WORK[i - 1].year !== w.year;

  return (
    <div className="page">
      <figure className="art">
        <Slice year={year} fraction={fraction} active={active} onPin={setActive} />
        <figcaption className="art__caption">
          One ring for every year since {PROFILE.firstYear}. The outer ring is {year}, still
          growing{fraction != null && <>: {Math.round(fraction * 100)}% of the way round</>}.
        </figcaption>
      </figure>

      <main className="text">
        <header className="intro">
          <h1>{PROFILE.name}</h1>
          <p className="intro__lede">{PROFILE.lede}</p>
          <p className="intro__now">
            {PROFILE.now.text}{" "}
            <a href={PROFILE.now.url} target="_blank" rel="noopener noreferrer">
              {PROFILE.now.label}
            </a>
            {PROFILE.now.label.endsWith(".") ? "" : "."}
          </p>
        </header>

        <section aria-labelledby="work-title">
          <h2 id="work-title">Work</h2>
          <ol className="work" onMouseLeave={() => setActive(null)}>
            {WORK.map((w, i) => (
              <li
                key={w.id}
                className="work__item"
                data-on={active === w.id ? "" : undefined}
                onMouseEnter={() => setActive(w.id)}
                onFocus={() => setActive(w.id)}
                onBlur={() => setActive(null)}
              >
                <span className="work__year" data-repeat={firstOfYear(w, i) ? undefined : ""}>
                  {w.year}
                </span>
                <p className="work__body">
                  {w.url ? (
                    <a className="work__name" href={w.url} target="_blank" rel="noopener noreferrer">
                      {w.name}
                      <Arrow />
                    </a>
                  ) : (
                    <span className="work__name">{w.name}</span>
                  )}
                  {w.note && <span className="work__note"> {w.note}</span>}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="elsewhere-title">
          <h2 id="elsewhere-title">Elsewhere</h2>
          <ul className="elsewhere">
            {ELSEWHERE.map((l) => (
              <li key={l.label}>
                <a href={l.url} target="_blank" rel="noopener noreferrer">
                  {l.label}
                  <Arrow />
                </a>
              </li>
            ))}
          </ul>
        </section>

        <footer className="colophon">&copy; {year} {PROFILE.name}</footer>
      </main>
    </div>
  );
}
