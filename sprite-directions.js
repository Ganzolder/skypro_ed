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

  const HIT_SHEET = "/assets/soldier-hit-5f-32x48-v1.png?v=1";
  const HIT_SFX = "/assets/hit-soft-v1.wav?v=1";
  const FRAME_POSITIONS = ["0%", "25%", "50%", "75%", "100%"];
  const FRAME_TIMES = [0, 42, 82, 132, 188];
  const FRAME_TRANSFORMS = [
    "translate(0, 0)",
    "translate(1px, 0)",
    "translate(2px, 1px)",
    "translate(1px, 0)",
    "translate(0, 0)"
  ];
  const RESTORE_AT = 230;
  const HIT_PROPS = [
    "background-image",
    "background-size",
    "background-position",
    "background-repeat",
    "transform",
    "filter"
  ];
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

  function saveInline(element, property) {
    return {
      value: element.style.getPropertyValue(property),
      priority: element.style.getPropertyPriority(property)
    };
  }

  function restoreInline(element, property, saved) {
    if (saved.value) element.style.setProperty(property, saved.value, saved.priority);
    else element.style.removeProperty(property);
  }

  function finishHit(soldier) {
    const state = hitStates.get(soldier);
    if (!state) return;
    state.timers.forEach(clearTimeout);
    HIT_PROPS.forEach((property) => restoreInline(soldier, property, state.saved[property]));
    hitStates.delete(soldier);
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

  function triggerCardHit(soldier) {
    if (!soldier) return;
    finishHit(soldier);

    const saved = {};
    HIT_PROPS.forEach((property) => {
      saved[property] = saveInline(soldier, property);
    });

    const state = { saved, timers: [] };
    hitStates.set(soldier, state);

    FRAME_TIMES.forEach((delay, index) => {
      state.timers.push(setTimeout(() => {
        soldier.style.setProperty("background-image", `url("${HIT_SHEET}")`, "important");
        soldier.style.setProperty("background-size", "500% 100%", "important");
        soldier.style.setProperty("background-position", `${FRAME_POSITIONS[index]} 0%`, "important");
        soldier.style.setProperty("background-repeat", "no-repeat", "important");
        soldier.style.setProperty("transform", FRAME_TRANSFORMS[index], "important");
        soldier.style.setProperty(
          "filter",
          index === 2
            ? "contrast(1.12) saturate(1.04) brightness(1.08) drop-shadow(8px 9px 0 rgba(31, 23, 14, .28))"
            : "drop-shadow(8px 9px 0 rgba(31, 23, 14, .28))",
          "important"
        );
      }, delay));
    });

    state.timers.push(setTimeout(() => finishHit(soldier), RESTORE_AT));
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
