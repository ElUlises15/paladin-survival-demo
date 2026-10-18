export const WORLDS = [
  "Bosque Maldito",
  "Catacumbas Olvidadas",
  "Abismo Ígneo",
];
export const BOSSES = ["Ent Corrompido", "Rey Osario", "Archidemonio Ignar"];
export const HEROES = {
  paladin: {
    name: "Paladín",
    hp: 100,
    armor: 20,
    speed: 220,
    skill: "Giro Sagrado",
    cooldown: 8,
    cost: 0,
  },
  cruzada: {
    name: "Cruzada",
    hp: 120,
    armor: 25,
    speed: 205,
    skill: "Égida",
    cooldown: 12,
    cost: 600,
  },
  inquisidor: {
    name: "Inquisidor",
    hp: 90,
    armor: 15,
    speed: 235,
    skill: "Martillo de Luz",
    cooldown: 10,
    cost: 1500,
  },
};
export const WEAPONS = [
  {
    id: "sword",
    name: "Espada Larga",
    damage: 24,
    range: 105,
    arc: 1.7,
    cooldown: 0.43,
    icon: "⚔",
  },
  {
    id: "hammer",
    name: "Martillo del Juicio",
    damage: 57,
    range: 115,
    arc: 2.6,
    cooldown: 1,
    knockback: 90,
    icon: "⚒",
  },
  {
    id: "spear",
    name: "Lanza Sagrada",
    damage: 32,
    range: 185,
    arc: 0.55,
    cooldown: 0.55,
    icon: "➶",
  },
  {
    id: "crossbow",
    name: "Arco Largo",
    damage: 27,
    range: 560,
    cooldown: 0.5,
    projectile: 520,
    charge: true, // arco cargado: mantener = tensar, soltar = disparar (ver BOW / bowShot)
    icon: "➹",
  },
  {
    id: "staff",
    name: "Báculo de Luz",
    damage: 42,
    range: 560,
    cooldown: 0.85,
    projectile: 250,
    homing: true,
    icon: "✦",
  },
  {
    id: "axes",
    name: "Hachas Gemelas",
    damage: 14,
    range: 90,
    arc: 2,
    cooldown: 0.32,
    hits: 2,
    icon: "⚔",
  },
];
export const RARITIES = [
  { name: "Común", mult: 1, color: "#b7c4c9" },
  { name: "Rara", mult: 1.25, color: "#55baff" },
  { name: "Épica", mult: 1.6, color: "#c382ff" },
  { name: "Legendaria", mult: 2.1, color: "#ffd463" },
];
export const TALENTS = {
  vigor: { name: "Vigor", max: 5, desc: "+8% vida" },
  filo: { name: "Filo", max: 5, desc: "+5% daño" },
  bastion: { name: "Bastión", max: 3, desc: "+1 escudo" },
  reflejos: { name: "Reflejos", max: 3, desc: "−8% recarga dash" },
  bolsa: { name: "Bolsa", max: 3, desc: "+15 oro inicial" },
  fe: { name: "Fe", max: 3, desc: "−6% recarga skill" },
};
export const SKINS = [
  { id: "classic", name: "Clásica", cost: 0, color: "#d4bc77" },
  { id: "moon", name: "Luz de Luna", cost: 250, color: "#8ad5ee" },
  { id: "ember", name: "Ascua", cost: 400, color: "#eb8975" },
  { id: "bronze", name: "Paladín de Bronce", product: true, color: "#bd8752" },
  { id: "stellar", name: "Paladín Estelar", vip: true, color: "#bd9aff" },
];
export const POLICY = {
  interstitialEveryNDefeats: 3,
  minInterstitialMs: 180000,
  sessionGapMs: 1800000,
  firstSessions: 2,
  minRuns: 3,
  adTimeoutMs: 10000,
};
// Arco largo cargado. Tensado completo en FULL s; por debajo de MIN s sale una flecha débil y corta
// (spamear no rinde). Daño/alcance/velocidad crecen con el nivel de tensado; a tope atraviesa 1 enemigo.
export const BOW = { FULL: 1.0, MIN: 0.15, SLOW: 0.32, COOLDOWN: 0.24, WEAK_COOLDOWN: 0.42 };
export function bowLevel(draw) {
  return Math.max(0, Math.min(1, (draw || 0) / BOW.FULL));
}
export function bowShot(baseDamage, draw) {
  const t = bowLevel(draw);
  if ((draw || 0) < BOW.MIN)
    return { level: t, weak: true, full: false, damage: baseDamage * 0.25, speed: 300, range: 150, pierce: 0, cooldown: BOW.WEAK_COOLDOWN };
  const full = t >= 1;
  return {
    level: t, weak: false, full,
    damage: baseDamage * (0.35 + 2.85 * Math.pow(t, 1.3)),
    speed: 360 + 400 * t,
    range: 230 + 400 * t,
    pierce: full ? 1 : 0,
    cooldown: BOW.COOLDOWN,
  };
}
export function weapon(id = "sword", rarity = 0) {
  return { id, rarity };
}
const weaponCache = new Map();
export function weaponData(w) {
  const key = w.id + ":" + (w.rarity || 0);
  if (weaponCache.has(key)) return weaponCache.get(key);
  const d = WEAPONS.find((v) => v.id === w.id) || WEAPONS[0];
  const result = { ...d, damage: d.damage * RARITIES[w.rarity || 0].mult };
  weaponCache.set(key, result);
  return result;
}
