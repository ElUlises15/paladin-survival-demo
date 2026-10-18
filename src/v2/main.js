import { installViewport, viewport, measure } from "./viewport.js";
import { createErrorLog, createLoopGuard } from "./watchdog.js";
import {
  HEROES,
  WEAPONS,
  SKINS,
  TALENTS,
  WORLDS,
  RARITIES,
  weaponData,
} from "./data.js";
import { createSaveStore } from "./save.js";
import {
  createRun,
  updateRun,
  loadFloor,
  checkpoint,
  nearestInteract,
  revive,
} from "./sim.js";
import {
  PRODUCTS,
  recordSession,
  shouldShowInterstitial,
  creditPurchase,
  claimDaily,
  daily,
  vipActive,
} from "./monetization.js";
import { platform, configureDemo } from "./platform.js";
import { createControls } from "./input.js";
import { createRenderer } from "./renderer.js";
import { createSound } from "./sound.js";
import { createInterpolation } from "./interpolation.js";
installViewport();
const $ = (id) => document.getElementById(id),
  screen = $("screen"),
  modal = $("modal");
let storage;
try {
  storage = localStorage;
} catch {}
const store = createSaveStore(storage);
const errlog = createErrorLog(storage);
window.__paladinErrors = () => errlog.list();
window.addEventListener("error", (e) =>
  errlog.record("window", e.error || e.message),
);
window.addEventListener("unhandledrejection", (e) =>
  errlog.record("promise", e.reason),
);
let meta = store.load(),
  state = null,
  page = "lobby",
  previous = "lobby",
  last = 0,
  acc = 0,
  lastPersist = 0,
  fps = 60,
  flowRewarded = false,
  result = null,
  busy = false,
  busySince = 0,
  loopErrors = 0,
  victoryAt = 0,
  cancelModal = null,
  versionTaps = 0,
  debugVisible = new URLSearchParams(location.search).has("debug");
const renderer = createRenderer($("game")),
  audio = createSound(window, meta.settings),
  interpolation = createInterpolation();
recordSession(meta, Date.now());
persist();
function persist() {
  meta.monetization.lastActivity = Date.now();
  store.save(meta);
}
function toast(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ($("toast").hidden = true), 3000);
}
function icon(kind) {
  const paths = {
    gem: "M8 3h16l6 9-14 18L2 12Z M2 12h28 M8 3l8 27L24 3",
    sword: "M6 25 25 6l2-2 1 5-18 19M5 20l9 9M4 29l5-5",
    crossbow: "M6 5q23 0 21 21M5 6l21 21M4 28 28 4M20 4h8v8",
    staff: "M6 28 23 11M23 3l5 5-5 5-5-5Z",
    hammer: "M7 28 21 14M13 5l6-4 12 12-5 6Z",
    spear: "M4 29 24 9M21 10l7-7-1 9Z",
    axes: "M6 28 25 5M6 5l20 23M4 4l9 2-7 8ZM20 4l9 3-5 7Z",
    skill: "M16 2l4 9 10 5-10 4-4 10-4-10-10-4 10-5Z",
    dash: "M3 10h10M1 17h9M4 24h10M15 6l13 10-13 10 4-10Z",
    hand: "M9 27V14q0-4 3-1V6q0-4 3 0v8-10q3-4 3 0v10-7q3-3 3 1v8q6-5 7-1l-5 12Z",
  };
  return `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="${paths[kind] || paths.sword}"/></svg>`;
}
function button(label, action, cls = "") {
  const b = document.createElement("button");
  b.textContent = label;
  b.className = cls;
  b.onclick = (...args) => {
    audio.unlock();
    audio.play(label.includes("Volver") ? "uiBack" : "uiTap");
    return action(...args);
  };
  return b;
}
function addButton(parent, label, action, cls = "") {
  const b = button(label, action, cls);
  parent.append(b);
  return b;
}
function layout(title, back = "lobby") {
  screen.innerHTML = "";
  const header = document.createElement("header");
  header.className = "header";
  const h = document.createElement("h2");
  h.textContent = title;
  header.append(h);
  addButton(header, "← Volver", () => show(back));
  screen.append(header);
  return screen;
}
function panel(title, description = "") {
  const c = document.createElement("section");
  c.className = "card";
  const h = document.createElement("h3");
  h.textContent = title;
  c.append(h);
  if (description) {
    const p = document.createElement("p");
    p.textContent = description;
    c.append(p);
  }
  return c;
}
function show(name) {
  page = name;
  screen.dataset.page = name;
  interpolation.reset();
  audio.scene(
    name === "results" && result?.victory ? "victory" : name,
    state?.floor,
    state?.enemies.some((e) => e.boss && e.hp > 0),
  );
  $("transition").hidden = true;
  controls?.clear();
  document.body.classList.toggle("playing", name === "game");
  $("hud").hidden = name !== "game";
  $("controls").hidden = name !== "game";
  screen.innerHTML = "";
  $("room-banner").classList.remove("show");
  $("tutorial").hidden = true;
  if (name === "game") {
    if (!meta.tutorialSeen) {
      $("tutorial").hidden = false;
    }

    if (state && state.mode === "paused") state.mode = "playing";
    return;
  }
  if (state?.mode === "playing") state.mode = "paused";
  if (name === "splash") {
    const c = panel(
      "Paladin · Mazmorras",
      "Nueve pisos. Una luz que no se apaga.",
    );
    c.classList.add("title-card");
    const crest = document.createElement("canvas");
    crest.width = crest.height = 160;
    crest.className = "title-crest";
    crest.setAttribute("aria-hidden", "true");
    renderer.crest(crest);
    c.prepend(crest);
    addButton(c, "Tocá para empezar", () => show("lobby"), "primary");
    screen.append(c);
  }
  if (name === "credits") credits();
  if (name === "lobby") lobby();
  if (name === "heroes") heroes();
  if (name === "talents") talents();
  if (name === "shop") shop();
  if (name === "settings") settings();
  if (name === "help") {
    layout("Cómo jugar", previous);
    const c = panel(
      "Explorá. Peleá. Volvé más fuerte.",
      "Recorré nueve pisos en tres mundos. Entrá en las salas para enfrentar oleadas; las rejas se abren cuando vencés a todos. Buscá cofres y comprá con oro. Las almas mejoran talentos y desbloquean héroes; las gemas compran cosméticos.",
    );
    c.innerHTML +=
      "<p>Movete con WASD o flechas. J / Espacio: atacar. K / Shift: esquivar. L / Q: habilidad. E / Tab: cambiar arma. F: interactuar. Esc / P: pausa.</p><p>En el celu: apoyá el pulgar a la izquierda para moverte. Mantené Atacar: apuntás solo. Cuando estés cerca de un objeto, tocá Usar. Esquivá las balas y las zonas marcadas. El escudo se regenera tras tres segundos sin recibir daño.</p><p>Tu partida se guarda al empezar cada piso. Si cerrás, continuás desde ese punto.</p>";
    screen.append(c);
  }
  if (name === "pause") {
    layout("Pausa", "game");
    const c = panel("Tomate un respiro", runStats());
    addButton(c, "Reanudar", () => show("game"), "primary");
    addButton(c, "Ajustes", () => {
      previous = "pause";
      show("settings");
    });
    addButton(c, "Cómo jugar", () => {
      previous = "pause";
      show("help");
    });
    addButton(c, "Abandonar", async () => {
      if (
        await confirmDialog(
          "¿Querés abandonar esta partida?",
          "Perdés el avance de este piso y cobrás lo ganado.",
        )
      )
        finish(false);
    });
    screen.append(c);
  }
  if (name === "death") death();
  screen.dataset.page = name;
  if (name === "results") results();
  renderDebug();
}
function lobby() {
  const vip = vipActive(meta, Date.now());
  if (meta.selectedSkin === "stellar" && !vip) meta.selectedSkin = "classic";
  screen.innerHTML = `<header class="header"><span class="eyebrow">Paladin · Mazmorras</span><span class="currency">◈ ${meta.almas} almas &nbsp; ✧ ${meta.gemas} gemas</span></header><div class="lobby"><section><div class="eyebrow">Un refugio entre las sombras</div><h1>Santuario${meta.completedOnce ? ' <span class="completion-crest" title="Venciste al Abismo">♜</span>' : ""}</h1><p>Elegí tu camino. La oscuridad te espera.</p><div class="hero-art"><canvas id="hero-preview" width="280" height="150" aria-label="Tu héroe"></canvas></div><p class="${vip ? "vip-name" : ""}">${HEROES[meta.selectedHero].name} · ${HEROES[meta.selectedHero].skill}${vip ? " · ✧ Pase del Paladín" : ""}</p></section><nav class="menu" id="menu"></nav></div><footer class="footer"><span id="version">v2.1.1 · Tocá para despertar</span><span class="badge" id="demo-badge">${platform.isNative ? "ANDROID" : "DEMO"}</span></footer>`;
  const m = $("menu");
  if (meta.checkpoint)
    addButton(m, "Continuar partida", () => start(true), "primary");
  addButton(
    m,
    "Jugar",
    async () => {
      if (
        meta.checkpoint &&
        !(await confirmDialog(
          "¿Empezás una partida nueva?",
          "Se reemplaza el punto de guardado anterior.",
        ))
      )
        return;
      start(false);
    },
    "primary",
  );
  for (const [label, p] of [
    ["Héroes", "heroes"],
    ["Talentos", "talents"],
    ["Tienda", "shop"],
    ["Ajustes", "settings"],
    ["Cómo jugar", "help"],
    ["Créditos", "credits"],
  ])
    addButton(m, label, () => {
      previous = "lobby";
      show(p);
    });
  const a = document.createElement("a");
  a.href = "horda.html";
  a.className = "button";
  a.textContent = "Horda clásica";
  m.append(a);
  const d = daily(meta, Date.now());
  const gift = addButton(m, `Regalo diario · +50 ✧ (${d.ads}/3)`, async () => {
    if (await rewarded("daily")) {
      if (claimDaily(meta, Date.now(), "ad")) {
        persist();
        show("lobby");
      }
    }
  });
  gift.disabled = d.ads >= 3;
  if (vip) {
    const b = addButton(m, "Reclamar +40 ✧ del Pase", () => {
      if (claimDaily(meta, Date.now(), "vip")) {
        persist();
        show("lobby");
      }
    });
    b.disabled = d.vip;
  }
  $("version").onclick = () => {
    if (++versionTaps >= 5) {
      debugVisible = true;
      renderDebug();
    }
  };
}
let heroTab = "heroes",
  shopTab = "gems";
function tabs(options, selected, change) {
  const nav = document.createElement("nav");
  nav.className = "screen-tabs";
  for (const [id, label] of options) {
    const b = addButton(
      nav,
      label,
      () => change(id),
      selected === id ? "primary" : "",
    );
    b.setAttribute("aria-pressed", String(id === selected));
  }
  screen.append(nav);
}
function heroes() {
  layout("Héroes y apariencias");
  tabs(
    [
      ["heroes", "Héroes"],
      ["skins", "Apariencias"],
      ["weapons", "Armas"],
    ],
    heroTab,
    (id) => {
      heroTab = id;
      show("heroes");
    },
  );
  const grid = document.createElement("div");
  grid.className = "cards";
  for (const [id, h] of Object.entries(HEROES)) {
    const owned = meta.heroes.includes(id),
      c = panel(h.name, `${h.hp} vida · ${h.armor} escudo · ${h.skill}`);
    const portrait = document.createElement("canvas");
    portrait.width = 100;
    portrait.height = 80;
    portrait.className = "hero-portrait";
    renderer.portrait(portrait, id, meta.selectedSkin);
    c.prepend(portrait);
    for (const [label, value, max] of [
      ["Vida", h.hp, 150],
      ["Escudo", h.armor, 30],
      ["Velocidad", h.speed, 300],
    ]) {
      const stat = document.createElement("label");
      stat.className = "hero-stat";
      stat.textContent = label;
      const bar = document.createElement("meter");
      bar.max = max;
      bar.value = value;
      stat.append(bar);
      c.append(stat);
    }
    const desc = document.createElement("p");
    desc.textContent = {
      paladin: "Luz sagrada: golpeá a todos los enemigos cercanos.",
      cruzada: "Cúpula protectora: resistí el ataque bajo tu escudo.",
      inquisidor: "Juicio: desatá energía sobre tus enemigos.",
    }[id];
    c.append(desc);
    if (meta.selectedHero === id) c.classList.add("selected");
    addButton(
      c,
      owned
        ? meta.selectedHero === id
          ? "Elegido"
          : "Elegir"
        : `Desbloquear · ${h.cost} almas`,
      () => {
        if (!owned) {
          if (meta.almas < h.cost) return toast("Te faltan almas");
          meta.almas -= h.cost;
          meta.heroes.push(id);
        }
        meta.selectedHero = id;
        persist();
        show("heroes");
      },
    );
    grid.append(c);
  }
  if (heroTab === "heroes") screen.append(grid);
  const skins = document.createElement("div");
  skins.className = "cards";
  for (const sk of SKINS) {
    const owned =
        meta.skins.includes(sk.id) || (sk.vip && vipActive(meta, Date.now())),
      c = panel(
        sk.name,
        sk.vip
          ? "Exclusiva del Pase activo"
          : sk.product
            ? "Incluida en el pack inicial"
            : `${sk.cost} gemas · Apariencia para tu héroe`,
      );
    addButton(
      c,
      owned
        ? meta.selectedSkin === sk.id
          ? "Elegida"
          : "Usar"
        : sk.vip || sk.product
          ? "Ver en tienda"
          : `Comprar · ${sk.cost} ✧`,
      () => {
        if (!owned) {
          if (sk.vip || sk.product) return show("shop");
          if (meta.gemas < sk.cost) return toast("Te faltan gemas");
          meta.gemas -= sk.cost;
          meta.skins.push(sk.id);
        }
        meta.selectedSkin = sk.id;
        persist();
        show("heroes");
      },
    );
    skins.append(c);
  }
  if (heroTab === "skins") screen.append(skins);
  const arms = document.createElement("div");
  arms.className = "cards";
  for (const [i, w] of WEAPONS.entries()) {
    const owned = meta.weapons.includes(w.id),
      cost = 150 + i * 65,
      c = panel(
        w.name,
        owned
          ? "Disponible en cofres y tiendas"
          : `Desbloqueo permanente · ${cost} almas`,
      );
    const b = addButton(c, owned ? "Desbloqueada" : "Desbloquear", () => {
      if (meta.almas < cost) return toast("Te faltan almas");
      meta.almas -= cost;
      meta.weapons.push(w.id);
      persist();
      show("heroes");
    });
    b.disabled = owned;
    arms.append(c);
  }
  if (heroTab === "weapons") screen.append(arms);
}
function talents() {
  layout("Talentos · solo con almas");
  const grid = document.createElement("div");
  grid.className = "cards";
  for (const [id, t] of Object.entries(TALENTS)) {
    const rank = meta.talents[id] || 0,
      cost = 80 + rank * 70,
      c = panel(`${t.name} · ${rank}/${t.max}`, t.desc + " por rango");
    const b = addButton(
      c,
      rank === t.max ? "Al máximo" : `Mejorar · ${cost} almas`,
      () => {
        if (meta.almas < cost) return toast("Te faltan almas");
        meta.almas -= cost;
        meta.talents[id] = rank + 1;
        audio.play("levelUp");
        persist();
        show("talents");
      },
    );
    b.disabled = rank >= t.max;
    grid.append(c);
  }
  screen.append(grid);
}
function runStats() {
  if (!state) return "";
  return `Piso ${state.floor}/9 · ${state.rooms} salas · ${state.kills} bajas · ${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, "0")}`;
}
function credits() {
  layout("Créditos");
  screen.querySelector("header button").onclick = () => {
    state = null;
    show("lobby");
  };
  const roll = document.createElement("div");
  roll.className = "credits-window";
  const content = document.createElement("div");
  content.className = "credits-roll";
  for (const text of [
    "Paladin · Mazmorras",
    "Juego: Ulises Ignacio Bentancor",
    "Arte, música y sonido procedurales originales",
    "Motor: Canvas 2D + Capacitor",
    "Agradecimientos",
    "A vos, por mantener viva la luz.",
  ]) {
    const p = document.createElement("p");
    p.textContent = text;
    content.append(p);
  }
  roll.append(content);
  screen.append(roll);
  addButton(
    screen,
    "Volver al Santuario",
    () => {
      state = null;
      show("lobby");
    },
    "primary",
  );
}
let prices = PRODUCTS;
function shop() {
  layout(`Tienda · ${meta.gemas} gemas`);
  tabs(
    [
      ["gems", "Gemas"],
      ["extras", "Extras"],
      ["vip", "Pase"],
    ],
    shopTab,
    (id) => {
      shopTab = id;
      show("shop");
    },
  );
  const note = document.createElement("p");
  note.textContent =
    "Las compras dan gemas y cosméticos. Los talentos y los héroes se consiguen jugando. Los anuncios con recompensa son opcionales.";
  screen.append(note);
  const grid = document.createElement("div");
  grid.className = "cards";
  for (const p of PRODUCTS.filter((p) =>
    shopTab === "gems"
      ? p.id.startsWith("gems_")
      : shopTab === "vip"
        ? p.id === "vip_monthly"
        : !p.id.startsWith("gems_") && p.id !== "vip_monthly",
  )) {
    const c = panel(
      p.title,
      p.id === "remove_ads"
        ? "Sin anuncios intermedios para siempre · +300 gemas una vez"
        : p.id === "vip_monthly"
          ? "Sin anuncios intermedios · 40 gemas por día · aspecto Estelar · marco dorado. Se renueva cada mes. Cancelá cuando quieras desde Google Play."
          : "Solo cosméticos.",
    );
    addButton(c, prices.find((v) => v.id === p.id)?.price || p.price, () =>
      purchase(p.id),
    );
    c.classList.add("product");
    const gem = document.createElement("div");
    gem.className = "gem-art";
    gem.innerHTML = icon("gem");
    c.prepend(gem);
    if (["gems_medium", "gems_huge"].includes(p.id)) {
      const tag = document.createElement("span");
      tag.className = "product-tag";
      tag.textContent = p.id === "gems_medium" ? "Más popular" : "Mejor valor";
      c.prepend(tag);
    }
    grid.append(c);
  }
  screen.append(grid);
  addButton(screen, "Restaurar compras", () => restore(true));
}
function settings() {
  layout("Ajustes", previous);
  const c = panel("A tu medida");
  c.classList.add("settings");
  for (const [id, label] of [
    ["masterMute", "Silenciar todo"],
    ["haptics", "Vibración"],
    ["shake", "Sacudida de cámara"],
  ]) {
    const l = document.createElement("label");
    l.textContent = label;
    const i = document.createElement("input");
    i.type = "checkbox";
    i.checked = meta.settings[id];
    i.onchange = () => {
      meta.settings[id] = i.checked;
      audio.configure(meta.settings);
      persist();
    };
    l.append(i);
    c.append(l);
  }
  for (const [id, label] of [
    ["musicVolume", "Música"],
    ["sfxVolume", "Efectos"],
  ]) {
    const row = document.createElement("label");
    row.textContent = label;
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = 0;
    slider.max = 1;
    slider.step = 0.01;
    slider.value = meta.settings[id];
    slider.setAttribute("aria-label", label);
    slider.oninput = () => {
      meta.settings[id] = Number(slider.value);
      audio.configure(meta.settings);
      persist();
    };
    slider.onchange = () => {
      audio.unlock();
      if (id === "sfxVolume") audio.play("uiTap");
    };
    row.append(slider);
    c.append(row);
  }
  const l = document.createElement("label");
  l.textContent = "Calidad";
  const select = document.createElement("select");
  for (const [v, n] of [
    ["auto", "Automática"],
    ["high", "Alta"],
    ["low", "Baja"],
  ]) {
    const o = new Option(n, v);
    select.add(o);
  }
  select.value = meta.settings.quality;
  select.onchange = () => {
    meta.settings.quality = select.value;
    persist();
  };
  l.append(select);
  c.append(l);
  addButton(c, "Privacidad y anuncios", async () => {
    await platform.ads.showPrivacyOptions();
    toast(
      platform.isNative
        ? "Opciones de privacidad actualizadas"
        : "Modo DEMO: no se recopilan datos de anuncios",
    );
  });
  addButton(c, "Restaurar compras", () => restore(true));
  addButton(c, "Restablecer tutorial", () => {
    meta.tutorialSeen = false;
    persist();
    toast("Vas a ver el tutorial al jugar");
  });
  const note = document.createElement("p");
  note.textContent = "Español rioplatense · v2.1.1";
  c.append(note);
  addButton(c, "Borrar progreso", async () => {
    if (
      await confirmDialog(
        "¿Querés borrar todo tu progreso?",
        "Se borran talentos, monedas y la partida guardada.",
      )
    ) {
      meta = store.reset();
      audio.configure(meta.settings);
      state = null;
      show("lobby");
    }
  });
  screen.append(c);
}
function start(cont = false, options = {}) {
  victoryAt = 0;
  flowRewarded = false;
  result = null;
  updateHud.bossId = null;
  const ghost = $("hpghost");
  if (ghost) ghost.value = 0;
  renderer.resetEffects();
  state = createRun(meta, {
    seed: Date.now() >>> 0,
    checkpoint: cont ? meta.checkpoint : null,
    ...options,
  });
  meta.checkpoint = checkpoint(state);
  persist();
  show("game");
  transition();
}
function transition() {
  const f = state.floor;
  $("transition").textContent =
    `${Math.ceil(f / 3)}-${((f - 1) % 3) + 1} · ${WORLDS[Math.floor((f - 1) / 3)]}`;
  $("transition").hidden = false;
  clearTimeout(transition.timer);
  transition.timer = setTimeout(() => ($("transition").hidden = true), 1800);
}
function pause() {
  if (!modal.hidden) {
    cancelModal?.();
    return;
  }
  if (busy) return;
  if (page === "game" && state?.mode === "victory") {
    // Victoria pendiente (cinemática): no se puede pausar ni "des-ganar"; se cierra ya.
    victoryAt = 0;
    finish(true);
    return;
  }
  if (page === "game") {
    if (state.mode === "playing") state.mode = "paused";
    show("pause");
  } else if (page === "pause") show("game");
  else if (["heroes", "talents", "shop", "settings", "help"].includes(page))
    show(page === "settings" || page === "help" ? previous : "lobby");
}
const controls = createControls(
  $("game"),
  { attack: $("attack"), skill: $("skill"), dash: $("dash"), swap: $("swap") },
  pause,
);
$("pause").onclick = pause;
$("minimap").onclick = () => $("minimap").classList.toggle("large");
function death() {
  layout("Caíste", "lobby");
  screen.querySelector("header button").remove();
  const c = panel(
    "Todavía queda luz",
    `${runStats()} · Podés revivir una vez por partida mirando un anuncio opcional.`,
  );
  if (!state.revived)
    addButton(
      c,
      "Revivir · Ver anuncio",
      async () => {
        if (await rewarded("revive")) {
          flowRewarded = true;
          if (revive(state)) {
            if (meta.checkpoint) meta.checkpoint.revived = true;
            persist();
            show("game");
          }
        }
      },
      "primary",
    );
  addButton(c, "Aceptar destino", () => finish(false));
  screen.append(c);
}
function finish(victory) {
  if (result) return;
  result = {
    ...state.rewards,
    rooms: state.rooms,
    kills: state.kills,
    time: state.time,
    victory,
    doubled: false,
  };
  if (victory) {
    meta.stats.victories++;
    meta.completedOnce = true;
    result.almas += 35;
    result.gemas += 5;
  }
  meta.almas += result.almas;
  meta.gemas += result.gemas;
  meta.stats.runs++;
  if (!victory) meta.stats.defeats++;
  meta.stats.kills += state.kills;
  meta.stats.rooms += state.rooms;
  meta.bestFloor = Math.max(meta.bestFloor, state.floor);
  meta.checkpoint = null;
  state.mode = victory ? "victory" : "dead";
  persist();
  audio.play(victory ? "victory" : "defeat");
  show("results");
}
function results() {
  layout(result.victory ? "¡Victoria!" : "Resultados");
  screen.querySelector("header button").remove();
  const c = panel(
    result.victory ? "Venciste al Abismo" : "Tu alma vuelve al Santuario",
    `${result.rooms} salas · ${result.kills} bajas · ${Math.floor(result.time / 60)}:${String(Math.floor(result.time % 60)).padStart(2, "0")} · ${result.almas} almas · ${result.gemas} gemas`,
  );
  if (result.victory) {
    const bonus = document.createElement("p");
    bonus.textContent = "Bonus de victoria incluido: +35 almas · +5 gemas";
    c.append(bonus);
    addButton(c, "Ver créditos", () => show("credits"));
  }
  if (!result.doubled)
    addButton(c, "Doble recompensa · Ver anuncio", async () => {
      if (await rewarded("double")) {
        flowRewarded = true;
        if (!result.doubled) {
          meta.almas += result.almas;
          meta.gemas += result.gemas;
          result.almas *= 2;
          result.gemas *= 2;
          result.doubled = true;
          persist();
          show("results");
        }
      }
    });
  addButton(
    c,
    "Volver al Santuario",
    async () => {
      if (busy) return;
      busy = true;
      busySince = Date.now();
      try {
        if (
          shouldShowInterstitial(meta, Date.now(), {
            victory: result.victory,
            rewardedInFlow: flowRewarded,
          })
        ) {
          const r = await platform.ads.showInterstitial();
          if (r.shown) {
            meta.monetization.lastInterstitial = Date.now();
            persist();
          }
        }
      } catch (e) {
        errlog.record("interstitial", e);
      } finally {
        busy = false;
      }
      state = null;
      result = null;
      show("lobby");
    },
    "primary",
  );
  screen.append(c);
}
async function rewarded(kind) {
  if (busy) return false;
  busy = true;
  busySince = Date.now();
  let r;
  try {
    r = await platform.ads.showRewarded(kind);
  } catch (e) {
    errlog.record("rewarded", e);
    r = { rewarded: false };
  } finally {
    busy = false;
  }
  if (!r.rewarded) {
    toast("Anuncio no disponible, probá más tarde");
    return false;
  }
  audio.play("reward");
  meta.monetization.lastRewarded = Date.now();
  persist();
  return true;
}
function confirmDialog(title, message) {
  return new Promise((resolve) => {
    cancelModal = () => {
      modal.hidden = true;
      cancelModal = null;
      resolve(false);
    };
    modal.hidden = false;
    modal.innerHTML = "";
    const c = panel(title, message);
    c.classList.add("center-card");
    addButton(
      c,
      "Confirmar",
      () => {
        modal.hidden = true;
        cancelModal = null;
        resolve(true);
      },
      "primary",
    );
    addButton(c, "Cancelar", () => {
      cancelModal?.();
    });
    modal.append(c);
  });
}
configureDemo({
  purchase: () =>
    confirmDialog(
      "Compra simulada (DEMO) — no se cobra nada",
      "Se acredita únicamente en este dispositivo.",
    ),
  ad: () =>
    new Promise((resolve) => {
      modal.hidden = false;
      modal.innerHTML = "";
      const c = panel(
        "ANUNCIO SIMULADO · DEMO",
        "Esperá unos segundos para recibir la recompensa.",
      );
      c.classList.add("center-card");
      const p = document.createElement("p");
      c.append(p);
      modal.append(c);
      let n = 4;
      p.textContent = `${n} segundos`;
      cancelModal = () => {
        clearInterval(timer);
        modal.hidden = true;
        cancelModal = null;
        resolve(false);
      };
      const timer = setInterval(() => {
        n--;
        p.textContent = `${n} segundos`;
        if (n <= 0) {
          clearInterval(timer);
          addButton(
            c,
            "Cerrar anuncio",
            () => {
              modal.hidden = true;
              cancelModal = null;
              resolve(true);
            },
            "primary",
          );
        }
      }, 1000);
    }),
});
async function purchase(id) {
  if (busy) return;
  busy = true;
  busySince = Date.now();
  try {
    await purchaseFlow(id);
  } catch (e) {
    errlog.record("purchase", e);
    toast("Compra no disponible, probá más tarde");
  } finally {
    busy = false;
  }
  if (page === "shop") show("shop");
}
async function purchaseFlow(id) {
  const r = await platform.billing.purchase(id);
  if (r.ok && r.transactionId) {
    let expiry;
    if (id === "vip_monthly") {
      if (platform.isNative) {
        const restored = await platform.billing.restore();
        expiry = restored.owned?.find((v) => v.id === id)?.expiresAt;
      } else expiry = Date.now() + 30 * 86400000;
    }
    const credited = creditPurchase(
      meta,
      id,
      r.transactionId,
      Date.now(),
      expiry,
    );
    if (credited) {
      audio.play("reward");
      persist();
      await platform.billing.finish(r.transactionId, id);
      toast("Compra acreditada");
    } else if (meta.monetization.processed.includes(r.transactionId))
      await platform.billing.finish(r.transactionId, id);
    else toast("No pudimos verificar la compra. Probá restaurarla.");
  } else if (!r.cancelled) toast("Compra no disponible, probá más tarde");
}
async function restore(notify = false) {
  const r = await platform.billing.restore();
  if (platform.isNative && Array.isArray(r.owned) && !r.error) {
    meta.monetization.vipUntil = 0;
    for (const o of r.owned) {
      const tx = o.transactionId || `restore-${o.id}`;
      creditPurchase(meta, o.id, tx, Date.now(), o.expiresAt);
      persist();
      if (
        o.transactionId &&
        meta.monetization.processed.includes(o.transactionId)
      )
        await platform.billing.finish(o.transactionId, o.id);
      if (o.id === "vip_monthly" && o.expiresAt > Date.now())
        meta.monetization.vipUntil = o.expiresAt;
    }
    persist();
  }
  if (notify) toast("Compras restauradas");
}
platform.app.onPause(() => {
  audio.suspend();
  if (page === "game") pause();
  persist();
});
platform.app.onResume(() => {
  audio.resume();
  resetInput("resume");
  recordSession(meta, Date.now());
  persist();
});
platform.app.onBack(() => {
  if (!modal.hidden) {
    cancelModal?.();
    return;
  }
  if (page === "death") {
    finish(false);
    return;
  }
  if (page === "results") {
    screen.querySelector(".primary")?.click();
    return;
  }
  if (page === "lobby") {
    confirmDialog(
      "¿Querés salir?",
      "Podés cerrar la app; tu progreso ya está guardado.",
    ).then((ok) => {
      if (ok) {
        persist();
        try {
          window.PaladinNative?.app?.exit?.();
        } catch {}
      }
    });
  } else pause();
});
function resetInput(why) {
  controls.clear();
  interpolation.reset();
  last = performance.now();
  acc = 0;
  measure();
  loop?.check(true);
}
window.addEventListener("focus", () => resetInput("focus"));
window.addEventListener("paladin-native-revive", () => resetInput("native"));
window.addEventListener("pageshow", () => resetInput("pageshow"));
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    audio.resume();
    resetInput("visible");
  }
  if (document.hidden) {
    audio.suspend();
    if (page === "game") pause();
    persist();
  }
});
window.addEventListener("pagehide", persist);
function events() {
  for (const e of state.events) {
    if (meta.settings.haptics) {
      const style = {
        dash: "light",
        skill: "light",
        pickup: "light",
        damage: "medium",
        bossKill: "heavy",
        death: "heavy",
      }[e.type];
      if (style && !(e.type === "damage" && state.mode === "dead"))
        platform.haptics.impact(style);
    }
    renderer.event(e, state, meta);
    const ranged = weaponData(
      state.player.weapons[state.activeSlot],
    ).projectile;
    const sound = {
      hit: ranged ? "arrowHit" : "swordHit",
      dash: "dash",
      skill: "levelUp",
      pickup: "pickupGold",
      lock: "doorClose",
      room: "doorOpen",
      roar: "bossRoar",
      arrowWall: "arrowHit",
      slam: "bossSlam",
      damage: "playerHurt",
      kill: "enemyDeath",
      bossKill: "enemyDeath",
      death: "defeat",
      chest: "chestOpen",
      heal: "pickupHeal",
      attack: ranged ? "arrowRelease" : "swordSwing",
    }[e.type];
    if (sound) audio.play(sound);
    if (e.type === "hit") audio.play("enemyHit");
    if (e.type === "draw") audio.play("bowDraw");
    if (e.type === "poor") toast("Te falta oro");
    if (e.type === "floor") {
      meta.checkpoint = checkpoint(state);
      meta.bestFloor = Math.max(meta.bestFloor, state.floor);
      persist();
      transition();
    }
    if (e.type === "world") {
      const id =
        e.world === 1 ? "cruzada" : e.world === 2 ? "inquisidor" : null;
      if (id && !meta.heroes.includes(id)) {
        meta.heroes.push(id);
        persist();
        toast(`Desbloqueaste a ${HEROES[id].name}`);
      }
    }
  }
}
function setHudHTML(id, value) {
  const el = $(id);
  if (el._hudHTML !== value) {
    el._hudHTML = value;
    el.innerHTML = value;
  }
}
let bannerRoom = null,
  hudTime = 0;
function updateHud() {
  const roomKey = state.floor + ":" + state.currentRoom;
  if (bannerRoom !== roomKey) {
    bannerRoom = roomKey;
    const r = state.dungeon.rooms[state.currentRoom];
    const label = {
      combat: "¡Sala cerrada!",
      boss: "El guardián despierta",
      chest: "Tesoro",
      shop: "Mercader",
    }[r.type];
    if (label) {
      $("room-banner").textContent = label;
      $("room-banner").classList.remove("show");
      void $("room-banner").offsetWidth;
      $("room-banner").classList.add("show");
    }
  }

  const p = state.player,
    f = state.floor;
  const ghost = $("hpghost");
  if (ghost) {
    ghost.max = p.maxHp;
    ghost.value = Math.max(p.hp, (ghost.value || p.hp) - p.maxHp * 0.015);
  }
  $("floor").textContent =
    `${Math.ceil(f / 3)}-${((f - 1) % 3) + 1} · ${WORLDS[Math.floor((f - 1) / 3)]}`;
  $("hp").textContent = `♥ ${Math.ceil(p.hp)} / ${Math.ceil(p.maxHp)}`;
  $("hpbar").max = p.maxHp;
  $("hpbar").value = p.hp;
  $("armor").textContent = `◈ ${Math.ceil(p.armor)} / ${p.maxArmor}`;
  $("armorbar").max = p.maxArmor;
  $("armorbar").value = p.armor;
  const w = weaponData(p.weapons[state.activeSlot]);
  $("gold").textContent = `● ${p.oro} oro`;
  const item = nearestInteract(state);
  $("attack").dataset.interact = String(!!item);
  setHudHTML(
    "attack",
    item
      ? `${icon("hand")}<small>${item.price ? "Comprar" : item.kind === "portal" ? "Entrar" : item.kind === "chest" ? "Abrir" : "Recoger"}</small>`
      : `${icon(w.id)}<small>ATACAR</small>`,
  );
  $("skill").setAttribute(
    "aria-label",
    `${HEROES[state.hero].skill}, recarga ${Math.ceil(p.skillCd)} segundos`,
  );
  $("dash").setAttribute(
    "aria-label",
    `Esquivar, recarga ${Math.ceil(p.dashCd)} segundos`,
  );
  setHudHTML(
    "swap",
    `${icon(p.weapons[1 - state.activeSlot].id)}<small>CAMBIAR</small>`,
  );
  for (const [id, value, max] of [
    ["dash", p.dashCd, 1 * (1 - 0.08 * (state.talents.reflejos || 0))],
    [
      "skill",
      p.skillCd,
      HEROES[state.hero].cooldown * (1 - 0.06 * (state.talents.fe || 0)),
    ],
  ])
    $(id).style.setProperty("--cooldown", `${(value / max) * 100}%`);
  setHudHTML("skill", `${icon("skill")}<small>HABILIDAD</small>`);
  setHudHTML("dash", `${icon("dash")}<small>ESQUIVAR</small>`);
  const boss = state.enemies.find((e) => e.boss);
  setHudHTML(
    "bossbar",
    boss ? `${boss.name}<meter min="0" max="${boss.maxHp}"></meter>` : "",
  );
  if (boss) {
    $("bossbar").querySelector("meter").value = boss.hp;
    if (boss.id !== updateHud.bossId) {
      updateHud.bossId = boss.id;
      $("room-banner").textContent = boss.name;
      $("room-banner").classList.remove("show");
      void $("room-banner").offsetWidth;
      $("room-banner").classList.add("show");
    }
  }
  audio.scene(page, state.floor, !!boss);
  renderer.minimap(state, $("minimap"));
}
function renderDebug() {
  const d = $("debug");
  d.hidden = !debugVisible;
  if (!debugVisible) return;
  d.innerHTML =
    '<strong>Depuración · <span id="fps">60</span> FPS</strong><br>';
  for (const [label, action] of [
    [
      "+1000 gemas / almas",
      () => {
        meta.gemas += 1000;
        meta.almas += 1000;
      },
    ],
    [
      "Alternar sin anuncios",
      () => (meta.monetization.removeAds = !meta.monetization.removeAds),
    ],
    [
      "Alternar Pase",
      () =>
        (meta.monetization.vipUntil = vipActive(meta, Date.now())
          ? 0
          : Date.now() + 86400000),
    ],
    [
      "Forzar fallo de anuncio",
      () => {
        configureDemo({ fail: true });
        toast("Anuncios DEMO: fallo activado");
      },
    ],
    ["Restaurar anuncios DEMO", () => configureDemo({ fail: false })],
    [
      "Reiniciar contadores",
      () => {
        meta.stats.runs = meta.stats.defeats = 0;
        meta.monetization.sessions = 0;
        meta.monetization.lastInterstitial = 0;
      },
    ],
    [
      "Borrar guardado",
      async () => {
        if (
          await confirmDialog(
            "¿Borrás el guardado?",
            "Esta acción reinicia el progreso.",
          )
        ) {
          meta = store.reset();
          state = null;
          show("lobby");
        }
      },
    ],
  ])
    addButton(d, label, () => {
      action();
      persist();
      if (page === "lobby") show("lobby");
    });
  for (const f of [3, 6, 9])
    addButton(d, `Ir a ${Math.ceil(f / 3)}-3`, () => jumpToFloor(f));
}
function jumpToFloor(f) {
  f = Number(f);
  if (!Number.isInteger(f) || f < 1 || f > 9) return false;
  if (!state) start(false, { floor: f });
  else {
    loadFloor(state, f);
    meta.checkpoint = checkpoint(state);
    persist();
    show("game");
    transition();
  }
  return true;
}
window.__paladin = {
  get state() {
    return state;
  },
  get fps() {
    return fps;
  },
  get meta() {
    return meta;
  },
  get page() {
    return page;
  },
  get loopRestarts() {
    return loop.restarts;
  },
  renderer,
  errors: () => errlog.list(),
  jumpToFloor,
  grant(almas = 1000, gemas = 1000) {
    meta.almas += Math.max(0, Number(almas) || 0);
    meta.gemas += Math.max(0, Number(gemas) || 0);
    persist();
    if (page === "lobby") show("lobby");
  },
};
$("tutorial-close").onclick = () => {
  meta.tutorialSeen = true;
  persist();
  $("tutorial").hidden = true;
};
function frame(now) {
  if (now - lastPersist > 30000 && !document.hidden) {
    lastPersist = now;
    persist();
  }
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000) || 0);
  last = now;
  fps += ((dt ? 1 / dt : 60) - fps) * 0.05;
  acc += dt;
  const vp = viewport();
  if (page === "game" && state && !document.hidden && !(vp.h > vp.w * 1.05)) {
    try {
      let steps = 0;
      while (
        acc >= 1 / 60 &&
        page === "game" &&
        state.mode === "playing" &&
        steps++ < 8
      ) {
        interpolation.snapshot(state);
        updateRun(state, 1 / 60, controls.read());
        events();
        acc -= 1 / 60;
        if (state.mode === "dead") show("death");
        else if (state.mode === "victory" && !victoryAt) {
          // Dejar ver la muerte del jefe final (destello, partículas, cámara lenta) antes del cartel.
          victoryAt = now;
          $("transition").textContent = "¡Victoria!";
          $("transition").hidden = false;
        }
      }
      if (state.mode === "victory" && victoryAt && now - victoryAt > 1800) {
        victoryAt = 0;
        finish(true);
      }
      if (steps >= 8) acc = 0; // nunca acumular atraso (espiral de la muerte)
      if (page === "game" && now - hudTime > 66) {
        hudTime = now;
        updateHud();
      }
      loopErrors = 0;
    } catch (e) {
      acc = 0;
      loopErrors++;
      errlog.record("update", e);
      if (loopErrors === 90) {
        // Error persistente: guardar y pausar en vez de quedar congelado.
        try {
          persist();
          state.mode = "paused";
          show("pause");
          toast("Algo falló. Tu partida está guardada; tocá Reanudar.");
        } catch {}
      }
    }
  } else acc = 0;
  try {
    renderer.render(
      page === "lobby" || page === "splash" || page === "credits"
        ? null
        : interpolation.render(state, page === "game" ? acc / (1 / 60) : 1),
      meta,
      dt,
    );
  } catch (e) {
    errlog.record("render", e);
  }
  if (debugVisible && $("fps")) $("fps").textContent = Math.round(fps);
}
// Guardián cada 1 s: bucle vivo, overlays coherentes con la pantalla, busy que no se traba.
function watchdog() {
  try {
    if (!document.hidden && loop.check(true))
      errlog.record("watchdog", "loop restarted");
    measure();
    const now = Date.now();
    if (busy && busySince && now - busySince > 660000) {
      // Red de seguridad por encima del timeout más largo de la plataforma (compras: 600 s).
      errlog.record("watchdog", "busy reset");
      busy = false;
    }
    if (page === "game") {
      if (screen.childNodes.length) {
        errlog.record("watchdog", "screen overlay over game");
        screen.innerHTML = "";
      }
      if (!modal.hidden && !cancelModal && !busy) {
        errlog.record("watchdog", "orphan modal");
        modal.hidden = true;
      }
      if (state && state.mode === "paused" && modal.hidden) {
        errlog.record("watchdog", "paused while in game");
        state.mode = "playing";
      }
      if (
        $("controls").hidden ||
        !document.body.classList.contains("playing")
      ) {
        errlog.record("watchdog", "controls hidden in game");
        $("controls").hidden = false;
        $("hud").hidden = false;
        document.body.classList.add("playing");
      }
    }
  } catch (e) {
    errlog.record("watchdog", e);
  }
}
window.__paladinWatchdog = watchdog;
// Sin "once": iOS puede interrumpir el AudioContext al volver de segundo plano; el siguiente toque lo reanuda.
window.addEventListener("pointerdown", () => audio.unlock(), { capture: true, passive: true });
window.addEventListener("keydown", () => audio.unlock(), { capture: true, passive: true });
show("splash");
const loop = createLoopGuard((cb) => requestAnimationFrame(cb), frame);
loop.start();
setInterval(watchdog, 1000);
// La inicialización de anuncios/consentimiento/compras nunca bloquea el juego: corre aparte.
Promise.all([
  Promise.resolve()
    .then(() => platform.ads.init())
    .catch((e) => errlog.record("ads.init", e)),
  Promise.resolve()
    .then(() => platform.billing.init())
    .catch((e) => errlog.record("billing.init", e)),
])
  .then(async () => {
    await restore();
    prices = (await platform.billing.getProducts()) || prices;
    platform.ads.preload();
    if (page === "lobby" && modal.hidden) show("lobby");
  })
  .catch((e) => errlog.record("init", e));
if ("serviceWorker" in navigator && !window.Capacitor) {
  window.addEventListener("load", () =>
    navigator.serviceWorker
      .register("sw.js")
      .then((reg) => {
        reg.update()?.catch?.(() => {});
        const activate = () =>
          reg.waiting?.postMessage({ type: "SKIP_WAITING" });
        activate();
        reg.addEventListener("updatefound", () =>
          reg.installing?.addEventListener("statechange", activate),
        );
      })
      .catch(() => {}),
  );
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!reloading && navigator.serviceWorker.controller) {
      reloading = true;
      location.reload();
    }
  });
}
