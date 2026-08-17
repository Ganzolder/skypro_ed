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
