"use client";

export function initParallax() {
  let rafId = null;
  let mx = 0.5;
  let my = 0.5;
  let cx = 0.5;
  let cy = 0.5;

  function onMove(e) {
    mx = e.clientX / window.innerWidth;
    my = e.clientY / window.innerHeight;
  }

  function tick() {
    cx += (mx - cx) * 0.08;
    cy += (my - cy) * 0.08;
    document.documentElement.style.setProperty("--mouse-x", cx);
    document.documentElement.style.setProperty("--mouse-y", cy);
    rafId = requestAnimationFrame(tick);
  }

  window.addEventListener("mousemove", onMove, { passive: true });
  rafId = requestAnimationFrame(tick);

  return () => {
    window.removeEventListener("mousemove", onMove);
    cancelAnimationFrame(rafId);
  };
}

export function initAudio() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);

  // Three oscillators creating a gentle chord
  const freqs = [220, 277.18, 329.63]; // A3, C#4, E4 — A major
  const oscs = freqs.map((f) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = f;
    const oscGain = ctx.createGain();
    oscGain.gain.value = 0.15;
    osc.connect(oscGain);
    oscGain.connect(gain);
    osc.start();
    return { osc, gain: oscGain };
  });

  let enabled = false;

  function setEnabled(on) {
    enabled = on;
    if (ctx.state === "suspended") ctx.resume();
    gain.gain.linearRampToValueAtTime(
      on ? 0.12 : 0,
      ctx.currentTime + 0.3
    );
  }

  // Mouse proximity modulates frequencies
  function onMove(e) {
    if (!enabled) return;
    const nx = e.clientX / window.innerWidth;
    const ny = e.clientY / window.innerHeight;
    oscs[0].osc.frequency.linearRampToValueAtTime(
      200 + nx * 80,
      ctx.currentTime + 0.1
    );
    oscs[1].osc.frequency.linearRampToValueAtTime(
      260 + ny * 60,
      ctx.currentTime + 0.1
    );
    oscs[2].osc.frequency.linearRampToValueAtTime(
      320 + (nx + ny) * 30,
      ctx.currentTime + 0.1
    );
  }

  window.addEventListener("mousemove", onMove, { passive: true });

  return {
    toggle() {
      setEnabled(!enabled);
      return enabled;
    },
    destroy() {
      window.removeEventListener("mousemove", onMove);
      oscs.forEach((o) => o.osc.stop());
      ctx.close();
    },
  };
}

export function typewriterEffect(el, text, speed = 80) {
  return new Promise((resolve) => {
    let i = 0;
    function type() {
      if (i < text.length) {
        el.textContent = text.slice(0, i + 1);
        i++;
        setTimeout(type, speed);
      } else {
        setTimeout(resolve, 600);
      }
    }
    type();
  });
}
