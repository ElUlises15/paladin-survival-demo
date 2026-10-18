import { viewport } from "./viewport.js";
export function createControls(canvas, buttons, onPause) {
  const keys = new Set(),
    held = new Set(),
    pending = {},
    joy = document.getElementById("joystick"),
    knob = joy.firstElementChild;
  let pointer = null,
    origin = { x: 0, y: 0 },
    mx = 0,
    my = 0;
  const stats = { takeovers: 0 };
  const actions = {
    KeyK: "dash",
    ShiftLeft: "dash",
    ShiftRight: "dash",
    KeyL: "skill",
    KeyQ: "skill",
    KeyE: "swap",
    Tab: "swap",
    KeyF: "interact",
  };
  window.addEventListener("keydown", (e) => {
    if (e.target.matches("input,select")) return;
    if (
      [
        "Space",
        "Tab",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ].includes(e.code)
    )
      e.preventDefault();
    keys.add(e.code);
    if (!e.repeat) {
      if (e.code === "KeyJ" || e.code === "Space") pending.attack = true;
      if (e.code === "Escape" || e.code === "KeyP") onPause();
      if (actions[e.code]) pending[actions[e.code]] = true;
    }
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  function clear() {
    keys.clear();
    held.clear();
    for (const k of Object.keys(pending)) delete pending[k];
    mx = my = 0;
    pointer = null;
    joy.hidden = true;
  }
  window.addEventListener("blur", clear);
  document.addEventListener("visibilitychange", clear);
  canvas.addEventListener("pointerdown", (e) => {
    if (e.clientX > viewport().w * 0.45) return;
    // Si ya había un dedo "activo" y llega otro a la zona del joystick, el anterior se perdió
    // (pointerup tragado por un diálogo nativo, gesto del sistema, etc.): tomar el control.
    if (pointer !== null && pointer !== e.pointerId) {
      try {
        if (canvas.hasPointerCapture?.(pointer)) canvas.releasePointerCapture(pointer);
      } catch {}
      stats.takeovers++;
    }
    pointer = e.pointerId;
    mx = my = 0;
    origin = { x: e.clientX, y: e.clientY };
    joy.hidden = false;
    joy.style.left = `${origin.x}px`;
    joy.style.top = `${origin.y}px`;
    knob.style.transform = "translate(0,0)";
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {}
  });
  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerId !== pointer) return;
    const x = e.clientX - origin.x,
      y = e.clientY - origin.y,
      d = Math.hypot(x, y),
      R = 52 * viewport().u,
      m = Math.min(1, d / R),
      dead = 0.14;
    mx = d > 0 && m > dead ? ((x / d) * (m - dead)) / (1 - dead) : 0;
    my = d > 0 && m > dead ? ((y / d) * (m - dead)) / (1 - dead) : 0;
    const f = d ? Math.min(R, d) / d : 0;
    knob.style.transform = `translate(${x * f}px,${y * f}px)`;
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    canvas.addEventListener(type, (e) => {
      if (e.pointerId === pointer) {
        pointer = null;
        mx = my = 0;
        joy.hidden = true;
      }
    });
  for (const [action, b] of Object.entries(buttons)) {
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      try {
        b.setPointerCapture(e.pointerId);
      } catch {}
      if (action === "attack") {
        if (b.dataset.interact === "true") pending.interact = true;
        else {
          held.add(e.pointerId);
          pending.attack = true;
        }
      } else pending[action] = true;
    });
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      b.addEventListener(event, (e) => held.delete(e.pointerId));
  }
  // Botón de ataque: si el pointerup se perdió, soltarlo al tocar en cualquier otro lado sin ese dedo.
  window.addEventListener(
    "pointerup",
    (e) => {
      if (held.has(e.pointerId)) held.delete(e.pointerId);
    },
    true,
  );
  return {
    clear,
    stats,
    get pointer() {
      return pointer;
    },
    read() {
      const i = {
        moveX:
          mx +
          (+keys.has("KeyD") || +keys.has("ArrowRight")) -
          (+keys.has("KeyA") || +keys.has("ArrowLeft")),
        moveY:
          my +
          (+keys.has("KeyS") || +keys.has("ArrowDown")) -
          (+keys.has("KeyW") || +keys.has("ArrowUp")),
        attack: held.size > 0 || keys.has("KeyJ") || keys.has("Space"),
        ...pending,
      };
      for (const k of Object.keys(pending)) delete pending[k];
      return i;
    },
  };
}
