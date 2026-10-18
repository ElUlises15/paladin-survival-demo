// Galería de héroes, armas y apariencias: grilla de fichas + hoja de detalle con comparación.
// Sólo presentación; las compras/equipamiento las resuelve main.js mediante ctx.act().
import { HEROES, WEAPONS, SKINS } from "./data.js";
import { iconSvg } from "./icons.js";
import { WEAPON_INFO, HERO_INFO, SKIN_INFO, weaponStats, heroStats, compareStats, unlockInfo, tierOf, tierColor, tierName } from "./catalog.js";

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

/**
 * ctx: { meta, vip(), button(label, fn, cls), portrait(canvas, hero, skin, opts), act(kind, id) → Promise|void }
 */
export function createGallery(ctx) {
  let sheet = null,
    lastFocus = null,
    current = null;

  function entry(kind, id) {
    const m = ctx.meta();
    if (kind === "hero") {
      const h = HEROES[id],
        info = HERO_INFO[id],
        lock = unlockInfo("hero", id, m);
      return {
        kind, id, name: h.name, role: info.role, lore: info.lore, color: "#e2c27d", tier: null,
        stats: heroStats(id), base: heroStats(m.selectedHero), baseName: HEROES[m.selectedHero].name,
        equipped: m.selectedHero === id, lock,
        skill: { name: h.skill, cooldown: h.cooldown, desc: info.skillDesc },
        action: lock ? `Desbloquear · ${lock.cost} ◈` : m.selectedHero === id ? "Elegido" : "Elegir",
      };
    }
    if (kind === "weapon") {
      const w = WEAPONS.find((v) => v.id === id),
        info = WEAPON_INFO[id],
        lock = unlockInfo("weapon", id, m),
        eq = m.weapons.includes(m.startWeapon) ? m.startWeapon : "sword";
      return {
        kind, id, name: w.name, role: info.role, lore: info.lore, tier: info.tier, color: tierColor(info.tier),
        stats: weaponStats(id), base: weaponStats(eq), baseName: WEAPONS.find((v) => v.id === eq).name,
        equipped: eq === id, lock,
        action: lock ? `Desbloquear · ${lock.cost} ◈` : eq === id ? "Equipada" : "Equipar",
      };
    }
    const sk = SKINS.find((s) => s.id === id),
      owned = m.skins.includes(id) || (sk.vip && ctx.vip());
    const lock = owned
      ? null
      : sk.vip
        ? { hint: "Exclusiva del Pase del Paladín: activalo en la Tienda.", shop: true }
        : sk.product
          ? { hint: "Incluida en el Pack inicial de la Tienda.", shop: true }
          : { currency: "gemas", cost: sk.cost, affordable: m.gemas >= sk.cost, hint: `Comprala con ${sk.cost} gemas.` };
    return {
      kind, id, name: sk.name, role: "Apariencia · solo cosmética", lore: SKIN_INFO[id] || "", color: sk.color, tier: null,
      stats: [], base: [], equipped: m.selectedSkin === id, lock,
      action: owned ? (m.selectedSkin === id ? "Elegida" : "Usar") : lock.shop ? "Ver en tienda" : `Comprar · ${sk.cost} ✧`,
    };
  }

  function art(e, big) {
    const box = el("div", "item-art" + (e.lock ? " is-locked" : ""));
    box.style.setProperty("--tier", e.color);
    if (e.kind === "weapon") {
      box.innerHTML = iconSvg(e.id, { size: big ? 132 : 64, cls: "weapon-art" });
    } else {
      const cv = el("canvas", "portrait-art");
      cv.width = big ? 240 : 120;
      cv.height = big ? 200 : 100;
      cv.setAttribute("aria-hidden", "true");
      const hero = e.kind === "hero" ? e.id : ctx.meta().selectedHero,
        skin = e.kind === "skin" ? e.id : ctx.meta().selectedSkin;
      // el atlas del héroe carga en diferido: repintar hasta que esté listo (máx. ~4 s)
      let tries = 0;
      const draw = () => {
        const ok = ctx.portrait(cv, hero, skin, { silhouette: !!e.lock && e.kind === "hero" });
        if (!ok && tries++ < 20) setTimeout(() => cv.isConnected && draw(), 200);
      };
      draw();
      box.append(cv);
    }
    if (e.lock) box.insertAdjacentHTML("beforeend", `<span class="lock-badge" aria-hidden="true">${lockSvg()}</span>`);
    return box;
  }

  function statRow(s, delta, mini) {
    const row = el("div", "stat-row" + (mini ? " mini" : ""));
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", `${s.label}: ${s.text}${delta && delta.better ? (delta.better > 0 ? `, mejor (${delta.text})` : `, peor (${delta.text})`) : ""}`);
    row.innerHTML = iconSvg(s.icon, { cls: "stat-ico" });
    if (!mini) row.append(el("span", "stat-label", s.label));
    const bar = el("span", "stat-bar");
    bar.setAttribute("aria-hidden", "true");
    const fill = el("i");
    fill.style.width = `${Math.round(s.bar * 100)}%`;
    bar.append(fill);
    row.append(bar, el("span", "stat-value", mini ? s.short ?? s.text : s.text));
    if (delta && !mini) {
      const d = el("span", "stat-delta " + (delta.better > 0 ? "up" : delta.better < 0 ? "down" : "same"), delta.text);
      d.setAttribute("aria-hidden", "true");
      row.append(d);
    }
    return row;
  }

  function card(kind, id) {
    const e = entry(kind, id);
    const c = el("article", "item-card" + (e.lock ? " locked" : "") + (e.equipped ? " selected" : ""));
    c.style.setProperty("--tier", e.color);
    c.dataset.id = id;
    const open = el("button", "item-open");
    open.type = "button";
    open.setAttribute("aria-label", `${e.name}${e.lock ? " (bloqueado)" : e.equipped ? " (equipado)" : ""}. Ver detalles`);
    open.onclick = () => openSheet(kind, id);
    open.append(art(e, false));
    const body = el("div", "item-body");
    const top = el("div", "item-top");
    if (e.tier != null) top.append(el("span", "item-tier", tierName(e.tier)));
    if (e.equipped) top.append(el("span", "item-badge", kind === "weapon" ? "Equipada" : "En uso"));
    if (e.lock) top.append(el("span", "item-badge lock", "Bloqueado"));
    body.append(top, el("h3", "item-name", e.name), el("p", "item-role", e.role));
    const minis = el("div", "mini-stats");
    const pick = kind === "weapon" ? ["damage", "speed", "range"] : kind === "hero" ? ["hp", "armor", "move"] : [];
    for (const s of e.stats.filter((s) => pick.includes(s.key))) minis.append(statRow(s, null, true));
    if (kind === "skin") minis.append(el("p", "item-lore", e.lore));
    body.append(minis);
    open.append(body);
    c.append(open);
    const b = ctx.button(e.action, () => act(kind, id), "item-action" + (e.lock && e.lock.cost != null && !e.lock.affordable ? " short" : ""));
    b.disabled = e.equipped && !e.lock;
    c.append(b);
    return c;
  }

  function grid(kind) {
    const g = el("div", "item-grid");
    g.dataset.kind = kind;
    const ids = kind === "hero" ? Object.keys(HEROES) : kind === "weapon" ? WEAPONS.map((w) => w.id) : SKINS.map((s) => s.id);
    for (const id of ids) g.append(card(kind, id));
    return g;
  }

  async function act(kind, id) {
    await ctx.act(kind, id);
    if (sheet) fillSheet(kind, id);
  }

  function fillSheet(kind, id) {
    const e = entry(kind, id);
    current = { kind, id };
    const panel = sheet.querySelector(".sheet-panel");
    panel.innerHTML = "";
    panel.style.setProperty("--tier", e.color);
    const close = el("button", "sheet-close");
    close.type = "button";
    close.setAttribute("aria-label", "Cerrar");
    close.innerHTML = "×";
    close.onclick = closeSheet;
    const left = el("div", "sheet-art");
    left.append(art(e, true));
    if (e.tier != null) left.append(el("span", "item-tier big", tierName(e.tier)));
    const right = el("div", "sheet-info");
    const h = el("h2", "sheet-title", e.name);
    h.id = "sheet-title";
    right.append(h, el("p", "item-role", e.role), el("p", "sheet-lore", e.lore));
    if (e.stats.length) {
      const list = el("div", "sheet-stats");
      const deltas = e.equipped ? null : compareStats(e.stats, e.base);
      for (const s of e.stats) list.append(statRow(s, deltas?.find((d) => d.key === s.key), false));
      right.append(list);
      right.append(el("p", "sheet-compare", e.equipped ? (kind === "weapon" ? "Es tu arma equipada." : "Es tu héroe actual.") : `Comparado con ${e.baseName} (${kind === "weapon" ? "equipada" : "actual"}).`));
    }
    if (e.skill) {
      const sk = el("div", "sheet-skill");
      sk.innerHTML = iconSvg("skill", { cls: "stat-ico" });
      const t = el("div");
      t.append(el("strong", null, `${e.skill.name} · recarga ${e.skill.cooldown} s`), el("p", null, e.skill.desc));
      sk.append(t);
      right.append(sk);
    }
    if (e.kind === "weapon") right.append(el("p", "sheet-note", "En cofres y tiendas puede salir Rara (×1.25), Épica (×1.6) o Legendaria (×2.1)."));
    const foot = el("div", "sheet-foot");
    if (e.lock) {
      const why = el("p", "sheet-unlock");
      why.innerHTML = lockSvg();
      why.append(document.createTextNode(" " + e.lock.hint));
      foot.append(why);
    }
    const b = ctx.button(e.action, () => act(kind, id), "primary sheet-action");
    b.disabled = e.equipped && !e.lock;
    foot.append(b);
    right.append(foot);
    panel.append(close, left, right);
  }

  function openSheet(kind, id) {
    closeSheet(true);
    lastFocus = document.activeElement;
    sheet = el("div", "item-sheet");
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-labelledby", "sheet-title");
    sheet.onclick = (ev) => ev.target === sheet && closeSheet();
    sheet.append(el("div", "sheet-panel"));
    document.body.append(sheet);
    fillSheet(kind, id);
    sheet.querySelector(".sheet-action, .sheet-close")?.focus({ preventScroll: true });
    document.addEventListener("keydown", onKey, true);
  }
  function onKey(ev) {
    if (ev.key === "Escape") {
      ev.stopPropagation();
      ev.preventDefault();
      closeSheet();
    }
  }
  function closeSheet(silent = false) {
    if (!sheet) return false;
    document.removeEventListener("keydown", onKey, true);
    sheet.remove();
    sheet = null;
    current = null;
    if (!silent && lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
    if (!silent) ctx.closed?.();
    return true;
  }
  return { grid, card, openSheet, closeSheet, isOpen: () => !!sheet, current: () => current };
}
function lockSvg() {
  return `<svg class="ico ico-lock" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2" fill="#d9b765" stroke="#15100d" stroke-width="1.6"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="#15100d" stroke-width="3.2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="#d9b765" stroke-width="1.6"/><circle cx="12" cy="15.3" r="1.6" fill="#15100d"/></svg>`;
}
