import { soundSettings } from "./sound.js";
import { HEROES, TALENTS, WEAPONS, SKINS } from "./data.js";
export const SAVE_KEY = "paladin.v2.save";
export function freshSave() {
  return {
    version: 2,
    tutorialSeen: false,
    almas: 0,
    gemas: 0,
    heroes: ["paladin"],
    weapons: ["sword", "crossbow"],
    skins: ["classic"],
    selectedHero: "paladin",
    selectedSkin: "classic",
    talents: {},
    settings: {
      ...soundSettings(),
      haptics: true,
      shake: true,
      quality: "auto",
    },
    bestFloor: 1,
    completedOnce: false,
    stats: { runs: 0, defeats: 0, kills: 0, rooms: 0, victories: 0 },
    monetization: {
      sessions: 0,
      lastActivity: 0,
      lastInterstitial: 0,
      lastRewarded: 0,
      processed: [],
      removeAds: false,
      vipUntil: 0,
      daily: { day: "", ads: 0, vip: false },
    },
    checkpoint: null,
  };
}
const number = (v, f = 0) => (Number.isFinite(v) && v >= 0 ? v : f);
export function migrateSave(raw) {
  const d = freshSave();
  if (!raw || typeof raw !== "object") return d;
  for (const k of ["almas", "gemas", "bestFloor"]) d[k] = number(raw[k], d[k]);
  for (const [key, allowed] of [
    ["heroes", Object.keys(HEROES)],
    ["weapons", WEAPONS.map((w) => w.id)],
    ["skins", SKINS.map((s) => s.id)],
  ])
    if (Array.isArray(raw[key]))
      d[key] = [
        ...new Set([
          ...(key === "weapons" ? d[key] : d[key].slice(0, 1)),
          ...raw[key].filter((x) => allowed.includes(x)),
        ]),
      ];
  if (d.heroes.includes(raw.selectedHero)) d.selectedHero = raw.selectedHero;
  if (d.skins.includes(raw.selectedSkin) || raw.selectedSkin === "stellar")
    d.selectedSkin = raw.selectedSkin;
  for (const [k, v] of Object.entries(TALENTS))
    d.talents[k] = Math.min(v.max, Math.floor(number(raw.talents?.[k])));
  for (const k of ["sound", "music", "haptics"])
    if (typeof raw.settings?.[k] === "boolean") d.settings[k] = raw.settings[k];
  Object.assign(d.settings, soundSettings(raw.settings));
  d.completedOnce = raw.completedOnce === true;
  d.tutorialSeen = raw.tutorialSeen === true;
  d.settings.shake = raw.settings?.shake !== false;
  d.settings.quality = ["low", "high", "auto"].includes(raw.settings?.quality)
    ? raw.settings.quality
    : "auto";
  for (const k of Object.keys(d.stats)) d.stats[k] = number(raw.stats?.[k]);
  const m = raw.monetization || {};
  for (const k of [
    "sessions",
    "lastActivity",
    "lastInterstitial",
    "lastRewarded",
    "vipUntil",
  ])
    d.monetization[k] = number(m[k]);
  d.monetization.removeAds = m.removeAds === true;
  d.monetization.processed = Array.isArray(m.processed)
    ? m.processed.filter((v) => typeof v === "string")
    : [];
  if (m.daily && typeof m.daily.day === "string")
    d.monetization.daily = {
      day: m.daily.day,
      ads: Math.min(3, number(m.daily.ads)),
      vip: m.daily.vip === true,
    };
  const c = raw.checkpoint;
  if (
    c &&
    Number.isInteger(c.floor) &&
    c.floor >= 1 &&
    c.floor <= 9 &&
    Number.isFinite(c.seed) &&
    HEROES[c.hero] &&
    Number.isFinite(c.hp) &&
    c.hp > 0 &&
    Number.isFinite(c.oro) &&
    Array.isArray(c.weapons) &&
    c.weapons.length === 2 &&
    c.weapons.every(
      (w) =>
        WEAPONS.some((v) => v.id === w.id) &&
        Number.isInteger(w.rarity) &&
        w.rarity >= 0 &&
        w.rarity < 4,
    )
  )
    d.checkpoint = {
      ...c,
      oro: number(c.oro),
      buff: number(c.buff),
      time: number(c.time),
      kills: number(c.kills),
      rooms: number(c.rooms),
      rewards: {
        almas: number(c.rewards?.almas),
        gemas: number(c.rewards?.gemas),
      },
      revived: c.revived === true,
    };
  return d;
}
export function createSaveStore(storage) {
  let memory = freshSave();
  return {
    load() {
      try {
        const raw = storage?.getItem(SAVE_KEY);
        if (raw) memory = migrateSave(JSON.parse(raw));
      } catch {}
      return memory;
    },
    save(value) {
      memory = value;
      try {
        storage?.setItem(SAVE_KEY, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    reset() {
      memory = freshSave();
      try {
        storage?.removeItem(SAVE_KEY);
      } catch {}
      return memory;
    },
  };
}
