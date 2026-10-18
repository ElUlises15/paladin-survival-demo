// Enemigos y jefes con arte dibujado (2.3): atlas generado (art-src/build_enemies.py) + selección de cuadro.
// Sólo presentación: nada de esto toca la simulación. Si el atlas no carga, el renderer usa el arte procedural.
import { ENEMY_ATLASES } from "./enemyatlas-data.js";

export const ENEMY_POSES = ["walk0", "walk1", "walk2", "walk3", "wind", "atk", "hit", "death0", "death1", "death2"];
export const BOSS_KINDS = ["boss-ent", "boss-osario", "boss-ignar"];
// Altura de la pose de caminata en unidades de mundo (coincide con build_enemies.py).
export const ENEMY_HEIGHT = {
  imp: 42, brute: 74, stalker: 38, warlock: 58, turret: 52, spirit: 54,
  "boss-ent": 150, "boss-osario": 150, "boss-ignar": 150,
};
export const DEATH_DUR = 0.5;
export const DEATH_FADE = 0.45;

export function enemyKind(type, floor, boss = false) {
  const world = Math.max(0, Math.min(2, Math.floor((floor - 1) / 3)));
  if (boss) return BOSS_KINDS[world];
  return ["imp", "brute", "stalker", "warlock", floor < 4 ? "turret" : "spirit"][type] || "imp";
}

/**
 * Cuadro de animación de un enemigo vivo.
 * o: { kind, boss, type, stun, windup, telegraph, charge, cd, sinceAttack, near, walk, moving, time }
 */
export function enemyFrame(o) {
  if (o.stun > 0.07) return "hit";
  if (o.sinceAttack < (o.boss ? 0.4 : 0.28)) return "atk";
  if (o.boss) {
    if (o.charge > 0) return "atk";
    if (o.windup > 0) return "wind";
  } else if (o.type >= 3) {
    if (o.telegraph) return "wind";
  } else if (o.type === 2) {
    if (o.charge > 0) return "atk";
    if (o.cd > 0 && o.cd < 0.35) return "wind";
  } else if (o.near) return (o.time * 2 + (o.id || 0) * 0.37) % 1 < 0.55 ? "wind" : "atk";
  if (o.kind === "turret" || o.kind === "spirit") return "walk" + (Math.floor(o.time * 6 + (o.id || 0)) % 4);
  if (!o.moving) return "walk0";
  return "walk" + (Math.floor(o.walk * 4) % 4);
}
/** Cuadro y opacidad de un enemigo que muere (age en s desde la muerte); null = terminó. */
export function deathFrame(age) {
  if (age < 0) return { name: "hit", alpha: 1 };
  if (age >= DEATH_DUR + DEATH_FADE) return null;
  const i = Math.min(2, Math.floor((age / DEATH_DUR) * 3));
  return { name: "death" + i, alpha: age < DEATH_DUR ? 1 : 1 - (age - DEATH_DUR) / DEATH_FADE };
}
export function hasEnemySet(atlas, kind) {
  return !!atlas && ENEMY_POSES.every((n) => atlas.frames[kind + ":" + n]);
}

export function createEnemySprites(atlases = ENEMY_ATLASES, env = globalThis) {
  const sheets = new Map();
  function sheet(key) {
    const data = atlases[key];
    if (!data || !env.Image) return null;
    let s = sheets.get(key);
    if (!s) {
      s = { data, img: new env.Image(), ready: false, failed: false, tints: new Map() };
      s.img.decoding = "async";
      s.img.onload = () => (s.ready = true);
      s.img.onerror = () => (s.failed = true);
      try {
        s.img.src = new URL(data.src, env.document?.baseURI || env.location?.href).href;
      } catch {
        s.failed = true;
      }
      sheets.set(key, s);
    }
    return s.ready && !s.failed ? s : null;
  }
  const keyOf = (kind) => (kind.startsWith("boss") ? "bosses" : "enemies");
  function tinted(s, color, alpha) {
    const key = color + alpha;
    if (!s.tints.has(key)) {
      const c = env.document.createElement("canvas");
      c.width = s.img.naturalWidth;
      c.height = s.img.naturalHeight;
      const x = c.getContext("2d");
      x.drawImage(s.img, 0, 0);
      x.globalCompositeOperation = "source-atop";
      x.globalAlpha = alpha;
      x.fillStyle = color;
      x.fillRect(0, 0, c.width, c.height);
      s.tints.set(key, c);
    }
    return s.tints.get(key);
  }
  return {
    ready(kind) {
      const s = sheet(keyOf(kind));
      return !!s && hasEnemySet(s.data, kind);
    },
    /** Dibuja con los pies en (0, 0) local; mode: normal | flash | rage */
    draw(c, kind, pose, mode = "normal") {
      const s = sheet(keyOf(kind));
      const f = s?.data.frames[kind + ":" + pose];
      if (!f) return false;
      const img = mode === "flash" ? tinted(s, "#ffffff", 0.8) : mode === "rage" ? tinted(s, "#ff4a1c", 0.28) : s.img;
      const k = 1 / s.data.rsa,
        [x, y, w, h, ax, ay] = f;
      c.drawImage(img, x, y, w, h, -ax * k, -ay * k, w * k, h * k);
      return true;
    },
    warm() {
      sheet("enemies");
      sheet("bosses");
    },
  };
}
