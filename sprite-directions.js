(() => {
  "use strict";

  const PERSON_SELECTOR = ".camp-person";
  const DEFAULT_FACING = "down";
  const MOVEMENT_EPSILON = 0.08;
  const previousPositions = new WeakMap();

  function translationOf(element) {
    const transform = window.getComputedStyle(element).transform;
    if (!transform || transform === "none") return { x: 0, y: 0 };

    try {
      const matrix = new DOMMatrixReadOnly(transform);
      return { x: matrix.m41, y: matrix.m42 };
    } catch {
      const match = transform.match(/^matrix\(([^)]+)\)$/);
      if (!match) return { x: 0, y: 0 };
      const values = match[1].split(",").map(Number);
      return { x: values[4] || 0, y: values[5] || 0 };
    }
  }

  function facingForDelta(dx, dy, fallback = DEFAULT_FACING) {
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (absX < MOVEMENT_EPSILON && absY < MOVEMENT_EPSILON) return fallback;
    if (absX >= absY) return dx >= 0 ? "right" : "left";
    return dy >= 0 ? "down" : "up";
  }

  function updateFacing(person) {
    const current = translationOf(person);
    const previous = previousPositions.get(person);

    if (!person.dataset.facing) person.dataset.facing = DEFAULT_FACING;
    if (previous) {
      const facing = facingForDelta(
        current.x - previous.x,
        current.y - previous.y,
        person.dataset.facing
      );
      if (facing !== person.dataset.facing) person.dataset.facing = facing;
    }

    previousPositions.set(person, current);
  }

  function trackDirections() {
    document.querySelectorAll(PERSON_SELECTOR).forEach(updateFacing);
    window.requestAnimationFrame(trackDirections);
  }

  window.__soldierDirection = { facingForDelta };
  window.requestAnimationFrame(trackDirections);
})();

(() => {
  "use strict";

  const HIT_SHEET = "/assets/card-impact-user-6f-v1.png?v=1";
  const HIT_SFX = "/assets/hit-soft-v1.wav?v=1";
  const FRAME_COUNT = 6;
  const FRAME_MS = 42;
  const FINISH_DELAY = FRAME_COUNT * FRAME_MS + 18;
  const hitStates = new WeakMap();

  const audioPool = Array.from({ length: 4 }, () => {
    const audio = new Audio(HIT_SFX);
    audio.preload = "auto";
    audio.volume = 0.2;
    return audio;
  });
  let audioIndex = 0;

  function playHitSound() {
    const audio = audioPool[audioIndex++ % audioPool.length];
    try {
      audio.pause();
      audio.currentTime = 0;
      const playing = audio.play();
      if (playing && typeof playing.catch === "function") playing.catch(() => {});
    } catch {}
  }

  function findCardSoldier(target) {
    let node = target instanceof Element ? target : null;
    for (let depth = 0; node && node !== document.body && depth < 7; depth += 1, node = node.parentElement) {
      if (node.matches?.(".pixel-soldier")) return node;
      const soldier = node.querySelector?.(".pixel-soldier");
      if (soldier) return soldier;
    }
    return null;
  }

  function ensureOverlay(soldier) {
    let overlay = soldier.querySelector(":scope > .card-hit-overlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.className = "card-hit-overlay";
    overlay.setAttribute("aria-hidden", "true");
    soldier.appendChild(overlay);
    return overlay;
  }

  function finishHit(soldier) {
    const state = hitStates.get(soldier);
    if (!state) return;
    state.timers.forEach(clearTimeout);
    state.overlay.classList.remove("is-playing");
    state.overlay.style.backgroundPosition = "0% 0%";
    hitStates.delete(soldier);
  }

  function triggerCardHit(soldier) {
    if (!soldier) return;
    finishHit(soldier);

    const overlay = ensureOverlay(soldier);
    overlay.style.backgroundImage = `url("${HIT_SHEET}")`;
    overlay.style.backgroundSize = `${FRAME_COUNT * 100}% 100%`;
    overlay.style.backgroundPosition = "0% 0%";
    overlay.classList.add("is-playing");

    const state = { overlay, timers: [] };
    hitStates.set(soldier, state);

    for (let index = 0; index < FRAME_COUNT; index += 1) {
      const delay = index * FRAME_MS;
      state.timers.push(setTimeout(() => {
        const position = FRAME_COUNT === 1 ? 0 : (index / (FRAME_COUNT - 1)) * 100;
        overlay.style.backgroundPosition = `${position}% 0%`;
      }, delay));
    }

    state.timers.push(setTimeout(() => finishHit(soldier), FINISH_DELAY));
    playHitSound();

    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(6);
    }
  }

  document.addEventListener("pointerdown", (event) => {
    const soldier = findCardSoldier(event.target);
    if (soldier) triggerCardHit(soldier);
  }, { passive: true });
})();
