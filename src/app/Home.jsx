"use client";

import { useSyncExternalStore } from "react";
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

// A small growth-ring mark. The outer ring is this year, drawn as far as the year has come.
function Mark({ fraction }) {
  const rings = [4, 7.5, 10.5, 13, 15.5];
  const r = 18.5;
  const a = -Math.PI / 2 + Math.PI * 2 * (fraction ?? 0);
  const x = 20 + r * Math.cos(a);
  const y = 20 + r * Math.sin(a);
  const large = (fraction ?? 0) > 0.5 ? 1 : 0;
  return (
    <svg className="mark" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      {rings.map((rr, i) => (
        <circle key={rr} cx={20 + i * 0.12} cy={20 - i * 0.08} r={rr} />
      ))}
      <circle cx="20" cy="20" r={r} className="mark__rest" />
      {fraction != null && (
        <path className="mark__year" d={`M20 ${20 - r} A${r} ${r} 0 ${large} 1 ${x.toFixed(2)} ${y.toFixed(2)}`} />
      )}
    </svg>
  );
}

export default function Home({ buildYear }) {
  const now = useSyncExternalStore(noSubscribe, readNow, () => null);
  const year = now ? now.getFullYear() : buildYear;
  const fraction = now ? yearProgress(now) : null;
  const firstOfYear = (w, i) => i === 0 || WORK[i - 1].year !== w.year;

  return (
    <main className="page">
      <header className="intro">
        <h1>
          {PROFILE.name}
          <Mark fraction={fraction} />
        </h1>
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
        <ol className="work">
          {WORK.map((w, i) => (
            <li key={w.id} className="work__item">
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

      <footer className="colophon">
        <p>
          &copy; {year} {PROFILE.name}
        </p>
        <p className="colophon__note">
          The mark adds a ring each year since {PROFILE.firstYear}; {year}&rsquo;s is
          {fraction != null ? ` ${Math.round(fraction * 100)}% grown.` : " still growing."}
        </p>
      </footer>
    </main>
  );
}
