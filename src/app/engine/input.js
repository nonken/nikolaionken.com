"use client";

/*
 * Unified input handling: mouse, touch, gyroscope.
 * Normalizes all input to { x, y, pressure, active } in viewport coordinates.
 */

export function createInputHandler(canvas) {
  const state = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    px: canvas.width / 2, // smoothed
    py: canvas.height / 2,
    active: false,
    pressure: 0,
    velocity: 0,
    touches: [],
    gyro: { x: 0, y: 0 },
    hasGyro: false,
  };

  const listeners = [];

  function on(el, event, fn, opts) {
    el.addEventListener(event, fn, opts);
    listeners.push([el, event, fn, opts]);
  }

  function onMouseMove(e) {
    state.x = e.clientX;
    state.y = e.clientY;
    state.active = true;
  }

  function onMouseLeave() {
    state.active = false;
  }

  function onTouchStart(e) {
    e.preventDefault();
    state.active = true;
    updateTouches(e);
  }

  function onTouchMove(e) {
    e.preventDefault();
    updateTouches(e);
  }

  function onTouchEnd(e) {
    if (e.touches.length === 0) {
      state.active = false;
    }
    updateTouches(e);
  }

  function updateTouches(e) {
    state.touches = [];
    for (let i = 0; i < e.touches.length; i++) {
      state.touches.push({
        x: e.touches[i].clientX,
        y: e.touches[i].clientY,
        id: e.touches[i].identifier,
      });
    }
    if (state.touches.length > 0) {
      state.x = state.touches[0].x;
      state.y = state.touches[0].y;
    }
  }

  function onDeviceOrientation(e) {
    if (e.gamma !== null && e.beta !== null) {
      state.hasGyro = true;
      state.gyro.x = (e.gamma || 0) / 45; // -1 to 1
      state.gyro.y = (e.beta || 0) / 45;
    }
  }

  // Bind events
  on(canvas, "mousemove", onMouseMove, { passive: true });
  on(canvas, "mouseleave", onMouseLeave, { passive: true });
  on(canvas, "touchstart", onTouchStart, { passive: false });
  on(canvas, "touchmove", onTouchMove, { passive: false });
  on(canvas, "touchend", onTouchEnd, { passive: true });
  on(window, "deviceorientation", onDeviceOrientation, { passive: true });

  function update(smoothing = 0.08) {
    // Smooth interpolation
    const dx = state.x - state.px;
    const dy = state.y - state.py;
    state.velocity = Math.sqrt(dx * dx + dy * dy);
    state.px += dx * smoothing;
    state.py += dy * smoothing;
  }

  function destroy() {
    for (const [el, event, fn, opts] of listeners) {
      el.removeEventListener(event, fn, opts);
    }
    listeners.length = 0;
  }

  return { state, update, destroy };
}
