// Fichas de héroes y armas para Tienda/Héroes: textos, rol, estadísticas normalizadas, comparación y desbloqueo.
// Puro (sin DOM): lo usan main.js y los tests.
import { HEROES, WEAPONS, RARITIES, BOW, bowShot, CRIT_MULT } from "./data.js";

export const WEAPON_INFO = {
  sword: { tier: 0, role: "Versátil · cuerpo a cuerpo", lore: "Forjada en el Santuario. Combo de tres tajos que no perdona a quien se acerque." },
  crossbow: { tier: 0, role: "Distancia · carga", lore: "Arco largo de tejo. Mantené para tensar: a tope, la flecha atraviesa." },
  spear: { tier: 1, role: "Alcance · estocada", lore: "Punta bendecida que llega antes que el enemigo. Arco de golpe angosto." },
  axes: { tier: 1, role: "Ráfaga · doble golpe", lore: "Dos hojas gemelas: cada ataque golpea dos veces. Rápidas y cortas." },
  hammer: { tier: 2, role: "Lento · empuje", lore: "El Juicio cae despacio, pero aplasta y empuja a todo lo que alcanza." },
  staff: { tier: 3, role: "Mágico · teledirigido", lore: "Orbes de luz que buscan solos a su presa. Lentos, pero no fallan." },
};
export const HERO_INFO = {
  paladin: { role: "Equilibrado", lore: "Guardián del Santuario. Sin puntos débiles: el mejor para empezar.", skillDesc: "Gira con su espada sagrada y golpea a todos los enemigos cercanos (75 de daño)." },
  cruzada: { role: "Tanque · defensa", lore: "Veterana de mil asedios. Más vida y escudo, a cambio de un paso más lento.", skillDesc: "Levanta una cúpula que bloquea balas durante 2.5 s." },
  inquisidor: { role: "Daño de área · frágil", lore: "Cazador de herejes. Rápido y letal, pero cae si lo rodean.", skillDesc: "Descarga un martillo de luz en un gran radio: 110 de daño y aturde 2 s." },
};
export const SKIN_INFO = {
  classic: "La armadura del Santuario, pulida y sencilla.",
  moon: "Acero templado bajo la luna: reflejos fríos y azules.",
  ember: "Placas tocadas por el fuego del Abismo.",
  bronze: "Bronce antiguo de la primera orden.",
  stellar: "Polvo de estrellas: el brillo del Pase del Paladín.",
};

export const tierOf = (id) => WEAPON_INFO[id]?.tier ?? 0;
export const tierColor = (tier) => RARITIES[Math.max(0, Math.min(RARITIES.length - 1, tier))].color;
export const tierName = (tier) => RARITIES[Math.max(0, Math.min(RARITIES.length - 1, tier))].name;
export function weaponCost(id) {
  return 150 + WEAPONS.findIndex((w) => w.id === id) * 65;
}

// Máximos de cada barra (escala común para que las armas se comparen entre sí).
export const STAT_MAX = { damage: 90, speed: 3.2, range: 640, crit: 0.2, knockback: 100, hp: 150, armor: 30, move: 260, cooldown: 14 };

/** Estadísticas de un arma. `value` crudo, `bar` 0..1, `text` para mostrar. */
export function weaponStats(id, rarity = 0) {
  const w = WEAPONS.find((v) => v.id === id) || WEAPONS[0];
  const mult = RARITIES[rarity]?.mult ?? 1;
  const hits = w.hits || 1;
  let damage = w.damage * mult * hits,
    speed = 1 / w.cooldown,
    range = w.range,
    knock = w.knockback || 15,
    damageText = `${Math.round(damage)}${hits > 1 ? ` (${hits}×${Math.round(w.damage * mult)})` : ""}`,
    speedText = `${speed.toFixed(1)}/s`,
    speedShort = speedText,
    rangeText = `${Math.round(range)}`,
    knockText = `${knock}`;
  if (w.charge) {
    const full = bowShot(w.damage * mult, BOW.FULL);
    damage = full.damage;
    speed = 1 / (BOW.FULL + full.cooldown);
    range = full.range;
    knock = 35;
    damageText = `${Math.round(bowShot(w.damage * mult, BOW.FULL * 0.5).damage)}–${Math.round(full.damage)}`;
    speedText = `${speed.toFixed(1)}/s a tope`;
    speedShort = `${speed.toFixed(1)}/s`;
    rangeText = `${Math.round(bowShot(w.damage * mult, BOW.MIN).range)}–${Math.round(full.range)}`;
    knockText = "10–35";
  } else if (w.projectile) {
    knock = 10;
    knockText = "10";
  }
  const stat = (key, label, icon, value, max, text, short = text) => ({ key, label, icon, value, bar: Math.max(0, Math.min(1, value / max)), text, short });
  return [
    stat("damage", "Daño", "sword", damage, STAT_MAX.damage, damageText),
    stat("speed", "Cadencia", "dash", speed, STAT_MAX.speed, speedText, speedShort),
    stat("range", "Alcance", "crossbow", range, STAT_MAX.range, rangeText),
    stat("crit", "Crítico", "star", w.crit || 0, STAT_MAX.crit, `${Math.round((w.crit || 0) * 100)}% ×${CRIT_MULT}`),
    stat("knockback", "Empuje", "shield", knock, STAT_MAX.knockback, knockText),
  ];
}
export function heroStats(id) {
  const h = HEROES[id] || HEROES.paladin;
  const stat = (key, label, icon, value, max, text, lowerIsBetter = false) => ({ key, label, icon, value, bar: Math.max(0, Math.min(1, value / max)), text, lowerIsBetter });
  return [
    stat("hp", "Vida", "heart", h.hp, STAT_MAX.hp, `${h.hp}`),
    stat("armor", "Escudo", "shield", h.armor, STAT_MAX.armor, `${h.armor}`),
    stat("move", "Velocidad", "dash", h.speed, STAT_MAX.move, `${h.speed}`),
    stat("cooldown", "Recarga", "skill", h.cooldown, STAT_MAX.cooldown, `${h.cooldown} s`, true),
  ];
}
/** Diferencias contra lo equipado: +1 mejor (verde), -1 peor (rojo), 0 igual. */
export function compareStats(stats, base) {
  return stats.map((s) => {
    const b = base.find((x) => x.key === s.key);
    const diff = b ? s.value - b.value : 0;
    const eps = Math.max(1e-6, Math.abs(b?.value || 0) * 0.005);
    const better = Math.abs(diff) < eps ? 0 : (diff > 0) !== !!s.lowerIsBetter ? 1 : -1;
    return { key: s.key, diff, better, text: deltaText(s.key, diff) };
  });
}
function deltaText(key, d) {
  if (Math.abs(d) < 1e-6) return "=";
  const sign = d > 0 ? "+" : "−";
  const a = Math.abs(d);
  if (key === "crit") return `${sign}${Math.round(a * 100)}%`;
  if (key === "speed") return `${sign}${a.toFixed(1)}/s`;
  if (key === "cooldown") return `${sign}${a % 1 ? a.toFixed(1) : a} s`;
  return `${sign}${Math.round(a)}`;
}
/** Cómo se desbloquea (o null si ya es tuyo). */
export function unlockInfo(kind, id, meta, vip = false) {
  if (kind === "hero") {
    if (meta.heroes.includes(id)) return null;
    const cost = HEROES[id].cost;
    return { currency: "almas", cost, affordable: meta.almas >= cost, hint: `Desbloqueá con ${cost} almas. Las almas se ganan venciendo enemigos y pisos.` };
  }
  if (kind === "weapon") {
    if (meta.weapons.includes(id)) return null;
    const cost = weaponCost(id);
    return { currency: "almas", cost, affordable: meta.almas >= cost, hint: `Desbloqueo permanente: ${cost} almas. Después aparece en cofres y tiendas.` };
  }
  return null;
}
