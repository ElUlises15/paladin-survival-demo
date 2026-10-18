// Guardianes de robustez: el bucle nunca muere por una excepción, se re-arma si el WebView
// deja de entregar requestAnimationFrame (ads/UMP/pausa) y los errores quedan registrados.

/** Registro de errores acotado (memoria + localStorage), visible en ?debug y en window.__paladinErrors. */
export function createErrorLog(storage, { key = "paladin:errors", max = 25, now = () => Date.now() } = {}) {
  let list = [];
  try {
    list = JSON.parse(storage?.getItem?.(key) || "[]");
    if (!Array.isArray(list)) list = [];
  } catch {
    list = [];
  }
  const counts = new Map();
  return {
    record(where, err) {
      const msg = String(err?.stack || err?.message || err).slice(0, 600);
      const sig = `${where}:${msg.slice(0, 120)}`;
      const n = (counts.get(sig) || 0) + 1;
      counts.set(sig, n);
      // Un error que se repite cada frame se registra 1 vez (y luego cada 600 repeticiones).
      if (n === 1 || n % 600 === 0) {
        list.push({ t: now(), where, msg, n });
        while (list.length > max) list.shift();
        try {
          storage?.setItem?.(key, JSON.stringify(list));
        } catch {}
        try {
          console.error(`[paladin:${where}]`, err);
        } catch {}
      }
      return n;
    },
    list: () => list.slice(),
    clear() {
      list = [];
      counts.clear();
      try {
        storage?.removeItem?.(key);
      } catch {}
    },
  };
}

/**
 * Programa un único frame pendiente; detecta bucles parados.
 * `raf(cb)` = requestAnimationFrame. Si pasó `stallMs` sin frames estando visible, `check()` lo re-arma.
 */
export function createLoopGuard(raf, frame, { stallMs = 1500, now = () => performance.now() } = {}) {
  let pending = false,
    lastFrame = now(),
    restarts = 0,
    token = 0;
  const run = (my) => (t) => {
    if (my !== token) return; // un re-arme dejó obsoleto este callback: evita bucles dobles
    pending = false;
    lastFrame = now();
    try {
      frame(t);
    } finally {
      schedule();
    }
  };
  function schedule() {
    if (pending) return;
    pending = true;
    raf(run(token));
  }
  return {
    start: schedule,
    /** Llamar desde un setInterval: re-arma el bucle si quedó parado. */
    check(visible = true) {
      if (!visible) return false;
      if (now() - lastFrame > stallMs) {
        token++;
        pending = false;
        restarts++;
        lastFrame = now();
        schedule();
        return true;
      }
      return false;
    },
    get restarts() {
      return restarts;
    },
    get lastFrame() {
      return lastFrame;
    },
  };
}
