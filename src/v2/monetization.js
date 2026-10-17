import { POLICY } from "./data.js";
export const PRODUCTS = [
  { id: "remove_ads", title: "Quitar anuncios", price: "USD 2.99", gems: 300 },
  { id: "gems_small", title: "500 gemas", price: "USD 0.99", gems: 500 },
  { id: "gems_medium", title: "1.200 gemas", price: "USD 1.99", gems: 1200 },
  { id: "gems_large", title: "3.500 gemas", price: "USD 4.99", gems: 3500 },
  { id: "gems_huge", title: "8.000 gemas", price: "USD 9.99", gems: 8000 },
  {
    id: "starter_pack",
    title: "Pack inicial · Bronce + 800 gemas",
    price: "USD 1.99",
    gems: 800,
  },
  {
    id: "vip_monthly",
    title: "Pase del Paladín",
    price: "USD 2.99/mes",
    basePlan: "monthly",
    gems: 0,
  },
];
export function vipActive(meta, now) {
  return meta.monetization.vipUntil > now;
}
export function shouldShowInterstitial(
  meta,
  now,
  { victory = false, rewardedInFlow = false } = {},
) {
  const m = meta.monetization;
  return (
    !victory &&
    !rewardedInFlow &&
    !m.removeAds &&
    !vipActive(meta, now) &&
    m.sessions > POLICY.firstSessions &&
    meta.stats.runs >= POLICY.minRuns &&
    meta.stats.defeats > 0 &&
    meta.stats.defeats % POLICY.interstitialEveryNDefeats === 0 &&
    now - m.lastInterstitial >= POLICY.minInterstitialMs
  );
}
export function recordSession(meta, now) {
  const m = meta.monetization;
  if (!m.sessions || now - m.lastActivity > POLICY.sessionGapMs) m.sessions++;
  m.lastActivity = now;
}
export function creditPurchase(meta, id, transactionId, now, expiresAt) {
  const p = PRODUCTS.find((p) => p.id === id),
    m = meta.monetization;
  if (!p || !transactionId || m.processed.includes(transactionId)) return false;
  if (id === "vip_monthly") {
    if (!Number.isFinite(expiresAt) || expiresAt <= now) return false;
    m.vipUntil = expiresAt;
  } else if (id === "remove_ads") {
    if (!m.removeAds) meta.gemas += p.gems;
    m.removeAds = true;
  } else if (id === "starter_pack") {
    if (!meta.skins.includes("bronze")) {
      meta.skins.push("bronze");
      meta.gemas += p.gems;
    }
  } else meta.gemas += p.gems;
  m.processed.push(transactionId);
  return true;
}
export function daily(meta, now) {
  const day = new Date(now).toISOString().slice(0, 10);
  if (meta.monetization.daily.day !== day)
    meta.monetization.daily = { day, ads: 0, vip: false };
  return meta.monetization.daily;
}
export function claimDaily(meta, now, kind) {
  const d = daily(meta, now);
  if (kind === "vip") {
    if (d.vip || !vipActive(meta, now)) return false;
    d.vip = true;
    meta.gemas += 40;
  } else {
    if (d.ads >= 3) return false;
    d.ads++;
    meta.gemas += 50;
  }
  return true;
}
