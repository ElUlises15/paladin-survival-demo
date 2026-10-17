import { PRODUCTS } from "./monetization.js";
import { POLICY } from "./data.js";
let forceFailure = false,
  serial = 0,
  adPresenter = null,
  purchasePresenter = null,
  lastHaptic = -Infinity;
const win = () => (typeof window === "undefined" ? null : window);
export function configureDemo({ ad, purchase, fail } = {}) {
  if (ad) adPresenter = ad;
  if (purchase) purchasePresenter = purchase;
  if (fail !== undefined) forceFailure = fail;
}
export function withTimeout(
  promise,
  ms = POLICY.adTimeoutMs,
  fallback = { error: "timeout" },
) {
  let timer;
  return Promise.race([
    Promise.resolve(promise),
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(fallback), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}
let ready;
async function native() {
  const w = win();
  if (!w) return null;
  if (w.PaladinNative?.isNative) return w.PaladinNative;
  if (w.PaladinNativeReady) {
    if (!ready)
      ready = withTimeout(w.PaladinNativeReady, 1500, null).catch(() => null);
    await ready;
  }
  return w.PaladinNative?.isNative ? w.PaladinNative : null;
}
const demo = {
  ads: {
    init: async () => ({ canRequestAds: true, privacyOptionsRequired: false }),
    showPrivacyOptions: async () => {},
    showRewarded: async (kind) => ({
      rewarded: !forceFailure && !!(await adPresenter?.(kind)),
      error: forceFailure ? "demo" : "",
    }),
    showInterstitial: async () => ({
      shown: !forceFailure && !!(await adPresenter?.("interstitial")),
    }),
    preload() {},
  },
  billing: {
    init: async () => ({ available: true }),
    getProducts: async () => PRODUCTS,
    purchase: async (id) => {
      if (!(await purchasePresenter?.(id)))
        return { ok: false, cancelled: true };
      const transactionId = `demo-${Date.now()}-${++serial}`;
      return { ok: true, transactionId };
    },
    finish: async () => {},
    restore: async () => ({ owned: [] }),
  },
  haptics: {
    impact(style) {
      try {
        win()?.navigator?.vibrate?.(
          { light: 12, medium: 25, heavy: 45 }[style] || 12,
        );
      } catch {}
    },
    notify() {
      try {
        win()?.navigator?.vibrate?.(25);
      } catch {}
    },
  },
};
// Tiempo máximo por llamada. Mostrar un anuncio o completar una compra puede tardar bastante (el usuario mira el video
// o está en el diálogo de Google Play): nunca cortarlos con el timeout corto, o se perdería la recompensa/compra.
const LONG_MS = {
  "ads.init": 45000,
  "ads.showRewarded": 180000,
  "ads.showInterstitial": 90000,
  "ads.showPrivacyOptions": 300000,
  "billing.purchase": 600000,
  "billing.restore": 20000,
  "billing.getProducts": 20000,
};
async function call(group, key, args, fallback) {
  try {
    const n = await native(),
      method = n?.[group]?.[key] || (!n ? demo[group]?.[key] : null);
    if (!method) return fallback;
    return await withTimeout(
      method.apply(n?.[group] || demo[group], args),
      LONG_MS[`${group}.${key}`] || POLICY.adTimeoutMs,
      fallback,
    );
  } catch (e) {
    console.warn("Plataforma:", group, key, e);
    return fallback;
  }
}
function bindNative(kind, cb) {
  let bound = false;
  native().then((n) => {
    try {
      if (n?.app?.[kind]) {
        n.app[kind](cb);
        bound = true;
      }
    } catch (e) {
      console.warn(e);
    }
  });
  if (kind === "onPause" || kind === "onResume")
    win()?.document?.addEventListener("visibilitychange", () => {
      if (!bound && win().document.hidden === (kind === "onPause")) cb();
    });
}
export const platform = {
  get isNative() {
    return !!win()?.PaladinNative?.isNative;
  },
  ads: {
    init: () =>
      call("ads", "init", [], {
        canRequestAds: false,
        privacyOptionsRequired: false,
      }),
    showPrivacyOptions: () => call("ads", "showPrivacyOptions", [], undefined),
    showRewarded: (kind) =>
      call("ads", "showRewarded", [kind], { rewarded: false }),
    showInterstitial: () =>
      call("ads", "showInterstitial", [], { shown: false }),
    preload: () => call("ads", "preload", [], undefined),
  },
  billing: {
    init: () => call("billing", "init", [], { available: false }),
    getProducts: () => call("billing", "getProducts", [], PRODUCTS),
    purchase: (id) => call("billing", "purchase", [id], { ok: false }),
    finish: (tx, id) => call("billing", "finish", [tx, id], undefined),
    restore: () =>
      call("billing", "restore", [], { owned: [], error: "unavailable" }),
  },
  haptics: {
    impact(style) {
      const now = Date.now();
      if (now - lastHaptic < 80) return;
      lastHaptic = now;
      void call("haptics", "impact", [style], undefined);
    },
    notify(type) {
      const now = Date.now();
      if (now - lastHaptic < 80) return;
      lastHaptic = now;
      void call("haptics", "notify", [type], undefined);
    },
  },
  app: {
    onPause: (cb) => bindNative("onPause", cb),
    onResume: (cb) => bindNative("onResume", cb),
    onBack: (cb) => bindNative("onBack", cb),
  },
};
