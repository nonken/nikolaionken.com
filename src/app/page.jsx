"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Organism } from "./engine/organism.js";
import { MEMORIES } from "./engine/data.js";

export default function Home() {
  const canvasRef = useRef(null);
  const organismRef = useRef(null);
  const [audioOn, setAudioOn] = useState(false);
  const [ready, setReady] = useState(false);
  const [introPhase, setIntroPhase] = useState("typing"); // typing | breathing | done
  const [discoveredLinks, setDiscoveredLinks] = useState([]);
  const [discoveredLabels, setDiscoveredLabels] = useState([]);
  const audioToggleRef = useRef(null);

  // Typewriter state
  const typewriterRef = useRef(null);
  const introText = "> nikolai onken";

  useEffect(() => {
    const el = typewriterRef.current;
    if (!el) return;
    let i = 0;
    let cancelled = false;
    const timers = [];

    function type() {
      if (cancelled) return;
      if (i < introText.length) {
        el.textContent = introText.slice(0, i + 1);
        i++;
        timers.push(setTimeout(type, 70));
      } else {
        timers.push(setTimeout(() => {
          if (cancelled) return;
          setIntroPhase("breathing");
          timers.push(setTimeout(() => {
            if (cancelled) return;
            setIntroPhase("done");
            setReady(true);
          }, 1200));
        }, 500));
      }
    }
    type();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const org = new Organism(canvas);
    organismRef.current = org;
    org.start();

    // Listen for discovery changes — update links and labels immediately
    org.onDiscoveryChange(() => {
      const positions = org.getDiscoveredPositions();
      setDiscoveredLinks(positions.filter(p => p.url));
      setDiscoveredLabels(positions);
    });

    // Throttled position sync (~100ms) — only updates React state when
    // positions have meaningfully changed (>1px movement detected).
    let lastPositionSnapshot = "";
    const syncInterval = setInterval(() => {
      if (!organismRef.current) return;
      const positions = organismRef.current.getDiscoveredPositions();
      // Cheap change detection: serialize rounded positions
      const snapshot = positions.map(p => `${p.id}:${Math.round(p.x)},${Math.round(p.y)}`).join("|");
      if (snapshot === lastPositionSnapshot) return;
      lastPositionSnapshot = snapshot;
      setDiscoveredLinks(positions.filter(p => p.url));
      setDiscoveredLabels(positions);
    }, 100);

    return () => {
      clearInterval(syncInterval);
      org.destroy();
      organismRef.current = null;
    };
  }, [ready]);

  const toggleAudio = useCallback(() => {
    if (!organismRef.current) return;
    // If audio hasn't been initialized yet, enable it first
    if (!organismRef.current.audioEnabled) {
      organismRef.current.enableAudio();
      setAudioOn(true);
    } else {
      const on = organismRef.current.toggleAudio();
      setAudioOn(on);
    }
  }, []);

  return (
    <>
      {/* Typewriter intro */}
      <div className={`intro ${introPhase === "done" ? "intro--done" : ""} ${introPhase === "breathing" ? "intro--breathing" : ""}`}>
        <div className="intro__content">
          <span className="intro__text" ref={typewriterRef} />
          <span className="intro__cursor" />
        </div>
        {introPhase === "breathing" && (
          <div className="intro__breath" />
        )}
      </div>

      {/* The canvas — the living organism */}
      <canvas
        ref={canvasRef}
        className="organism-canvas"
        aria-label="Interactive particle organism — move cursor to explore, dwell near bright particles to discover content. Use arrow keys to navigate between nodes, Enter to reveal."
      />

      {/* DOM labels for discovered memories (crisp text over canvas) */}
      {discoveredLabels.map((item) => (
        <div
          key={item.id}
          className="memory-label"
          style={{
            left: `${item.x}px`,
            top: `${item.y - 30}px`,
          }}
        >
          <span className="memory-label__name">{item.label}</span>
          {item.desc && <span className="memory-label__desc">{item.desc}</span>}
        </div>
      ))}

      {/* Clickable link overlays for discovered memories with URLs */}
      {discoveredLinks.map((link) => (
        <a
          key={link.id}
          className="memory-link"
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            left: `${link.x}px`,
            top: `${link.y + 20}px`,
          }}
          aria-label={`${link.label}${link.desc ? ": " + link.desc : ""}`}
        >
          {link.url.replace(/^https?:\/\//, "").replace(/\/$/, "")} &rarr;
        </a>
      ))}

      {/* Accessible content (screen readers) */}
      <div className="sr-only" role="list" aria-label="Nikolai Onken — projects and identity">
        {MEMORIES.map((m) => (
          <div key={m.id} role="listitem">
            <strong>{m.label}</strong>
            {m.desc && <span>: {m.desc}</span>}
            {m.url && (
              <a href={m.url} target="_blank" rel="noopener noreferrer">
                {m.url}
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Audio toggle */}
      {ready && (
        <button
          ref={audioToggleRef}
          className={`audio-toggle ${audioOn ? "audio-toggle--active" : ""}`}
          onClick={toggleAudio}
          aria-label={audioOn ? "Disable ambient sound" : "Enable ambient sound"}
        >
          {audioOn ? "sound: on" : "sound: off"}
        </button>
      )}

      {/* Footer */}
      <footer className="footer">
        <span>&copy; {new Date().getFullYear()} Nikolai Onken</span>
        <Link href="/text" className="footer__text-link">[text version]</Link>
      </footer>
    </>
  );
}
