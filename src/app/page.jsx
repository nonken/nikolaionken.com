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
  const [hintText, setHintText] = useState("hover near the bright particles to discover");
  const [constellationComplete, setConstellationComplete] = useState(false);
  const [showCompleteMsg, setShowCompleteMsg] = useState(false);
  const [showCircadianHint, setShowCircadianHint] = useState(false);
  const audioToggleRef = useRef(null);
  const hintDismissedRef = useRef(false);
  const secondHintShownRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const org = new Organism(canvas);
    organismRef.current = org;
    org.start();
    const completeTimers = [];

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

    // D1: Progressive second hint if user hasn't discovered anything by 20s
    const secondHintTimer = setTimeout(() => {
      if (!hintDismissedRef.current && !secondHintShownRef.current) {
        secondHintShownRef.current = true;
        setHintText("each bright point holds a memory");
        setShowHint(true);
        setTimeout(() => setShowHint(false), 6000);
      }
    }, 20000);

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

    // C1: Constellation complete callback
    org.onConstellationComplete(() => {
      setConstellationComplete(true);
      setShowCompleteMsg(true);
      const t1 = setTimeout(() => setShowCompleteMsg(false), 5000);
      // C2: Show circadian hint after completion celebration
      const t2 = setTimeout(() => {
        setShowCircadianHint(true);
        const t3 = setTimeout(() => setShowCircadianHint(false), 6000);
        completeTimers.push(t3);
      }, 6000);
      completeTimers.push(t1, t2);
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
      clearTimeout(secondHintTimer);
      completeTimers.forEach(clearTimeout);
      clearInterval(syncInterval);
      org.destroy();
      organismRef.current = null;
    };
  }, []);

  // A3: Click on canvas to revisit discovered nodes
  const handleCanvasClick = useCallback((e) => {
    const org = organismRef.current;
    if (!org) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const nearest = org.findNearestNode(x, y, 50);
    if (nearest) {
      const node = org.memory.nodes.get(nearest);
      if (node?.discovered && node?.url) {
        window.open(node.url, "_blank", "noopener,noreferrer");
      } else if (node?.discovered) {
        org.revisitNode(nearest);
      }
    }
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
        onClick={handleCanvasClick}
        aria-label="Interactive particle constellation — move cursor to explore, dwell near bright particles to discover content. Use arrow keys to navigate between nodes, Enter to reveal. After all nodes discovered, press Space for a guided tour."
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
          {hintText}
        </div>
      )}

      {/* C1: Constellation complete message */}
      {showCompleteMsg && (
        <div className="discovery-hint discovery-hint--visible discovery-hint--complete">
          constellation complete
        </div>
      )}

      {/* C2: Circadian hint after completion */}
      {showCircadianHint && (
        <div className="discovery-hint discovery-hint--visible discovery-hint--circadian">
          the constellation changes with the time of day
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
        {discoveryCount.discovered > 0 && !constellationComplete && (
          <span className="footer__discovery-count">
            {discoveryCount.discovered}/{discoveryCount.total}
          </span>
        )}
        {constellationComplete && (
          <span className="footer__tour-hint">
            space: tour
          </span>
        )}
        <Link href="/text" className="footer__text-link">[text]</Link>
      </footer>
    </>
  );
}
