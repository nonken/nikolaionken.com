"use client";

/*
 * Unified input handling: mouse, touch, gyroscope.
 * Normalizes all input to { x, y, pressure, active } in viewport coordinates.
 * Tracks swipe velocity, pinch distance, multi-touch state.
 */

export function createInputHandler(canvas) {
  const state = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    px: window.innerWidth / 2,
    py: window.innerHeight / 2,
    active: false,
    pressure: 0,
    velocity: 0,
    touches: [],
    gyro: { x: 0, y: 0 },
    hasGyro: false,
    isTouch: false,
    // Pinch state
    pinchDist: 0,
    pinchDelta: 0,
    isPinching: false,
    // Swipe state
    swipeVx: 0,
    swipeVy: 0,
    isSwipe: false,
    swipeCooldown: 0,
    // Touch burst callback (organism sets this)
    onTouchBurst: null,
  };

  const listeners = [];
  let prevTouchDist = 0;

  function on(el, event, fn, opts) {
    el.addEventListener(event, fn, opts);
    listeners.push([el, event, fn, opts]);
  }

  function onMouseMove(e) {
    state.x = e.clientX;
    state.y = e.clientY;
    state.active = true;
    state.isTouch = false;
  }

  function onMouseLeave() {
    state.active = false;
  }

  function onTouchStart(e) {
    e.preventDefault();
    state.active = true;
    state.isTouch = true;
    updateTouches(e);
    // Trigger touch burst at first touch point
    if (state.onTouchBurst && e.touches.length > 0) {
      state.onTouchBurst(e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    const prevX = state.x;
    const prevY = state.y;
    updateTouches(e);
    // Track swipe velocity
    state.swipeVx = state.x - prevX;
    state.swipeVy = state.y - prevY;
  }

  function onTouchEnd(e) {
    if (e.touches.length === 0) {
      state.active = false;
      state.isPinching = false;
      prevTouchDist = 0;
      // Detect swipe on release
      const sv = Math.sqrt(state.swipeVx * state.swipeVx + state.swipeVy * state.swipeVy);
      if (sv > 15) {
        state.isSwipe = true;
        state.swipeCooldown = 400; // ms
      }
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
    // Pinch detection
    if (state.touches.length >= 2) {
      const dx = state.touches[0].x - state.touches[1].x;
      const dy = state.touches[0].y - state.touches[1].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (prevTouchDist > 0) {
        state.pinchDelta = dist - prevTouchDist;
        state.isPinching = true;
      }
      state.pinchDist = dist;
      prevTouchDist = dist;
    }
  }

  function onDeviceOrientation(e) {
    if (e.gamma !== null && e.beta !== null) {
      state.hasGyro = true;
      state.gyro.x = Math.max(-1, Math.min(1, (e.gamma || 0) / 45));
      state.gyro.y = Math.max(-1, Math.min(1, (e.beta || 0) / 45));
    }
  }

  // Bind events
  on(canvas, "mousemove", onMouseMove, { passive: true });
  on(canvas, "mouseleave", onMouseLeave, { passive: true });
  on(canvas, "touchstart", onTouchStart, { passive: false });
  on(canvas, "touchmove", onTouchMove, { passive: false });
  on(canvas, "touchend", onTouchEnd, { passive: true });
  on(window, "deviceorientation", onDeviceOrientation, { passive: true });

  function update(smoothing = 0.3) {
    const dx = state.x - state.px;
    const dy = state.y - state.py;
    state.velocity = Math.sqrt(dx * dx + dy * dy);
    state.px += dx * smoothing;
    state.py += dy * smoothing;

    // Decay swipe cooldown
    if (state.swipeCooldown > 0) {
      state.swipeCooldown -= 16;
      if (state.swipeCooldown <= 0) {
        state.isSwipe = false;
        state.swipeVx = 0;
        state.swipeVy = 0;
      }
    }

    // Reset per-frame pinch delta
    if (!state.isPinching) {
      state.pinchDelta = 0;
    }
  }

  function destroy() {
    for (const [el, event, fn, opts] of listeners) {
      el.removeEventListener(event, fn, opts);
    }
    listeners.length = 0;
  }

  return { state, update, destroy };
}
