"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Organism } from "./engine/organism.js";
import { MEMORIES } from "./engine/data.js";

export default function Home() {
  const canvasRef = useRef(null);
  const organismRef = useRef(null);
  const [audioOn, setAudioOn] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const [discoveredLinks, setDiscoveredLinks] = useState([]);
  const [discoveredLabels, setDiscoveredLabels] = useState([]);
  const [discoveryCount, setDiscoveryCount] = useState({ discovered: 0, total: MEMORIES.length });
  const [showHint, setShowHint] = useState(false);
  const [showAudioHint, setShowAudioHint] = useState(false);
  const audioToggleRef = useRef(null);
  const hintDismissedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const org = new Organism(canvas);
    organismRef.current = org;
    org.start();

    // Intro complete callback — show UI elements
    org.onIntroComplete(() => {
      setIntroComplete(true);
    });

    // Show discovery hint after intro + a bit of settle time
    const hintTimer = setTimeout(() => {
      if (!hintDismissedRef.current) setShowHint(true);
    }, 10000); // 10s from start (intro is ~8s)
    const hintFadeTimer = setTimeout(() => {
      setShowHint(false);
    }, 16000);

    // Discovery changes
    org.onDiscoveryChange(() => {
      const positions = org.getDiscoveredPositions();
      setDiscoveredLinks(positions.filter(p => p.url));
      setDiscoveredLabels(positions);
      setDiscoveryCount(org.getDiscoveryCount());

      if (!hintDismissedRef.current) {
        hintDismissedRef.current = true;
        setShowHint(false);
        setShowAudioHint(true);
        setTimeout(() => setShowAudioHint(false), 4000);
      }
    });

    // Throttled position sync
    let lastPositionSnapshot = "";
    const syncInterval = setInterval(() => {
      if (!organismRef.current) return;
      const positions = organismRef.current.getDiscoveredPositions();
      const snapshot = positions.map(p => `${p.id}:${Math.round(p.x)},${Math.round(p.y)}`).join("|");
      if (snapshot === lastPositionSnapshot) return;
      lastPositionSnapshot = snapshot;
      setDiscoveredLinks(positions.filter(p => p.url));
      setDiscoveredLabels(positions);
    }, 100);

    return () => {
      clearTimeout(hintTimer);
      clearTimeout(hintFadeTimer);
      clearInterval(syncInterval);
      org.destroy();
      organismRef.current = null;
    };
  }, []);

  const toggleAudio = useCallback(() => {
    if (!organismRef.current) return;
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
      {/* The canvas — the living constellation */}
      <canvas
        ref={canvasRef}
        className="organism-canvas"
        aria-label="Interactive particle constellation — move cursor to explore, dwell near bright particles to discover content. Use arrow keys to navigate between nodes, Enter to reveal."
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

      {/* Discovery hint — only shows after intro */}
      {introComplete && (
        <div className={`discovery-hint ${showHint ? "discovery-hint--visible" : ""}`}>
          hover near the bright particles to discover
        </div>
      )}

      {/* Audio toggle — integrated cosmic style */}
      {introComplete && (
        <div className="audio-toggle-wrap">
          <button
            ref={audioToggleRef}
            className={`audio-toggle ${audioOn ? "audio-toggle--active" : ""} ${showAudioHint ? "audio-toggle--pulse" : ""}`}
            onClick={toggleAudio}
            aria-label={audioOn ? "Disable ambient sound" : "Enable ambient sound"}
          >
            <span className="audio-toggle__icon">{audioOn ? "\u266B" : "\u266A"}</span>
            {audioOn ? "sound: on" : "sound: off"}
          </button>
          {showAudioHint && <span className="audio-toggle__hint">try sound</span>}
        </div>
      )}

      {/* Minimal footer — satellite style */}
      <footer className="footer">
        <span className="footer__copyright">&copy; {new Date().getFullYear()} Nikolai Onken</span>
        {discoveryCount.discovered > 0 && (
          <span className="footer__discovery-count">
            {discoveryCount.discovered}/{discoveryCount.total}
          </span>
        )}
        <Link href="/text" className="footer__text-link">[text]</Link>
      </footer>
    </>
  );
}
