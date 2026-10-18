// Héroes, espada larga y arco largo: arte vectorial ORIGINAL, rasterizado una sola vez en atlas por héroe/skin.
// Cuerpo (piernas, torso, capa, cabeza) = cuadros pre-renderizados con contorno; brazos, arma y hombrera se dibujan
// por frame (son pocas formas) para que apunten en cualquier dirección sin multiplicar los cuadros.
const TAU = Math.PI * 2;
export const RS = 3; // píxeles de atlas por unidad de mundo
export const FRAME = { w: 80, h: 82, ox: 40, oy: 56 }; // caja del cuadro en unidades; origen = centro del cuerpo
export const ANIMS = {
  idle: { n: 8, dur: 1.6, loop: true },
  walk: { n: 8, loop: true }, // avanza con la distancia recorrida, no con el tiempo
  dash: { n: 4, dur: 0.25 },
  hit: { n: 3, dur: 0.24 },
  death: { n: 8, dur: 1.05 },
};
export const STRIDE = 92; // unidades de mundo por ciclo de caminata (dos pasos)
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - (1 - t) ** 3;
const easeIn = (t) => t * t * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
function hex(c) {
  const n = parseInt(c.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a, b, t) {
  const x = hex(a),
    y = hex(b);
  return (
    "#" +
    x
      .map((v, i) => Math.round(lerp(v, y[i], t)).toString(16).padStart(2, "0"))
      .join("")
  );
}
const shade = (c, t) => mix(c, "#000000", t),
  light = (c, t) => mix(c, "#ffffff", t);

// ---------- Paletas ----------
const HERO_STYLE = {
  paladin: {
    metal: "#b4bec6", trim: "#e0b85c", cloth: "#ece2c8", cape: "#8e2430", leather: "#5b3c28",
    plume: null, helm: "great", back: "cape",
  },
  cruzada: {
    metal: "#b8d0d8", trim: "#d9c38a", cloth: "#2f7f86", cape: "#e9e4d4", leather: "#4c3a2c",
    plume: "#f4f1e6", helm: "sallet", back: "shield", hair: "#e3c06f",
  },
  inquisidor: {
    metal: "#7c808e", trim: "#c9a65a", cloth: "#4b2c63", cape: "#2c1b3b", leather: "#3a2a24",
    plume: null, helm: "hat", back: "coat", eyes: "#e7c9ff",
  },
};
const SKIN_STYLE = {
  classic: {},
  moon: { cape: "#2f5f86", metal: "#bfd2dc", trim: "#d6e6ee", glow: "#9fe3ff" },
  ember: { cape: "#a5422a", metal: "#c3aaa0", trim: "#f0a35a", glow: "#ffb070" },
  bronze: { metal: "#c08a55", trim: "#f0d08a", cape: "#5c3a22" },
  stellar: { cape: "#3b2a78", metal: "#a9a2c8", trim: "#f3d27a", stars: true, glow: "#c9b2ff" },
};
export function heroPalette(hero, skin) {
  const base = HERO_STYLE[hero] || HERO_STYLE.paladin,
    s = SKIN_STYLE[skin] || {};
  const p = { ...base, ...s };
  // la cruzada lleva la capa clara: el color de la skin va al tabardo; el inquisidor a su abrigo
  if (hero === "cruzada" && s.cape) {
    p.cloth = s.cape;
    p.cape = base.cape;
  }
  if (hero === "inquisidor" && s.cape) {
    p.cloth = mix(s.cape, base.cloth, 0.35);
    p.cape = shade(s.cape, 0.45);
  }
  if (!p.plume) p.plume = p.cape;
  return p;
}

// ---------- Poses (funciones puras, testeadas) ----------
/** Pose del cuerpo para una animación y fase u∈[0,1). */
export function bodyPose(anim, u) {
  const P = { bob: 0, lean: 0, hipX: 0, legF: 0, legB: 0, kneeF: 0.12, kneeB: 0.12, cape: 0, capeLift: 0, breath: 0, head: 0, fall: 0, sink: 0, armSwing: 0 };
  const s = Math.sin(u * TAU);
  if (anim === "idle") {
    P.bob = s * 0.55;
    P.breath = (1 - Math.cos(u * TAU)) / 2;
    P.cape = Math.sin(u * TAU + 1.2) * 0.05;
    P.head = Math.sin(u * TAU - 0.6) * 0.025;
  } else if (anim === "walk") {
    P.legF = s * 0.72;
    P.legB = -s * 0.72;
    P.kneeF = 0.15 + Math.max(0, Math.cos(u * TAU)) * 0.85;
    P.kneeB = 0.15 + Math.max(0, -Math.cos(u * TAU)) * 0.85;
    P.bob = Math.abs(s) * 1.5 - 0.4;
    P.lean = 0.09;
    P.cape = -0.16 - Math.abs(Math.cos(u * TAU)) * 0.1;
    P.capeLift = 0.35 + Math.abs(s) * 0.15;
    P.head = -Math.abs(s) * 0.02;
    P.armSwing = s;
  } else if (anim === "dash") {
    const k = u < 0.25 ? easeOut(u / 0.25) : 1 - easeInOut((u - 0.25) / 0.75) * 0.6;
    P.lean = 0.42 * k;
    P.legF = 0.95 * k;
    P.legB = -1.05 * k;
    P.kneeF = 0.5 * k;
    P.kneeB = 0.9 * k + 0.1;
    P.bob = 2.2 * k;
    P.hipX = 2 * k;
    P.cape = -0.75 * k;
    P.capeLift = 1.2 * k;
    P.head = 0.1 * k;
    P.armSwing = -1;
  } else if (anim === "hit") {
    const k = Math.sin(clamp(u) * Math.PI) * (1 - u * 0.3);
    P.lean = -0.3 * k;
    P.hipX = -2.2 * k;
    P.head = -0.28 * k;
    P.kneeF = 0.12 + 0.35 * k;
    P.kneeB = 0.12 + 0.35 * k;
    P.bob = 1.2 * k;
    P.cape = 0.25 * k;
    P.capeLift = 0.4 * k;
  } else if (anim === "death") {
    const a = clamp(u / 0.3),
      b = clamp((u - 0.3) / 0.3),
      c = clamp((u - 0.58) / 0.42);
    P.lean = -0.25 * easeOut(a) * (1 - b) + 0.35 * easeInOut(b);
    P.head = -0.3 * easeOut(a) + 0.5 * b;
    P.kneeF = 0.12 + 1.5 * easeInOut(b);
    P.kneeB = 0.12 + 1.6 * easeInOut(b);
    P.legF = 0.6 * b;
    P.legB = 0.3 * b;
    P.sink = 7 * easeInOut(b);
    P.fall = -1.5 * easeIn(c) - 0.06 * Math.sin(c * Math.PI);
    P.cape = 0.3 * b;
    P.capeLift = 0.2 * (1 - c);
  }
  return P;
}
function rot(x, y, a) {
  const c = Math.cos(a),
    s = Math.sin(a);
  return [x * c - y * s, x * s + y * c];
}
/** Puntos de anclaje (hombros, cadera, cabeza) de una pose, en unidades locales (mirando a la derecha). */
export function anchors(P) {
  const hip = [P.hipX, 3 + P.bob + P.sink];
  const at = (x, y) => {
    const [rx, ry] = rot(x, y, P.lean);
    let px = hip[0] + rx,
      py = hip[1] + ry;
    if (P.fall) {
      const [fx, fy] = rot(px + 3, py - 16, P.fall);
      px = fx - 3;
      py = fy + 16;
    }
    return [px, py];
  };
  return {
    hip,
    shoulderF: at(3, -16.5),
    shoulderB: at(-3.5, -16.5),
    head: at(1.5, -26),
    chest: at(1, -10),
    at,
  };
}

// ---------- Ataques ----------
// Cada golpe del combo: [tiempo, desvío angular respecto de la dirección de apuntado, alcance de la mano].
// Anticipación (se va hacia atrás) → golpe rápido → seguimiento → vuelta al reposo.
export const SWINGS = [
  { keys: [[0, -1.1, 11], [0.05, -1.95, 9], [0.125, 1.2, 15], [0.2, 1.55, 14], [0.36, 0, 11]], strike: [0.05, 0.125], contact: 0.085, stop: 0.045 },
  { keys: [[0, 1.0, 11], [0.05, 1.7, 9], [0.125, -1.2, 15], [0.2, -1.55, 14], [0.36, 0, 11]], strike: [0.05, 0.125], contact: 0.085, stop: 0.045 },
  { keys: [[0, -1.2, 11], [0.08, -2.45, 7], [0.17, 1.45, 17], [0.25, 1.85, 16], [0.44, 0, 11]], strike: [0.08, 0.17], contact: 0.12, stop: 0.07, heavy: true },
];
export const SWORD_REST = -0.8; // ángulo ABSOLUTO (local) de la hoja en reposo: arriba-adelante
export const COMBO_WINDOW = 0.75;
export function nextCombo(prev, gap) {
  return gap < COMBO_WINDOW ? (prev + 1) % SWINGS.length : 0;
}
/** Desvío del arma (respecto del apuntado) y alcance de la mano en el instante t del golpe `variant`.
 * rest∈[0,1]: mezcla hacia la pose de reposo absoluta en el último tramo. done=true al terminar. */
export function swingPose(variant, t) {
  const sw = SWINGS[variant] || SWINGS[0],
    k = sw.keys;
  if (!(t >= 0)) t = 0;
  if (t >= k[k.length - 1][0]) return { off: k[k.length - 2][1], reach: 11, done: true, trail: 0, rest: 1 };
  let i = 0;
  while (i < k.length - 2 && t >= k[i + 1][0]) i++;
  const last = i === k.length - 2;
  const [t0, o0, r0] = k[i],
    [t1, o1raw, r1] = k[i + 1],
    o1 = last ? o0 : o1raw;
  const u = clamp((t - t0) / (t1 - t0));
  const e = i === 0 ? easeOut(u) : i === 1 ? easeInOut(u) ** 0.8 : i === 2 ? easeOut(u) : easeInOut(u);
  const trail = t < sw.strike[0] ? 0 : t < sw.strike[1] + 0.03 ? 1 : clamp(1 - (t - sw.strike[1] - 0.03) / 0.09);
  return { off: lerp(o0, o1, e), reach: lerp(r0, r1, e), done: false, trail, rest: last ? e : i === 0 ? 1 - e : 0 };
}
/** Arco: estado de la cuerda según el tiempo desde el último disparo y la carga del enfriamiento. */
export function bowState(sinceShot, charge, idleFor = 0) {
  if (sinceShot < 0.11)
    return { draw: 0, arrow: false, vib: Math.sin(sinceShot * 95) * 2.6 * Math.exp(-sinceShot * 16), nock: 0 };
  if (sinceShot < 0.2) return { draw: 0, arrow: true, vib: 0, nock: easeOut((sinceShot - 0.11) / 0.09) };
  let draw = easeInOut(clamp(charge));
  if (idleFor > 0.7) draw = lerp(draw, 0.28, clamp((idleFor - 0.7) / 0.4));
  return { draw, arrow: true, vib: 0, nock: 1 };
}

// Arco cargado (2.3): el tensado sigue al botón (nivel 0..1), no al cooldown.
export function chargeBowState(sinceShot, level) {
  if (level > 0) return { draw: clamp(level), arrow: true, vib: 0, nock: 1 };
  if (sinceShot < 0.11)
    return { draw: 0, arrow: false, vib: Math.sin(sinceShot * 95) * 2.6 * Math.exp(-sinceShot * 16), nock: 0 };
  if (sinceShot < 0.2) return { draw: 0, arrow: true, vib: 0, nock: easeOut((sinceShot - 0.11) / 0.09) };
  return { draw: 0, arrow: true, vib: 0, nock: 1 };
}
// Punto de encaje de la flecha (centro del arco) por vista, en unidades locales del héroe
// (pies en y = 16, mirando a la derecha, antes de HERO_SCALE). Medido sobre los cuadros del atlas.
export const NOCK = { side: [20, -24], front: [5, -28], back: [8, -40] };

// ---------- Dibujo ----------
function metalGrad(c, base, x0, y0, x1, y1) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, light(base, 0.55));
  g.addColorStop(0.45, base);
  g.addColorStop(1, shade(base, 0.45));
  return g;
}
function clothGrad(c, base, x0, y0, x1, y1) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, light(base, 0.18));
  g.addColorStop(1, shade(base, 0.35));
  return g;
}
function poly(c, pts) {
  c.beginPath();
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
}
function line(c, x0, y0, x1, y1, w, color) {
  c.strokeStyle = color;
  c.lineWidth = w;
  c.beginPath();
  c.moveTo(x0, y0);
  c.lineTo(x1, y1);
  c.stroke();
}
function sun(c, x, y, r, color) {
  c.fillStyle = color;
  c.beginPath();
  c.arc(x, y, r * 0.45, 0, TAU);
  c.fill();
  c.strokeStyle = color;
  c.lineWidth = r * 0.16;
  for (let i = 0; i < 8; i++) {
    const a = (i * TAU) / 8;
    c.beginPath();
    c.moveTo(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62);
    c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    c.stroke();
  }
}
function leg(c, hx, hy, ang, knee, pal, dark, hero) {
  const L1 = 6.6,
    L2 = 6.4;
  const kx = hx + Math.sin(ang) * L1,
    ky = hy + Math.cos(ang) * L1;
  const sa = ang - knee;
  const fx = kx + Math.sin(sa) * L2,
    fy = ky + Math.cos(sa) * L2;
  const metal = dark ? shade(pal.metal, 0.3) : pal.metal;
  const cloth = hero === "inquisidor" ? (dark ? shade(pal.leather, 0.3) : pal.leather) : null;
  c.lineCap = "round";
  line(c, hx, hy, kx, ky, 5.4, cloth || metalGrad(c, metal, hx - 3, hy, hx + 3, ky));
  line(c, kx, ky, fx, fy, 4.6, cloth ? shade(cloth, 0.1) : metalGrad(c, metal, kx - 3, ky, kx + 3, fy));
  // rodillera
  c.fillStyle = metalGrad(c, metal, kx - 2, ky - 2, kx + 2, ky + 2);
  c.beginPath();
  c.ellipse(kx + 0.6, ky, 2.6, 2.3, 0, 0, TAU);
  c.fill();
  // bota (apunta hacia adelante, +x)
  const boot = dark ? shade(pal.leather, 0.35) : pal.leather;
  c.save();
  c.translate(fx, fy);
  c.rotate(-Math.max(-0.5, Math.min(0.5, sa)) * 0.6);
  c.fillStyle = clothGrad(c, hero === "inquisidor" ? "#2a2024" : metal, -3, -2, 4, 3);
  c.beginPath();
  c.moveTo(-2.8, -2);
  c.lineTo(2.2, -2.2);
  c.quadraticCurveTo(5.6, -0.6, 5.4, 1.6);
  c.lineTo(-2.8, 1.8);
  c.closePath();
  c.fill();
  c.fillStyle = shade(boot, 0.2);
  c.fillRect(-2.8, 1, 8.2, 1.1);
  c.restore();
}
function cape(c, P, A, pal, hero) {
  const [sx, sy] = A.shoulderB;
  const sway = P.cape,
    lift = P.capeLift;
  const bx = sx - 6 - lift * 9 + sway * 10,
    by = A.hip[1] + 13 - lift * 5;
  const g = c.createLinearGradient(sx, sy, bx, by);
  g.addColorStop(0, light(pal.cape, 0.1));
  g.addColorStop(1, shade(pal.cape, 0.45));
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(sx + 4, sy - 1);
  c.quadraticCurveTo(sx - 4, sy - 1, sx - 4.5, sy + 4);
  c.quadraticCurveTo(bx - 2, by - 8 + lift * 3, bx - 3, by);
  // borde inferior ondulado
  c.quadraticCurveTo(bx + 2, by + 1.6, bx + 5, by - 0.4);
  c.quadraticCurveTo(bx + 8, by + 1.2, bx + 11 + lift * 2, by - 1.2 + lift);
  c.quadraticCurveTo(sx + 2, sy + 10, sx + 4, sy - 1);
  c.closePath();
  c.fill();
  // pliegues
  c.strokeStyle = shade(pal.cape, 0.5);
  c.lineWidth = 0.7;
  for (const k of [0.3, 0.62]) {
    c.beginPath();
    c.moveTo(lerp(sx - 3, sx + 2, k), sy + 3);
    c.quadraticCurveTo(lerp(bx - 2, bx + 9, k) + 1, (sy + by) / 2, lerp(bx - 2, bx + 10, k), by - 0.5);
    c.stroke();
  }
  if (pal.stars) {
    c.fillStyle = "#f6e7b0";
    for (let i = 0; i < 5; i++) {
      const t = (i * 0.37 + 0.15) % 1;
      c.fillRect(lerp(sx - 3, bx + 4, t) + (i % 2) * 2, lerp(sy + 4, by - 2, (i * 0.53) % 1), 0.9, 0.9);
    }
  }
}
function shield(c, A, pal) {
  const [x, y] = A.at(-7, -9);
  c.save();
  c.translate(x, y);
  c.rotate(-0.12);
  c.fillStyle = metalGrad(c, pal.metal, -6, -8, 6, 10);
  c.beginPath();
  c.moveTo(-6.5, -8);
  c.lineTo(6.5, -8);
  c.quadraticCurveTo(6.5, 4, 0, 11);
  c.quadraticCurveTo(-6.5, 4, -6.5, -8);
  c.fill();
  c.fillStyle = clothGrad(c, pal.cloth, -5, -7, 5, 9);
  c.beginPath();
  c.moveTo(-5, -6.6);
  c.lineTo(5, -6.6);
  c.quadraticCurveTo(5, 3.4, 0, 9.2);
  c.quadraticCurveTo(-5, 3.4, -5, -6.6);
  c.fill();
  c.fillStyle = pal.trim;
  c.fillRect(-0.8, -6, 1.6, 13);
  c.fillRect(-4, -2.6, 8, 1.6);
  c.restore();
}
function torso(c, P, A, pal, hero) {
  const at = A.at;
  const b = P.breath * 0.45;
  c.save();
  const [hx, hy] = A.hip;
  c.translate(hx, hy);
  c.rotate(P.lean);
  if (P.fall) {
    // la caída ya está aplicada en el contexto (ver body), aquí sólo inclinación local
  }
  const metal = pal.metal;
  if (hero === "inquisidor") {
    // abrigo largo con faldones
    c.fillStyle = clothGrad(c, pal.cloth, -8, -18, 8, 12);
    c.beginPath();
    c.moveTo(-6.5, -18.5);
    c.lineTo(6.5 + b, -18.5);
    c.quadraticCurveTo(9 + b, -9, 7.5, -1);
    c.lineTo(10.5, 11);
    c.quadraticCurveTo(2, 13, -9.5, 11.5);
    c.lineTo(-7.5, -1);
    c.quadraticCurveTo(-8.5, -10, -6.5, -18.5);
    c.fill();
    c.strokeStyle = shade(pal.cloth, 0.45);
    c.lineWidth = 0.7;
    line(c, 1.5, -1, 2.5, 12, 0.7, shade(pal.cloth, 0.5));
    // solapas y botones
    c.fillStyle = shade(pal.cloth, 0.3);
    poly(c, [1, -18, 6.5 + b, -18, 3.5, -6]);
    c.fill();
    c.fillStyle = pal.trim;
    for (let i = 0; i < 3; i++) c.fillRect(4.6, -12 + i * 3.6, 1.2, 1.2);
    // peto oscuro
    c.fillStyle = metalGrad(c, metal, -4, -17, 6, -6);
    poly(c, [-4.5, -17, 2, -17.5, 4, -8, -3.5, -7]);
    c.fill();
    // cinturón con bolsitas
    c.fillStyle = pal.leather;
    c.fillRect(-7.6, -2.2, 15.6, 2.6);
    c.fillStyle = pal.trim;
    c.fillRect(2.2, -2.4, 2.4, 3);
    c.fillStyle = shade(pal.leather, 0.2);
    c.fillRect(-6, 0, 3.2, 3.4);
  } else {
    // falda de placas (faldas) bajo el cinturón
    c.fillStyle = metalGrad(c, metal, -7, -1, 7, 6);
    poly(c, [-7.2, -1, 7.6, -1, 8.6, 4.6, -7.8, 4.6]);
    c.fill();
    c.strokeStyle = shade(metal, 0.5);
    c.lineWidth = 0.6;
    line(c, -7.4, 2, 8, 2, 0.6, shade(metal, 0.5));
    // peto
    c.fillStyle = metalGrad(c, metal, -8, -19, 9, -1);
    c.beginPath();
    c.moveTo(-6.8, -18.6);
    c.lineTo(5.5, -18.8);
    c.quadraticCurveTo(10.2 + b, -14, 9.4 + b * 0.6, -7);
    c.quadraticCurveTo(8.6, -2.5, 7, -0.8);
    c.lineTo(-7, -0.8);
    c.quadraticCurveTo(-8.6, -10, -6.8, -18.6);
    c.fill();
    // brillo especular del peto
    c.strokeStyle = light(metal, 0.75);
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(4.5, -17);
    c.quadraticCurveTo(8.2 + b, -13.5, 7.8, -8.5);
    c.stroke();
    // tabardo (paño frontal colgante)
    c.fillStyle = clothGrad(c, pal.cloth, -3, -17, 6, 10);
    c.beginPath();
    c.moveTo(-1.5, -17.5);
    c.lineTo(5.2, -17.6);
    c.quadraticCurveTo(8 + b, -11, 7.2, -1);
    c.lineTo(7.8, 9.5);
    c.lineTo(5.6, 8.6);
    c.lineTo(3.4, 9.8);
    c.lineTo(1.2, 8.8);
    c.lineTo(-0.8, 9.6);
    c.lineTo(-1.2, -1);
    c.quadraticCurveTo(-2.2, -9, -1.5, -17.5);
    c.fill();
    c.strokeStyle = pal.trim;
    c.lineWidth = 0.7;
    c.beginPath();
    c.moveTo(-1.1, -16.8);
    c.quadraticCurveTo(-1.8, -9, -0.9, -1);
    c.lineTo(-0.5, 9);
    c.stroke();
    if (hero === "cruzada") {
      c.fillStyle = pal.trim;
      c.fillRect(2.6, -15, 1.4, 9);
      c.fillRect(0.2, -12.2, 6.4, 1.4);
    } else sun(c, 3.6, -10.5, 3.4, pal.trim);
    // cinturón
    c.fillStyle = pal.leather;
    poly(c, [-7.4, -2.6, 8.4, -2.8, 8.2, -0.2, -7.4, 0]);
    c.fill();
    c.fillStyle = pal.trim;
    c.fillRect(3, -3, 2.6, 3.2);
    c.fillStyle = shade(pal.trim, 0.5);
    c.fillRect(3.7, -2.2, 1.2, 1.6);
  }
  // gola (protección del cuello)
  c.fillStyle = metalGrad(c, metal, -5, -21, 5, -17);
  c.beginPath();
  c.ellipse(0, -18.5, 6, 2.6, 0, 0, TAU);
  c.fill();
  c.restore();
}
function head(c, P, A, pal, hero) {
  const [x, y] = A.head;
  c.save();
  c.translate(x, y);
  c.rotate(P.lean + P.head);
  const metal = pal.metal;
  if (hero === "inquisidor") {
    // capucha/cuello alto, cara en sombra con ojos brillantes y sombrero de ala ancha
    c.fillStyle = clothGrad(c, pal.cape, -7, -6, 7, 8);
    c.beginPath();
    c.ellipse(0, 1, 7.2, 7.4, 0, 0, TAU);
    c.fill();
    c.fillStyle = "#120c16";
    c.beginPath();
    c.ellipse(2.6, 1.4, 4.4, 4.6, 0, 0, TAU);
    c.fill();
    c.fillStyle = pal.eyes || "#e7c9ff";
    c.fillRect(3.2, 0.2, 1.8, 1.1);
    c.fillRect(5.8, 0.3, 1.1, 1);
    c.fillStyle = clothGrad(c, "#2b2333", -13, -9, 13, -4);
    c.beginPath();
    c.ellipse(0.6, -4.2, 13.5, 3, -0.06, 0, TAU);
    c.fill();
    c.fillStyle = clothGrad(c, "#3a2f45", -6, -14, 6, -4);
    c.beginPath();
    c.moveTo(-5.6, -4.8);
    c.quadraticCurveTo(-5, -13.6, 1.4, -14.2);
    c.quadraticCurveTo(6.6, -13, 6.2, -4.6);
    c.closePath();
    c.fill();
    c.fillStyle = pal.trim;
    poly(c, [-5.4, -6.4, 6.2, -6.2, 6.1, -5, -5.5, -5.2]);
    c.fill();
    c.restore();
    return;
  }
  if (hero === "cruzada") {
    // trenza que asoma por detrás
    c.strokeStyle = pal.hair;
    c.lineWidth = 2.6;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(-5, 3);
    c.quadraticCurveTo(-10 + P.cape * 8, 8, -9 - P.capeLift * 3, 14);
    c.stroke();
    c.strokeStyle = shade(pal.hair, 0.35);
    c.lineWidth = 0.6;
    for (let i = 0; i < 3; i++) line(c, -6.5 - i * 1, 6 + i * 2.6, -8.6 - i * 1, 6.6 + i * 2.6, 0.6, shade(pal.hair, 0.35));
    // celada con visera y cola
    c.fillStyle = metalGrad(c, metal, -8, -9, 8, 7);
    c.beginPath();
    c.moveTo(-10.5, 4.5);
    c.quadraticCurveTo(-9, -9.5, 1, -9.6);
    c.quadraticCurveTo(9, -9.4, 8.6, 1);
    c.lineTo(8.8, 6.4);
    c.lineTo(-2, 6.6);
    c.quadraticCurveTo(-7, 6, -10.5, 4.5);
    c.fill();
    c.fillStyle = "#101418";
    poly(c, [2, -1.4, 8.8, -1.6, 8.8, 0.4, 2.2, 0.6]);
    c.fill();
    c.strokeStyle = pal.trim;
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(-9.8, 3.6);
    c.quadraticCurveTo(-8.4, -8.6, 1, -8.8);
    c.stroke();
    // penacho
    c.fillStyle = pal.plume;
    c.beginPath();
    c.moveTo(0, -9.4);
    c.quadraticCurveTo(-2, -16, -9 - P.capeLift * 4, -13 + P.capeLift * 2);
    c.quadraticCurveTo(-5, -11, -4, -9);
    c.closePath();
    c.fill();
    c.strokeStyle = light(metal, 0.7);
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(-3, -7.6);
    c.quadraticCurveTo(3, -8.6, 6.2, -5.4);
    c.stroke();
    c.restore();
    return;
  }
  // Paladín: yelmo de cubo con visera en T, cruz dorada y cimera
  c.fillStyle = pal.plume;
  c.beginPath();
  c.moveTo(-1, -9.6);
  c.quadraticCurveTo(-4, -15.5, -11 - P.capeLift * 5, -12 + P.capeLift * 3 + P.cape * 6);
  c.quadraticCurveTo(-7, -12, -5.4, -8.6);
  c.closePath();
  c.fill();
  c.fillStyle = metalGrad(c, metal, -8, -10, 9, 8);
  c.beginPath();
  c.moveTo(-7.6, 6.6);
  c.lineTo(-8.2, -5.5);
  c.quadraticCurveTo(-7.8, -10.2, 0.4, -10.4);
  c.quadraticCurveTo(8.6, -10.2, 8.8, -5.2);
  c.lineTo(9.2, 6.4);
  c.quadraticCurveTo(1, 8.2, -7.6, 6.6);
  c.fill();
  // placa frontal un poco más oscura (da volumen 3/4)
  c.fillStyle = shade(metal, 0.18);
  poly(c, [3.6, -9.6, 8.8, -5.2, 9.2, 6.4, 4.2, 7.4]);
  c.fill();
  // visera en T
  c.fillStyle = "#0d1013";
  poly(c, [1.6, -2.4, 9.3, -2.6, 9.3, -0.7, 1.8, -0.5]);
  c.fill();
  poly(c, [5.6, -0.8, 7.2, -0.8, 7.2, 4.4, 5.6, 4.4]);
  c.fill();
  // cruz dorada y remaches
  c.fillStyle = pal.trim;
  poly(c, [6, -10, 7, -9.8, 7.3, -3, 5.8, -3]);
  c.fill();
  poly(c, [-8, -4.6, 9, -4.4, 9, -3.2, -8, -3.4]);
  c.fill();
  c.fillStyle = shade(pal.trim, 0.45);
  for (const [rx, ry] of [[-5.5, 3], [-2.5, 4.2], [0.6, 5]]) c.fillRect(rx, ry, 0.9, 0.9);
  // respiraderos
  c.fillStyle = "#1a1e22";
  for (let i = 0; i < 3; i++) c.fillRect(2.4 + i * 1.3, 2, 0.6, 2.4);
  c.strokeStyle = light(metal, 0.8);
  c.lineWidth = 0.8;
  c.beginPath();
  c.moveTo(-6.4, -6);
  c.quadraticCurveTo(-5.4, -9.2, 0.8, -9.4);
  c.stroke();
  c.restore();
}
/** Cuerpo completo de un cuadro (sin brazos/arma salvo `withArms` para muerte/retratos). */
export function drawBody(c, hero, pal, P) {
  const A = anchors(P);
  c.save();
  if (P.fall) {
    c.translate(-3, 16);
    c.rotate(P.fall);
    c.translate(3, -16);
  }
  // en el contexto girado las anclas deben ignorar la caída: usar una pose sin fall
  const Pl = { ...P, fall: 0 },
    L = anchors(Pl);
  const [hx, hy] = L.hip;
  if (pal.back === "cape" || hero === "paladin") cape(c, Pl, L, pal, hero);
  if (hero === "cruzada") {
    cape(c, { ...Pl, capeLift: Pl.capeLift * 0.6 }, L, { ...pal, cape: pal.cape }, hero);
    shield(c, L, pal);
  }
  if (hero === "inquisidor") {
    // faldón trasero del abrigo
    const lift = Pl.capeLift;
    c.fillStyle = clothGrad(c, pal.cape, hx - 9, hy - 4, hx, hy + 13);
    c.beginPath();
    c.moveTo(hx - 6, hy - 6);
    c.quadraticCurveTo(hx - 10 - lift * 5, hy + 4, hx - 11 - lift * 8 + Pl.cape * 8, hy + 12 - lift * 4);
    c.lineTo(hx + 2, hy + 12);
    c.closePath();
    c.fill();
  }
  leg(c, hx - 1.8, hy + 1, Pl.legB, Pl.kneeB, pal, true, hero);
  leg(c, hx + 1.8, hy + 1, Pl.legF, Pl.kneeF, pal, false, hero);
  torso(c, Pl, L, pal, hero);
  head(c, Pl, L, pal, hero);
  c.restore();
  return A;
}
// Silueta de contorno: dilata el cuadro en 8 direcciones con el color de tinta.
function outline(dst, src, r, ink) {
  const tmp = document.createElement("canvas");
  tmp.width = src.width;
  tmp.height = src.height;
  const t = tmp.getContext("2d");
  t.drawImage(src, 0, 0);
  t.globalCompositeOperation = "source-in";
  t.fillStyle = ink;
  t.fillRect(0, 0, tmp.width, tmp.height);
  const d = dst.getContext("2d");
  for (let i = 0; i < 12; i++) {
    const a = (i * TAU) / 12;
    d.drawImage(tmp, Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r));
  }
  d.drawImage(src, 0, 0);
}

// ---------- Brazos y armas (por frame) ----------
function ik(sx, sy, hx, hy, L1, L2, bendSign) {
  let dx = hx - sx,
    dy = hy - sy;
  let d = Math.hypot(dx, dy) || 0.001;
  const max = L1 + L2 - 0.2;
  if (d > max) {
    hx = sx + (dx / d) * max;
    hy = sy + (dy / d) * max;
    dx = hx - sx;
    dy = hy - sy;
    d = max;
  }
  const a = Math.atan2(dy, dx),
    cosA = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1),
    ang = a + bendSign * Math.acos(cosA);
  return { ex: sx + Math.cos(ang) * L1, ey: sy + Math.sin(ang) * L1, hx, hy };
}
export function drawArm(c, sx, sy, hx, hy, pal, hero, dark = false, bend = 1) {
  const { ex, ey, hx: x, hy: y } = ik(sx, sy, hx, hy, 7.5, 7.5, bend);
  const ink = "#15100d",
    base = hero === "inquisidor" ? pal.cloth : pal.metal,
    col = dark ? shade(base, 0.3) : base;
  c.lineCap = "round";
  c.lineJoin = "round";
  for (const [w, color] of [[6.6, ink], [4.4, col]]) {
    c.strokeStyle = color;
    c.lineWidth = w;
    c.beginPath();
    c.moveTo(sx, sy);
    c.lineTo(ex, ey);
    c.lineTo(x, y);
    c.stroke();
  }
  c.strokeStyle = light(col, 0.45);
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(sx, sy - 1);
  c.lineTo(ex, ey - 1.2);
  c.stroke();
  // codera + guantelete
  c.fillStyle = ink;
  c.beginPath();
  c.arc(x, y, 3.1, 0, TAU);
  c.fill();
  c.fillStyle = hero === "inquisidor" ? pal.leather : dark ? shade(pal.metal, 0.35) : light(pal.metal, 0.1);
  c.beginPath();
  c.arc(x, y, 2.2, 0, TAU);
  c.fill();
  return [x, y];
}
export function drawPauldron(c, x, y, pal, hero, lean = 0) {
  // hombrera de placas superpuestas (lamas), más plana que alta para no tapar el yelmo
  c.save();
  c.translate(x + 0.6, y + 1.4);
  c.rotate(lean + 0.18);
  const base = hero === "inquisidor" ? shade(pal.cloth, 0.05) : shade(pal.metal, 0.08);
  const lame = (dy, rx, ry) => {
    c.fillStyle = "#15100d";
    c.beginPath();
    c.ellipse(0, dy, rx + 0.9, ry + 0.9, 0, Math.PI, 0);
    c.lineTo(rx + 0.9, dy + 1.2);
    c.lineTo(-rx - 0.9, dy + 1.2);
    c.closePath();
    c.fill();
    c.fillStyle = metalGrad(c, base, -rx, dy - ry, rx, dy + 1);
    c.beginPath();
    c.ellipse(0, dy, rx, ry, 0, Math.PI, 0);
    c.lineTo(rx, dy + 0.5);
    c.lineTo(-rx, dy + 0.5);
    c.closePath();
    c.fill();
  };
  lame(2.6, 4.2, 2.2);
  lame(0.4, 4.8, 3.2);
  c.strokeStyle = pal.trim;
  c.lineWidth = 0.7;
  c.beginPath();
  c.ellipse(0, 0.4, 4.3, 2.7, 0, Math.PI + 0.25, -0.25);
  c.stroke();
  c.fillStyle = light(base, 0.75);
  c.fillRect(-2.6, -2, 2.4, 0.7);
  c.restore();
}
/** Espada larga horizontal (empuñadura en x=0, hoja hacia +x): pomo, puño, guarda, hoja de doble filo. */
export function drawSword(c, pal = HERO_STYLE.paladin) {
  const ink = "#15100d";
  c.lineJoin = "round";
  // hoja
  const blade = () => {
    c.beginPath();
    c.moveTo(1.6, -2.1);
    c.lineTo(38, -1.7);
    c.lineTo(44.5, 0);
    c.lineTo(38, 1.7);
    c.lineTo(1.6, 2.1);
    c.closePath();
  };
  blade();
  c.strokeStyle = ink;
  c.lineWidth = 1.5;
  c.stroke();
  const g = c.createLinearGradient(0, -2, 0, 2);
  g.addColorStop(0, "#f4f8f9");
  g.addColorStop(0.48, "#c9d3d8");
  g.addColorStop(0.52, "#8f9ba3");
  g.addColorStop(1, "#b7c2c8");
  c.fillStyle = g;
  blade();
  c.fill();
  // acanaladura (vaceo)
  c.strokeStyle = "#7c8890";
  c.lineWidth = 0.7;
  line(c, 3.5, 0, 30, 0, 0.7, "#7c8890");
  c.strokeStyle = "#ffffff";
  c.lineWidth = 0.45;
  line(c, 4, -1.2, 36, -1.1, 0.45, "#ffffffcc");
  // guarda
  c.fillStyle = ink;
  c.fillRect(-0.9, -7.8, 3.4, 15.6);
  c.fillStyle = metalGrad(c, pal.trim, -1, -7, 2, 7);
  c.beginPath();
  c.moveTo(-0.2, -7);
  c.quadraticCurveTo(0.8, -7.8, 1.8, -7);
  c.lineTo(1.8, 7);
  c.quadraticCurveTo(0.8, 7.8, -0.2, 7);
  c.closePath();
  c.fill();
  // puño de cuero con vendas
  c.fillStyle = ink;
  c.fillRect(-8.2, -1.9, 7.6, 3.8);
  c.fillStyle = "#6a4128";
  c.fillRect(-7.6, -1.3, 6.8, 2.6);
  c.strokeStyle = "#3d2416";
  c.lineWidth = 0.5;
  for (let i = 0; i < 4; i++) line(c, -7 + i * 1.7, -1.3, -6.2 + i * 1.7, 1.3, 0.5, "#3d2416");
  // pomo
  c.fillStyle = ink;
  c.beginPath();
  c.arc(-9.6, 0, 2.9, 0, TAU);
  c.fill();
  c.fillStyle = metalGrad(c, pal.trim, -11, -2, -8, 2);
  c.beginPath();
  c.arc(-9.6, 0, 2.1, 0, TAU);
  c.fill();
}
/** Arco largo de una pieza, en coordenadas del arco (x = hacia donde apunta, empuñadura en 0,0). */
export function drawBow(c, st, pal) {
  const ink = "#15100d",
    half = 27;
  const tipX = -6 - st.draw * 4.5,
    tipY = half - st.draw * 2.2;
  const pt = (t, sign) => {
    // cuadrática de la empuñadura (2,0) a la punta, control adelante
    const u = 1 - t;
    return [u * u * 2 + 2 * u * t * 7.5 + t * t * tipX, sign * (2 * u * t * 15 + t * t * tipY)];
  };
  const outer = [],
    inner = [];
  for (const sign of [-1, 1]) {
    for (let i = 0; i <= 10; i++) {
      const t = i / 10,
        [x, y] = pt(t, sign),
        w = lerp(3.2, 1.2, t);
      (sign < 0 ? outer : inner).push([x, y, w]);
    }
  }
  const nock = [tipX - st.draw * 14 + (st.vib || 0), 0];
  // cuerda
  c.strokeStyle = "#efe6cf";
  c.lineWidth = 0.75;
  c.beginPath();
  c.moveTo(tipX, -tipY);
  c.lineTo(nock[0], nock[1]);
  c.lineTo(tipX, tipY);
  c.stroke();
  // duela (dos brazos)
  for (const limb of [outer, inner]) {
    c.beginPath();
    limb.forEach(([x, y, w], i) => (i ? c.lineTo(x + w / 2, y) : c.moveTo(x + w / 2, y)));
    for (let i = limb.length - 1; i >= 0; i--) c.lineTo(limb[i][0] - limb[i][2] / 2, limb[i][1]);
    c.closePath();
    c.strokeStyle = ink;
    c.lineWidth = 1.3;
    c.stroke();
    const g = c.createLinearGradient(-2, 0, 6, 0);
    g.addColorStop(0, "#5a3519");
    g.addColorStop(0.55, "#a8723c");
    g.addColorStop(1, "#d2a161");
    c.fillStyle = g;
    c.fill();
  }
  // empuñadura y puntas de asta
  c.fillStyle = ink;
  c.fillRect(-0.3, -4.2, 4.8, 8.4);
  c.fillStyle = "#7a2e2a";
  c.fillRect(0.3, -3.6, 3.6, 7.2);
  c.fillStyle = "#e8dcc0";
  for (const s of [-1, 1]) {
    c.beginPath();
    c.arc(tipX, s * tipY, 1.1, 0, TAU);
    c.fill();
  }
  if (st.arrow) {
    const back = nock[0] - (1 - st.nock) * 10;
    drawArrowShape(c, back, 0, 36, pal);
  }
  return nock;
}
/** Flecha horizontal desde la muesca (x0) con longitud len: astil, plumas y punta de acero. */
export function drawArrowShape(c, x0, y0, len = 36, pal) {
  const ink = "#15100d";
  c.strokeStyle = ink;
  c.lineWidth = 2.1;
  line(c, x0, y0, x0 + len - 4, y0, 2.1, ink);
  line(c, x0, y0, x0 + len - 4, y0, 1.1, "#caa06a");
  // plumas
  const fl = (dy, color) => {
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(x0 + 1, y0);
    c.lineTo(x0 + 2, y0 + dy * 2.8);
    c.lineTo(x0 + 8, y0 + dy * 1.4);
    c.lineTo(x0 + 9, y0);
    c.closePath();
    c.fill();
    c.strokeStyle = ink;
    c.lineWidth = 0.5;
    c.stroke();
  };
  fl(-1, "#f3eee2");
  fl(1, pal?.cape ? light(pal.cape, 0.1) : "#b23a3a");
  // punta
  c.fillStyle = ink;
  poly(c, [x0 + len - 5.5, y0 - 2.6, x0 + len + 1.2, y0, x0 + len - 5.5, y0 + 2.6]);
  c.fill();
  c.fillStyle = "#dfe6ea";
  poly(c, [x0 + len - 4.8, y0 - 1.7, x0 + len, y0, x0 + len - 4.8, y0 + 1.7]);
  c.fill();
}

// ---------- Atlas ----------
export function createHeroArt() {
  const atlases = new Map(),
    misc = new Map();
  function canvas(w, h) {
    const cv = document.createElement("canvas");
    cv.width = Math.ceil(w);
    cv.height = Math.ceil(h);
    return cv;
  }
  function frameCanvas(draw) {
    const pw = FRAME.w * RS,
      ph = FRAME.h * RS;
    const raw = canvas(pw, ph),
      c = raw.getContext("2d");
    c.scale(RS, RS);
    c.translate(FRAME.ox, FRAME.oy);
    draw(c);
    const out = canvas(pw, ph);
    outline(out, raw, 1.15 * RS, "#15100d");
    return out;
  }
  // Atlas por héroe+skin+animación (perezoso: una animación se construye la primera vez que se usa).
  function anim(hero, skin, name) {
    const key = hero + ":" + skin + ":" + name;
    let a = atlases.get(key);
    if (a) return a;
    const def = ANIMS[name],
      pal = heroPalette(hero, skin);
    const frames = [];
    for (let i = 0; i < def.n; i++) {
      const u = def.loop ? i / def.n : i / (def.n - 1);
      const P = bodyPose(name, u);
      let A;
      const cv = frameCanvas((c) => {
        A = drawBody(c, hero, pal, P);
        if (name === "death") {
          // brazos flojos dentro del cuadro (no se dibujan por frame durante la muerte)
          const [sx, sy] = A.shoulderF,
            [bx, by] = A.shoulderB;
          drawArm(c, bx, by, bx - 3 + P.fall * 6, by + 13 + P.fall * 2, pal, hero, true);
          drawArm(c, sx, sy, sx + 4 + P.fall * 8, sy + 13, pal, hero);
          drawPauldron(c, sx, sy, pal, hero, P.lean + P.fall);
        }
      });
      frames.push({ cv, P, A });
    }
    a = { frames, pal };
    atlases.set(key, a);
    return a;
  }
  function tinted(src, color, alpha) {
    const out = canvas(src.width, src.height),
      c = out.getContext("2d");
    c.drawImage(src, 0, 0);
    c.globalCompositeOperation = "source-atop";
    c.globalAlpha = alpha;
    c.fillStyle = color;
    c.fillRect(0, 0, out.width, out.height);
    return out;
  }
  function flashFrame(hero, skin, name, i) {
    const key = `flash:${hero}:${skin}:${name}:${i}`;
    if (!misc.has(key)) misc.set(key, tinted(anim(hero, skin, name).frames[i].cv, "#ffffff", 0.85));
    return misc.get(key);
  }
  function ghost(hero, skin) {
    const key = `ghost:${hero}:${skin}`;
    if (!misc.has(key)) {
      const pal = heroPalette(hero, skin);
      misc.set(key, tinted(anim(hero, skin, "dash").frames[1].cv, pal.glow || "#bfe6ff", 0.7));
    }
    return misc.get(key);
  }
  function sword(pal) {
    const key = "sword:" + pal.trim;
    if (!misc.has(key)) {
      const cv = canvas(60 * RS, 18 * RS),
        c = cv.getContext("2d");
      c.scale(RS, RS);
      c.translate(13, 9);
      drawSword(c, pal);
      misc.set(key, cv);
    }
    return misc.get(key);
  }
  function arrow(trail) {
    const key = "arrow:" + trail;
    if (!misc.has(key)) {
      const cv = canvas(84 * RS, 8 * RS),
        c = cv.getContext("2d");
      c.scale(RS, RS);
      c.translate(46, 4);
      if (trail) {
        const g = c.createLinearGradient(-46, 0, -6, 0);
        g.addColorStop(0, "#fff6d800");
        g.addColorStop(1, "#fff6d899");
        c.fillStyle = g;
        poly(c, [-46, -0.4, -4, -1.6, -4, 1.6, -46, 0.4]);
        c.fill();
      }
      drawArrowShape(c, -36, 0, 36, HERO_STYLE.paladin);
      misc.set(key, cv);
    }
    return misc.get(key);
  }
  return {
    anim,
    flashFrame,
    ghost,
    sword,
    arrow,
    warm(hero, skin) {
      for (const n of Object.keys(ANIMS)) if (n !== "death") anim(hero, skin, n);
    },
    clear() {
      atlases.clear();
      misc.clear();
    },
    get frameCount() {
      let n = 0;
      for (const a of atlases.values()) n += a.frames.length;
      return n;
    },
  };
}

// ---------- Sprites generados (atlas) ----------
// Recoloreo por skin: capa/penacho (rojos saturados) cambian de tono; algunas skins tiñen también el acero.
const SKIN_RECOLOR = {
  moon: { hue: 205, sat: 0.85, val: 0.95, steel: [150, 190, 220, 0.18] },
  ember: { hue: 24, sat: 1, val: 1.05, steel: [230, 160, 120, 0.12] },
  bronze: { hue: 26, sat: 0.7, val: 0.62, steel: [200, 140, 80, 0.45] },
  stellar: { hue: 262, sat: 0.8, val: 0.9, steel: [180, 160, 235, 0.2] },
};
function rgb2hsv(r, g, b) {
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b),
    d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, mx ? d / mx : 0, mx / 255];
}
function hsv2rgb(h, s, v) {
  const c = v * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = v - c;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
/** Recolorea in-place un buffer RGBA (Uint8ClampedArray) para la skin dada. Devuelve cuántos píxeles cambió. */
export function recolorPixels(data, skin) {
  const R = SKIN_RECOLOR[skin];
  if (!R) return 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    const [h, s, v] = rgb2hsv(r, g, b);
    if ((h >= 340 || h <= 16) && s > 0.42 && v > 0.18) {
      const [nr, ng, nb] = hsv2rgb(R.hue, Math.min(1, s * R.sat), Math.min(1, v * R.val));
      data[i] = nr;
      data[i + 1] = ng;
      data[i + 2] = nb;
      n++;
    } else if (s < 0.16 && v > 0.3 && R.steel) {
      const [tr, tg, tb, k] = R.steel,
        lum = (r + g + b) / 3 / 255;
      data[i] = lerp(r, tr * lum * 1.25, k);
      data[i + 1] = lerp(g, tg * lum * 1.25, k);
      data[i + 2] = lerp(b, tb * lum * 1.25, k);
      n++;
    }
  }
  return n;
}
/** Elige el cuadro del atlas para el estado del héroe. Devuelve el nombre o null si no hay sprite para ese caso. */
// Vistas de frente/espalda (2.3): prefijo f_ (hacia abajo) / k_ (hacia arriba). Golpe y muerte usan el costado.
export const DIR_PREFIX = { front: "f_", back: "k_" };
export const DIR_REQUIRED = [
  ...[0, 1, 2, 3, 4, 5].flatMap((i) => ["walk" + i, "bowwalk" + i]), "a0", "a1", "a2", "dash", "bow0", "bow1", "bow2",
];
export function hasDirection(frames, dir) {
  const p = DIR_PREFIX[dir];
  return !!p && DIR_REQUIRED.every((n) => frames[p + n]);
}
// Vista según el ángulo de mira/movimiento, con histéresis (8 direcciones: diagonales = costado espejado).
export function pickView(prev, facing) {
  const sn = Math.sin(facing);
  if (prev === "front") return sn > 0.5 ? "front" : sn < -0.72 ? "back" : "side";
  if (prev === "back") return sn < -0.5 ? "back" : sn > 0.72 ? "front" : "side";
  return sn > 0.72 ? "front" : sn < -0.72 ? "back" : "side";
}
function dirFrame(o, p) {
  const F = o.frames;
  const has = (n) => (F[p + n] ? p + n : null);
  if (o.anim === "dash") return has("dash");
  if (o.weapon === "crossbow") {
    const st = o.bow;
    if (st && (o.shooting || st.vib)) {
      if (st.vib || !st.arrow) return has("bow0");
      return has(st.draw < 0.3 ? "bow0" : st.draw < 0.75 ? "bow1" : "bow2");
    }
    if (o.anim === "walk") return has("bowwalk" + (Math.floor(o.walk * 6) % 6));
    return has("bow0");
  }
  if (o.weapon !== "sword") return null;
  if (o.swing) {
    const sw = SWINGS[o.swing.variant] || SWINGS[0],
      t = o.swing.t;
    if (t < sw.strike[0]) return has("a0");
    if (t < sw.strike[1] + 0.02) return has("a1");
    if (t < sw.keys[3][0] + 0.04) return has("a2");
  }
  if (o.anim === "walk") return has("walk" + (Math.floor(o.walk * 6) % 6));
  return has("walk2");
}
export function spriteFrame(o) {
  const F = o.frames;
  const has = (n) => (F[n] ? n : null);
  if (o.anim === "death") return has("death" + Math.min(4, Math.floor((o.fi * 5) / 8)));
  if (o.dir && DIR_PREFIX[o.dir] && o.anim !== "hit") {
    const d = dirFrame(o, DIR_PREFIX[o.dir]);
    if (d) return d;
  }
  if (o.anim === "dash") return has(o.fi < 2 ? "dash0" : "dash1");
  if (o.anim === "hit") return has(o.fi < 2 ? "hit0" : "hit1");
  if (o.weapon === "crossbow") {
    const st = o.bow;
    if (st && (o.shooting || st.vib)) {
      if (st.vib || !st.arrow) return has("bow3");
      return has(st.draw < 0.3 ? "bow0" : st.draw < 0.75 ? "bow1" : "bow2");
    }
    if (o.anim === "walk") return has("bowwalk" + (Math.floor(o.walk * 6) % 6));
    return has("bow0");
  }
  if (o.weapon !== "sword") return null;
  if (o.swing) {
    const v = o.swing.variant,
      sw = SWINGS[v] || SWINGS[0],
      t = o.swing.t,
      p = ["a", "b", "c"][v] || "a";
    if (t < sw.strike[0]) return has(p + "0");
    if (t < sw.strike[1] + 0.02) return has(p + "1");
    if (t < sw.keys[3][0] + 0.04) return has(p + "2");
  }
  if (o.anim === "walk") return has("walk" + (Math.floor(o.walk * 6) % 6));
  return has("idle");
}
export const SPRITE_REQUIRED = [
  "idle", ...[0, 1, 2, 3, 4, 5].flatMap((i) => ["walk" + i, "bowwalk" + i]), "dash0", "dash1", "hit0", "hit1",
  "death0", "death1", "death2", "death3", "death4", "a0", "a1", "a2", "b0", "b1", "b2", "c0", "c1", "c2",
  "bow0", "bow1", "bow2", "bow3",
];
export function createSpriteHeroes(sets, env = globalThis) {
  // sets: { hero: atlasData }. Carga perezosa; mientras no cargue (o si falla) se usa el arte procedural.
  const state = new Map();
  function get(hero) {
    const data = sets[hero];
    // sólo héroes con el juego COMPLETO de cuadros (si falta alguno, todo procedural: nunca mezclar estilos)
    if (!data || !env.Image || !SPRITE_REQUIRED.every((n) => data.frames[n])) return null;
    let s = state.get(hero);
    if (!s) {
      s = { data, img: new env.Image(), ready: false, failed: false, skins: new Map(), tints: new Map() };
      s.img.decoding = "async";
      s.img.onload = () => (s.ready = true);
      s.img.onerror = () => (s.failed = true);
      try {
        s.img.src = new URL(data.src, env.document?.baseURI || env.location?.href).href;
      } catch {
        s.failed = true;
      }
      state.set(hero, s);
    }
    return s.ready && !s.failed ? s : null;
  }
  function canvasOf(s) {
    const c = env.document.createElement("canvas");
    c.width = s.img.naturalWidth;
    c.height = s.img.naturalHeight;
    return c;
  }
  function skinned(s, skin) {
    if (!SKIN_RECOLOR[skin]) return s.img;
    if (!s.skins.has(skin)) {
      let out = s.img;
      try {
        const c = canvasOf(s),
          x = c.getContext("2d", { willReadFrequently: true });
        x.drawImage(s.img, 0, 0);
        const d = x.getImageData(0, 0, c.width, c.height);
        recolorPixels(d.data, skin);
        x.putImageData(d, 0, 0);
        out = c;
      } catch {}
      s.skins.set(skin, out);
    }
    return s.skins.get(skin);
  }
  function tinted(s, skin, color, alpha) {
    const key = skin + color;
    if (!s.tints.has(key)) {
      const c = canvasOf(s),
        x = c.getContext("2d");
      x.drawImage(skinned(s, skin), 0, 0);
      x.globalCompositeOperation = "source-atop";
      x.globalAlpha = alpha;
      x.fillStyle = color;
      x.fillRect(0, 0, c.width, c.height);
      s.tints.set(key, c);
    }
    return s.tints.get(key);
  }
  return {
    get,
    /** Dibuja un cuadro con los pies en (0, feetY) en coordenadas locales. mode: normal|flash|ghost */
    draw(c, hero, skin, name, feetY = 16, mode = "normal", breathe = 0) {
      const s = get(hero);
      const f = s?.data.frames[name];
      if (!f) return false;
      const img = mode === "flash" ? tinted(s, skin, "#ffffff", 0.85) : mode === "ghost" ? tinted(s, skin, "#bfe6ff", 0.7) : skinned(s, skin);
      const k = 1 / s.data.rsa,
        [x, y, w, h, ax, ay] = f;
      c.drawImage(img, x, y, w, h, -ax * k, feetY - ay * k * (1 + breathe), w * k, h * k * (1 + breathe));
      return true;
    },
    warm(hero, skin) {
      const s = get(hero);
      if (s) skinned(s, skin);
    },
    has: (hero) => !!get(hero),
  };
}
