"use client";

import { useEffect, useRef, useState } from "react";
import { initParallax, initAudio, typewriterEffect } from "./graph";

/*
 * Node data — the constellation of Nikolai's universe.
 * Positions are percentages (x%, y%) of the graph container.
 * Edges reference node ids.
 */
const NODES = [
  {
    id: "root",
    label: "nikolai onken",
    x: 42,
    y: 48,
    type: "root",
    desc: "Coder, builder, musician. Lover of nature, humans, and the universe.",
  },
  // Work — left/center cluster
  {
    id: "asymmetric",
    label: "Asymmetric",
    x: 68,
    y: 38,
    type: "work",
    desc: "CTO — crypto-focused investment firm",
    url: "https://asymmetric.financial/",
  },
  {
    id: "warpmetrics",
    label: "WarpMetrics",
    x: 25,
    y: 72,
    type: "work",
    desc: "AI-powered coding agents",
    url: "https://warpmetrics.com/",
  },
  {
    id: "dailydots",
    label: "DailyDots",
    x: 58,
    y: 18,
    type: "work",
    url: "https://www.dailydots.com/",
  },
  {
    id: "mintline",
    label: "Mintline.ai",
    x: 88,
    y: 28,
    type: "work",
    desc: "AI-powered financial reconciliation",
    url: "https://mintline.ai/",
  },
  {
    id: "cloud9",
    label: "Cloud9 IDE",
    x: 18,
    y: 32,
    type: "work",
    desc: "Site lead — established the Amsterdam office. Acquired by AWS in 2016",
    url: "https://c9.io",
  },
  {
    id: "aws",
    label: "AWS",
    x: 8,
    y: 18,
    type: "work",
    desc: "Site lead, Amsterdam (Cloud9)",
    url: "https://aws.amazon.com/cloud9/",
  },
  {
    id: "nangu",
    label: "Nangu.eco",
    x: 80,
    y: 62,
    type: "work",
    desc: "Co-founder",
    url: "https://nangu.eco/",
  },
  {
    id: "baseline",
    label: "Baseline.dev",
    x: 90,
    y: 50,
    type: "work",
    url: "https://baseline.dev/",
  },
  {
    id: "saasmanual",
    label: "SaaS Manual",
    x: 75,
    y: 78,
    type: "work",
    desc: "Learn how to build SaaS products from scratch",
    url: "https://saasmanual.com/",
  },
  {
    id: "uxebu",
    label: "uxebu",
    x: 28,
    y: 55,
    type: "work",
    desc: "Co-founder — web & mobile development consultancy",
    url: "http://uxebu.com",
  },
  {
    id: "bonsaijs",
    label: "BonsaiJS",
    x: 12,
    y: 65,
    type: "work",
    desc: "Open source HTML5 graphics library",
  },
  {
    id: "dojo",
    label: "Dojo Toolkit",
    x: 5,
    y: 80,
    type: "work",
    desc: "Committer & community evangelist",
    url: "https://dojotoolkit.org",
  },
  // Identity — right cluster
  {
    id: "coder",
    label: "Coder",
    x: 55,
    y: 58,
    type: "identity",
  },
  {
    id: "builder",
    label: "Builder",
    x: 62,
    y: 70,
    type: "identity",
  },
  {
    id: "musician",
    label: "Musician",
    x: 42,
    y: 82,
    type: "identity",
  },
  {
    id: "nature",
    label: "Nature",
    x: 52,
    y: 90,
    type: "identity",
  },
  {
    id: "humans",
    label: "Humans",
    x: 35,
    y: 92,
    type: "identity",
  },
  {
    id: "universe",
    label: "Universe",
    x: 70,
    y: 88,
    type: "identity",
  },
];

const EDGES = [
  // Root connections
  ["root", "asymmetric"],
  ["root", "cloud9"],
  ["root", "uxebu"],
  ["root", "warpmetrics"],
  ["root", "coder"],
  // Work graph
  ["asymmetric", "mintline"],
  ["asymmetric", "dailydots"],
  ["cloud9", "aws"],
  ["uxebu", "bonsaijs"],
  ["bonsaijs", "dojo"],
  ["asymmetric", "nangu"],
  ["nangu", "baseline"],
  ["baseline", "saasmanual"],
  ["warpmetrics", "coder"],
  // Identity graph
  ["coder", "builder"],
  ["builder", "musician"],
  ["musician", "nature"],
  ["musician", "humans"],
  ["nature", "universe"],
  ["nature", "humans"],
];

function getNodePos(id) {
  const n = NODES.find((n) => n.id === id);
  return n ? { x: n.x, y: n.y } : { x: 50, y: 50 };
}

export default function Home() {
  const [ready, setReady] = useState(false);
  const typewriterRef = useRef(null);
  const audioRef = useRef(null);
  const [audioOn, setAudioOn] = useState(true);

  useEffect(() => {
    const cleanupParallax = initParallax();

    // Typewriter intro
    let typewriterPromise = null;
    const el = typewriterRef.current;
    if (el) {
      typewriterPromise = typewriterEffect(el, "> nikolai onken", 70);
      typewriterPromise.then(() => {
        setReady(true);
      });
    }

    // Auto-start audio on first user interaction (required by browser autoplay policy)
    let audioStarted = false;
    function startAudio() {
      if (audioStarted) return;
      audioStarted = true;
      if (!audioRef.current) {
        audioRef.current = initAudio();
        audioRef.current.toggle(); // enable immediately
      }
      document.removeEventListener("click", startAudio);
      document.removeEventListener("keydown", startAudio);
    }
    document.addEventListener("click", startAudio);
    document.addEventListener("keydown", startAudio);

    return () => {
      cleanupParallax();
      document.removeEventListener("click", startAudio);
      document.removeEventListener("keydown", startAudio);
      if (typewriterPromise && typewriterPromise.cancel) {
        typewriterPromise.cancel();
      }
      if (audioRef.current) {
        audioRef.current.destroy();
        audioRef.current = null;
      }
    };
  }, []);

  function toggleAudio() {
    if (!audioRef.current) {
      audioRef.current = initAudio();
    }
    const on = audioRef.current.toggle();
    setAudioOn(on);
  }

  return (
    <>
      {/* Typewriter intro */}
      <div className={`typewriter ${ready ? "typewriter--done" : ""}`}>
        <span className="typewriter__text" ref={typewriterRef} />
        <span className="typewriter__cursor" />
      </div>

      {/* Star field background */}
      <div className="star-field" aria-hidden="true">
        <div className="star-layer star-layer--far" />
        <div className="star-layer star-layer--mid" />
        <div className="star-layer star-layer--near" />
      </div>

      {/* Ambient center glow */}
      <div className="ambient-glow" aria-hidden="true" />

      {/* The Constellation */}
      <div className="constellation">
        <div className="graph" role="list" aria-label="Nikolai Onken — personal constellation">
          {/* SVG edges */}
          <svg className="connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {EDGES.map(([from, to], i) => {
              const a = getNodePos(from);
              const b = getNodePos(to);
              return (
                <line
                  key={i}
                  className="edge"
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {NODES.map((node) => (
            <article
              key={node.id}
              className={`node ${node.type === "root" ? "node--root" : ""} ${node.type === "identity" ? "node--identity" : ""}`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              role="listitem"
              id={node.id}
            >
              <div className="node__dot" />
              <span className="node__label">{node.label}</span>
              {(node.desc || node.url) && (
                <div className="node__card">
                  <div className="node__card-title">{node.label}</div>
                  {node.desc && (
                    <div className="node__card-desc">{node.desc}</div>
                  )}
                  {node.url && (
                    <a
                      className="node__card-link"
                      href={node.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {node.url.replace(/^https?:\/\//, "").replace(/\/$/, "")} &rarr;
                    </a>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>

      {/* Audio toggle */}
      <button
        className={`audio-toggle ${audioOn ? "audio-toggle--active" : ""}`}
        onClick={toggleAudio}
        aria-label={audioOn ? "Disable ambient sound" : "Enable ambient sound"}
      >
        {audioOn ? "sound: on" : "sound: off"}
      </button>

      {/* Footer */}
      <footer className="footer">
        &copy; {new Date().getFullYear()} Nikolai Onken
      </footer>
    </>
  );
}
