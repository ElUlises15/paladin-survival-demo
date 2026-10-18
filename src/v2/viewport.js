// Tamaño real del área visible (iOS Safari: la barra de herramientas cambia la altura y 100vh miente).
// Usa visualViewport cuando existe, publica --app-w/--app-h/--u en :root y bloquea zoom por gestos.
const root = typeof document !== "undefined" ? document.documentElement : null;
let size = { w: 0, h: 0, u: 1 };

/** Escala de UI (botones, HUD) relativa al lado corto: 1 en ≥ 430 px, nunca menos de 0,62. */
export function uiScale(w, h) {
  const short = Math.min(w, h);
  return Math.max(0.62, Math.min(1, short / 430));
}

/** Zoom de cámara: siempre se ven al menos 720×400 unidades de mundo (más en pantallas grandes). */
export function cameraScale(w, h) {
  if (!(w > 0) || !(h > 0)) return 1;
  if (w >= 1100 && h >= 620) return Math.min(w / 1050, h / 600);
  return Math.min(w / 720, h / 400);
}

export function measure() {
  if (typeof window === "undefined") return size;
  const vv = window.visualViewport;
  // visualViewport.scale > 1 = el usuario hizo zoom: medir el layout viewport para no "seguir" el zoom.
  const zoomed = vv && vv.scale > 1.01;
  const w = Math.round(vv && !zoomed ? vv.width : window.innerWidth) || 1;
  const h = Math.round(vv && !zoomed ? vv.height : window.innerHeight) || 1;
  size = { w, h, u: uiScale(w, h) };
  if (root) {
    root.style.setProperty("--app-w", `${w}px`);
    root.style.setProperty("--app-h", `${h}px`);
    root.style.setProperty("--u", size.u.toFixed(3));
  }
  return size;
}
export function viewport() {
  return size.w ? size : measure();
}

export function installViewport() {
  if (typeof window === "undefined") return;
  const update = () => {
    measure();
    if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
  };
  update();
  window.addEventListener("resize", update);
  window.addEventListener("orientationchange", () => {
    update();
    setTimeout(update, 250);
    setTimeout(update, 700);
  });
  window.visualViewport?.addEventListener("resize", update);
  window.visualViewport?.addEventListener("scroll", update);
  // Sin pinch-zoom ni doble toque para hacer zoom (Safari ignora user-scalable=no).
  const block = (e) => e.preventDefault();
  for (const t of ["gesturestart", "gesturechange", "gestureend"])
    document.addEventListener(t, block, { passive: false });
  document.addEventListener("dblclick", block, { passive: false });
  // Doble toque sobre el juego (no sobre botones): evitar el zoom de Safari. Los botones usan
  // touch-action: manipulation, así que un toque rápido en la UI nunca se cancela.
  let lastEnd = 0,
    lastX = 0,
    lastY = 0;
  document.addEventListener(
    "touchend",
    (e) => {
      const now = Date.now(),
        t = e.changedTouches?.[0],
        x = t?.clientX ?? 0,
        y = t?.clientY ?? 0;
      const ui = e.target?.closest?.("button, a, input, select, textarea, label, [role=button], #screen, #modal");
      if (!ui && now - lastEnd < 320 && Math.hypot(x - lastX, y - lastY) < 40) e.preventDefault();
      lastEnd = now;
      lastX = x;
      lastY = y;
    },
    { passive: false },
  );
  document.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches && e.touches.length > 1) e.preventDefault();
      else if (!e.target?.closest?.("#screen, .scroll, .card")) e.preventDefault();
    },
    { passive: false },
  );
}
