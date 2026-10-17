import { createArt } from "./art.js";
import { TILE, SIZE } from "./dungeon.js";
import { weaponData, SKINS, RARITIES } from "./data.js";
import { createSpriteCache } from "../render/sprites.js";
export function createRenderer(canvas) {
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true }),
    sprites = createSpriteCache(),
    art = createArt(),
    heroSprites = new Map();
  let cache = null,
    dungeon = null,
    camera = { x: 0, y: 0 },
    lastFloor = 0;
  let clock = 0,
    previousX = 0,
    previousY = 0;
  const lights = [],
    chunks = [];
  sprites.warm();
  const slash = document.createElement("canvas");
  slash.width = slash.height = 256;
  const sc = slash.getContext("2d");
  const sg = sc.createRadialGradient(128, 128, 30, 128, 128, 125);
  sg.addColorStop(0, "#ffdc8800");
  sg.addColorStop(0.7, "#ffdc8822");
  sg.addColorStop(1, "#fff1b5bb");
  sc.fillStyle = sg;
  sc.beginPath();
  sc.moveTo(128, 128);
  sc.arc(128, 128, 124, -1.3, 1.3);
  sc.closePath();
  sc.fill();
  const themes = [
    ["#132623", "#20342a", "#a5b76b"],
    ["#162329", "#29353a", "#7ad5ce"],
    ["#301b22", "#49272a", "#ed9864"],
  ];
  function circle(x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  function text(t, x, y, color = "#f7e9c6", size = 16) {
    ctx.fillStyle = color;
    ctx.font = `bold ${size}px Georgia`;
    ctx.textAlign = "center";
    ctx.fillText(t, x, y);
  }
  function heroSprite(hero, skinId, flash = false) {
    const key = hero + ":" + skinId + (flash ? ":flash" : "");
    if (heroSprites.has(key)) return heroSprites.get(key);
    const base = sprites.player(),
      out = document.createElement("canvas");
    out.width = base.width;
    out.height = base.height;
    const c = out.getContext("2d");
    c.drawImage(base, 0, 0);
    c.globalCompositeOperation = "source-atop";
    c.globalAlpha = 0.38;
    c.fillStyle = (SKINS.find((s) => s.id === skinId) || SKINS[0]).color;
    c.fillRect(0, 0, out.width, out.height);
    c.globalCompositeOperation = "source-over";
    c.globalAlpha = 1;
    c.globalCompositeOperation = "source-atop";
    c.globalAlpha = 0.26;
    c.fillStyle =
      hero === "cruzada"
        ? "#70d8ed"
        : hero === "inquisidor"
          ? "#ac67dd"
          : "#f3d28b";
    c.fillRect(0, 0, out.width, out.height);
    c.globalAlpha = 1;
    c.globalCompositeOperation = "source-over";
    if (flash) {
      c.globalCompositeOperation = "source-atop";
      c.fillStyle = "#ffffff";
      c.globalAlpha = 0.9;
      c.fillRect(0, 0, out.width, out.height);
      c.globalAlpha = 1;
      c.globalCompositeOperation = "source-over";
    }
    heroSprites.set(key, out);
    return out;
  }
  function build(s) {
    lights.length = 0;
    chunks.length = 0;
    dungeon = s.dungeon;
    cache = document.createElement("canvas");
    cache.width = SIZE * TILE;
    cache.height = SIZE * TILE;
    const c = cache.getContext("2d"),
      theme = themes[Math.floor((s.floor - 1) / 3)];
    c.fillStyle = "#030609";
    c.fillRect(0, 0, cache.width, cache.height);
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        if (!dungeon.tiles[y * SIZE + x]) continue;
        const px = x * TILE,
          py = y * TILE,
          n = (x * 73 + y * 137) % 101;
        c.fillStyle = n % 3 ? theme[0] : theme[1];
        c.fillRect(px, py, TILE, TILE);
        c.strokeStyle = "#02060888";
        c.lineWidth = 1;
        c.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
        c.strokeStyle = "#b9cab015";
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(px + 3, py + TILE - 4);
        c.lineTo(px + 3, py + 3);
        c.lineTo(px + TILE - 4, py + 3);
        c.stroke();
        for (let i = 0; i < 28; i++) {
          c.fillStyle = i % 2 ? "#ffffff07" : "#00000016";
          c.fillRect(
            px + ((n * i + 7) % 44),
            py + ((n + i * 17) % 44),
            2 + (i % 3),
            1,
          );
        }
        if (n % 5 === 0) {
          c.strokeStyle = s.floor > 6 ? "#f77b4777" : "#050a0c99";
          c.beginPath();
          c.moveTo(px + 9, py + 4);
          c.lineTo(px + 24, py + 20);
          c.lineTo(px + 17, py + 34);
          c.lineTo(px + 30, py + 46);
          c.stroke();
        }
        if (s.floor > 6 && n % 7 === 0) {
          c.fillStyle = "#fdb15b";
          c.fillRect(px + 17, py + 26, 2, 2);
          c.fillStyle = "#ee673755";
          c.fillRect(px + 14, py + 23, 8, 8);
        }
        if (n % 9 === 0) {
          c.fillStyle = theme[2] + "35";
          for (let i = 0; i < 5; i++) {
            if (s.floor < 4) {
              c.beginPath();
              c.ellipse(
                px + 10 + i * 5,
                py + 18 + (i % 2) * 7,
                3 + (i % 2),
                2,
                0,
                0,
                7,
              );
              c.fill();
            } else c.fillRect(px + 10 + i * 5, py + 18 + (i % 2) * 7, 3, 7);
          }
        }
        if (s.floor > 3 && s.floor < 7 && n % 13 === 0) {
          c.fillStyle = "#b3b5a26b";
          c.beginPath();
          c.arc(px + 25, py + 25, 6, 0, 7);
          c.fill();
          c.fillStyle = theme[0];
          c.fillRect(px + 21, py + 23, 3, 3);
          c.fillRect(px + 27, py + 23, 3, 3);
        }
      }
    // Raised masonry at the edge of the carved floor; corridors stay open.
    for (let y = 1; y < SIZE - 1; y++)
      for (let x = 1; x < SIZE - 1; x++) {
        if (dungeon.tiles[y * SIZE + x]) continue;
        if (
          ![
            [0, 1],
            [0, -1],
            [1, 0],
            [-1, 0],
          ].some(([dx, dy]) => dungeon.tiles[(y + dy) * SIZE + x + dx])
        )
          continue;
        const px = x * TILE,
          py = y * TILE;
        c.fillStyle = "#00000065";
        c.fillRect(px + 7, py + 18, TILE, TILE);
        c.fillStyle = "#10171c";
        c.fillRect(px, py + 8, TILE, TILE - 8);
        c.fillStyle = theme[1];
        c.fillRect(px, py - 8, TILE, TILE - 14);
        c.strokeStyle = theme[2] + "48";
        c.strokeRect(px + 2, py - 6, TILE - 4, TILE - 18);
        c.fillStyle = "#00000044";
        c.fillRect(px, py + 26, TILE, 5);
      }
    for (const r of dungeon.rooms) {
      c.strokeStyle = theme[2] + "55";
      c.lineWidth = 2;
      c.strokeRect(r.x + 10, r.y + 10, r.w - 20, r.h - 20);
      if (r.type === "shop") {
        c.fillStyle = "#432b3d";
        c.fillRect(r.cx - 205, r.cy - 100, 410, 210);
        c.strokeStyle = "#d0a764";
        c.strokeRect(r.cx - 196, r.cy - 91, 392, 192);
        c.strokeStyle = "#b9965b24";
        for (let i = -180; i < 190; i += 12) {
          c.beginPath();
          c.moveTo(r.cx + i, r.cy - 85);
          c.lineTo(r.cx + i, r.cy + 95);
          c.stroke();
        }
        for (let i = -185; i < 190; i += 20) {
          c.fillStyle = "#b9965b66";
          c.fillRect(r.cx + i, r.cy - 96, 2, 8);
          c.fillRect(r.cx + i, r.cy + 102, 2, 8);
        }
      }
      if (r.type === "chest") {
        c.fillStyle = "#121d22";
        c.beginPath();
        c.ellipse(r.cx, r.cy + 12, 49, 27, 0, 0, 7);
        c.fill();
        c.strokeStyle = theme[2] + "88";
        c.stroke();
        c.fillStyle = "#4d5c58";
        c.fillRect(r.cx - 30, r.cy + 4, 60, 14);
      }
      if (r.type === "boss" || r.type === "start") {
        c.strokeStyle = theme[2] + "55";
        for (const radius of [100, 119]) {
          c.beginPath();
          c.arc(r.cx, r.cy, radius, 0, 7);
          c.stroke();
        }
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          c.save();
          c.translate(r.cx + Math.cos(a) * 110, r.cy + Math.sin(a) * 110);
          c.rotate(a);
          c.strokeRect(-5, -5, 10, 10);
          c.restore();
        }
      }
      for (const side of [-1, 1]) {
        const x = r.cx + side * (r.w / 2 - 42),
          y = r.y + 55;
        lights.push({ x, y });
        c.fillStyle = "#11171a";
        c.fillRect(x - 12, y - 5, 24, 38);
        c.fillStyle = "#8c744b";
        c.fillRect(x - 8, y - 8, 16, 22);
        c.fillStyle = "#33413b";
        c.fillRect(x - 18, r.y + r.h - 65, 36, 37);
        c.fillStyle = "#637066";
        c.fillRect(x - 21, r.y + r.h - 70, 42, 12);
        c.fillStyle = "#584434";
        c.fillRect(x - 18, r.y + r.h - 120, 32, 29);
        c.strokeStyle = "#a18353";
        c.strokeRect(x - 16, r.y + r.h - 118, 28, 25);
        c.beginPath();
        c.moveTo(x - 15, r.y + r.h - 117);
        c.lineTo(x + 12, r.y + r.h - 95);
        c.stroke();
      }
    }
    // Retain only 768px chunks containing floor/wall art, not a huge backing surface.
    for (let y = 0; y < cache.height; y += 768)
      for (let x = 0; x < cache.width; x += 768) {
        if (
          !dungeon.rooms.some(
            (r) =>
              x < r.x + r.w + 120 &&
              x + 768 > r.x - 120 &&
              y < r.y + r.h + 120 &&
              y + 768 > r.y - 120,
          ) &&
          !dungeon.doors.some(
            (b) => Math.abs(b.x - x) < 900 && Math.abs(b.y - y) < 900,
          )
        )
          continue;
        const tile = document.createElement("canvas");
        tile.width = tile.height = 768;
        tile.getContext("2d").drawImage(cache, x, y, 768, 768, 0, 0, 768, 768);
        chunks.push({ x, y, tile });
      }
    cache.width = cache.height = 1;
    camera = { x: s.player.x, y: s.player.y };
    lastFloor = s.floor;
  }
  let autoScale = Math.min(devicePixelRatio || 1, 1.5), frameAvg = 1 / 60, adaptTimer = 0;
  return {
    get renderScale() {
      return autoScale;
    },
    render(s, meta, dt) {
      // Resolución dinámica (calidad "auto"): baja la escala interna si los frames tardan > 20 ms y la
      // vuelve a subir si sobra margen. El canvas se estira por CSS, la lógica usa px CSS.
      const maxDpr = Math.min(devicePixelRatio || 1, 2);
      if (meta.settings.quality === "auto" && s && dt > 0) {
        frameAvg += (dt - frameAvg) * 0.05;
        adaptTimer += dt;
        if (adaptTimer > 1.5) {
          if (frameAvg > 1 / 50 && autoScale > 0.75) autoScale = Math.max(0.75, autoScale - 0.25);
          else if (frameAvg < 1 / 58 && autoScale < maxDpr) autoScale = Math.min(maxDpr, autoScale + 0.125);
          adaptTimer = 0;
        }
      }
      const dpr =
          meta.settings.quality === "low"
            ? 1
            : meta.settings.quality === "auto"
              ? Math.min(autoScale, maxDpr)
              : maxDpr,
        w = innerWidth,
        h = innerHeight;
      if (
        canvas.width !== Math.round(w * dpr) ||
        canvas.height !== Math.round(h * dpr)
      ) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#030609";
      ctx.fillRect(0, 0, w, h);
      clock += dt;
      if (!s) {
        for (let i = 0; i < 36; i++) {
          const x = (i * 197 + Math.sin(clock * 0.3 + i) * 35) % w,
            y = h - ((clock * (12 + (i % 5)) + i * 71) % h);
          ctx.globalAlpha = 0.15 + (i % 4) * 0.1;
          ctx.drawImage(sprites.glowDot("#df9e48"), x, y, 12, 12);
        }
        ctx.globalAlpha = 1;
        const preview = document.getElementById("hero-preview");
        if (preview) {
          const c = preview.getContext("2d");
          c.clearRect(0, 0, 280, 150);
          c.drawImage(sprites.halo(), 30, -20, 220, 220);
          c.save();
          c.translate(140, 75 + Math.sin(clock * 2) * 3);
          c.rotate(-Math.PI / 2);
          c.drawImage(
            heroSprite(meta.selectedHero, meta.selectedSkin),
            -75,
            -75,
            150,
            150,
          );
          c.restore();
        }
        return;
      }
      if (s.dungeon !== dungeon || lastFloor !== s.floor) build(s);
      const scale = w < 1100 ? w / 690 : Math.min(w / 1050, h / 600);
      camera.x +=
        (s.player.x + Math.cos(s.player.facing) * 32 - camera.x) *
        Math.min(1, dt * 9);
      camera.y +=
        (s.player.y + Math.sin(s.player.facing) * 22 - camera.y) *
        Math.min(1, dt * 9);
      const shake =
        meta.settings.shake !== false &&
        (s.time - s.player.lastDamage < 0.18 ||
          s.effects.some((f) => f.kind === "meteor" && f.fired))
          ? Math.sin(s.time * 100) * 3
          : 0;
      ctx.translate(w / 2 + shake, h / 2);
      ctx.scale(scale, scale);
      ctx.translate(-camera.x, -camera.y);
      const vw = w / scale / 2 + 768,
        vh = h / scale / 2 + 768;
      const left = camera.x - w / scale / 2 - 8,
        top = camera.y - h / scale / 2 - 8,
        right = left + w / scale + 16,
        bottom = top + h / scale + 16;
      for (const chunk of chunks) {
        const x = Math.max(left, chunk.x),
          y = Math.max(top, chunk.y),
          ex = Math.min(right, chunk.x + 768),
          ey = Math.min(bottom, chunk.y + 768);
        if (ex > x && ey > y)
          ctx.drawImage(
            chunk.tile,
            x - chunk.x,
            y - chunk.y,
            ex - x,
            ey - y,
            x,
            y,
            ex - x,
            ey - y,
          );
      }
      for (const l of lights) {
        if (
          Math.abs(l.x - camera.x) > vw - 600 ||
          Math.abs(l.y - camera.y) > vh - 600
        )
          continue;
        ctx.globalAlpha = 0.55 + Math.sin(s.time * 9 + l.x) * 0.12;
        ctx.drawImage(sprites.glowDot("#ffa344"), l.x - 85, l.y - 85, 170, 170);
        ctx.globalAlpha = 1;
        circle(l.x, l.y, 5, "#ffe3a0");
      }
      for (const b of dungeon.doors)
        if (dungeon.rooms[b.room].locked) {
          ctx.globalAlpha = 0.75 + Math.sin(s.time * 7) * 0.2;
          ctx.fillStyle = "#75d9c9";
          if (b.w > b.h) {
            for (let x = 0; x < b.w; x += 14)
              ctx.fillRect(b.x + x, b.y, 5, b.h);
          } else {
            for (let y = 0; y < b.h; y += 14)
              ctx.fillRect(b.x, b.y + y, b.w, 5);
          }
          ctx.strokeStyle = "#c1fff0";
          ctx.strokeRect(b.x, b.y, b.w, b.h);
          ctx.globalAlpha = 1;
        }
      for (const b of dungeon.doors)
        if (!dungeon.rooms[b.room].locked) {
          ctx.strokeStyle = "#74bc9a55";
          ctx.lineWidth = 2;
          ctx.strokeRect(b.x, b.y, b.w, b.h);
        }
      for (const d of s.drops) {
        ctx.drawImage(
          sprites.glowDot(d.kind === "portal" ? "#b587ff" : "#e9bd62"),
          d.x - 35,
          d.y - 35,
          70,
          70,
        );
        if (d.price || d.kind === "chest") {
          ctx.fillStyle = "#121c23";
          ctx.fillRect(d.x - 27, d.y + 8, 54, 19);
          ctx.fillStyle = "#69726b";
          ctx.fillRect(d.x - 30, d.y + 4, 60, 8);
        }
        ctx.save();
        ctx.translate(0, Math.sin(s.time * 3 + d.x) * 3);
        const colors = {
          coin: "#ffd063",
          health: "#f27685",
          energy: "#74d4ff",
          chest: "#be8e40",
          weapon: "#a4d3ff",
          portal: "#b88cff",
          buff: "#c2ed83",
          potion: "#f27685",
          coins: "#ffd063",
        };
        if (d.kind === "portal") {
          circle(d.x, d.y, 35, "#382656");
          ctx.strokeStyle = "#d8a1ff";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(d.x, d.y, 24, 35, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else
          circle(
            d.x,
            d.y,
            d.kind === "coin" ? 7 : 18,
            d.kind === "weapon"
              ? RARITIES[d.weapon.rarity].color
              : colors[d.kind],
          );
        text(
          d.kind === "weapon"
            ? weaponData(d.weapon).icon
            : { chest: "▣", potion: "✚", buff: "✦", health: "+", energy: "ϟ" }[
                d.kind
              ] || "",
          d.x,
          d.y + 6,
          "#fff",
          23,
        );
        if (d.kind === "weapon")
          text(
            weaponData(d.weapon).name,
            d.x,
            d.y + 65,
            RARITIES[d.weapon.rarity].color,
            13,
          );
        if (d.kind === "chest") {
          ctx.fillStyle = "#55351f";
          ctx.fillRect(d.x - 23, d.y - 18, 46, 32);
          ctx.fillStyle = "#a77738";
          ctx.fillRect(d.x - 23, d.y - 18, 46, 12);
          ctx.strokeStyle = "#ebc273";
          ctx.lineWidth = 3;
          ctx.strokeRect(d.x - 23, d.y - 18, 46, 32);
          ctx.fillStyle = "#ffe6a1";
          ctx.fillRect(d.x - 4, d.y - 6, 8, 12);
        }
        if (d.kind === "portal") {
          ctx.save();
          ctx.translate(d.x, d.y);
          ctx.rotate(s.time);
          ctx.strokeStyle = "#e2beff";
          for (let i = 0; i < 3; i++) {
            ctx.rotate(2.094);
            ctx.beginPath();
            ctx.arc(7, 0, 19, 0.2, 4);
            ctx.stroke();
          }
          ctx.restore();
        }
        if (d.price) text(`${d.price} oro`, d.x, d.y + 42);
        ctx.restore();
      }
      let effectCount = 0,
        particleBudget = meta.settings.quality === "low" ? 48 : 96;
      for (const f of s.effects) {
        if (
          meta.settings.quality === "low" &&
          !["root", "meteor"].includes(f.kind) &&
          effectCount++ % 2 === 1
        )
          continue;
        ctx.globalAlpha = Math.min(1, f.t * 2);
        if (f.kind === "number") {
          text(
            f.value,
            f.x,
            f.y - (1 - f.t) * 38,
            f.crit ? "#ffd66e" : "#fff2cf",
            f.crit ? 23 : 17,
          );
        } else if (f.kind === "soul") {
          const t = 1 - f.t;
          ctx.drawImage(
            sprites.glowDot("#7eeedb"),
            f.x + (s.player.x - f.x) * t - 10,
            f.y + (s.player.y - f.y) * t - 10,
            20,
            20,
          );
        } else if (f.kind === "burst") {
          for (let i = 0; i < 8 && particleBudget-- > 0; i++) {
            const a = i * 0.785;
            ctx.drawImage(
              sprites.glowDot("#ffbc6b"),
              f.x + Math.cos(a) * (1 - f.t) * 65 - 6,
              f.y + Math.sin(a) * (1 - f.t) * 65 - 6,
              12,
              12,
            );
          }
        } else if (f.kind === "afterimage") {
          ctx.globalAlpha = f.t;
          ctx.drawImage(
            heroSprite(s.hero, meta.selectedSkin),
            f.x - 30,
            f.y - 30,
            60,
            60,
          );
        } else if (f.kind === "opened") {
          ctx.fillStyle = "#674426";
          ctx.fillRect(f.x - 23, f.y - 5, 46, 23);
          ctx.strokeStyle = "#d8b372";
          ctx.strokeRect(f.x - 23, f.y - 25, 46, 17);
        } else if (f.kind === "root") {
          ctx.save();
          ctx.translate(f.x, f.y);
          ctx.rotate(f.a);
          ctx.fillStyle = f.fired ? "#ff6644" : "#ed485866";
          ctx.fillRect(0, -18, f.r, 36);
          ctx.restore();
        } else {
          if (f.kind === "hit") {
            ctx.strokeStyle = "#fff2ba";
            ctx.lineWidth = 2;
            for (let i = 0; i < 5; i++) {
              const a = i * Math.PI * 0.4,
                r = (0.18 - f.t) * 90;
              ctx.beginPath();
              ctx.moveTo(
                f.x + Math.cos(a) * (r + 7),
                f.y + Math.sin(a) * (r + 7),
              );
              ctx.lineTo(
                f.x + Math.cos(a) * (r + 16),
                f.y + Math.sin(a) * (r + 16),
              );
              ctx.stroke();
            }
          }
          if (f.kind === "nova") {
            ctx.drawImage(
              sprites.glowDot(s.hero === "inquisidor" ? "#c5adff" : "#ffe19b"),
              f.x - f.r,
              f.y - f.r,
              f.r * 2,
              f.r * 2,
            );
            if (s.hero === "inquisidor") {
              ctx.fillStyle = "#e6d1ff";
              ctx.fillRect(f.x - 5, f.y - 90, 10, 115);
              ctx.fillRect(f.x - 35, f.y - 80, 70, 25);
            }
          }
          ctx.strokeStyle =
            f.kind === "meteor"
              ? "#ff555f"
              : f.kind === "hurt"
                ? "#ff4b61"
                : "#ffeab0";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      for (const e of s.enemies) {
        if (e.spawn > 0) {
          circle(e.x, e.y, 22 + Math.sin(s.time * 16) * 6, "#ff735b44");
          text("!", e.x, e.y + 7);
          continue;
        }
        ctx.drawImage(
          sprites.shadow(),
          e.x - e.radius * 1.5,
          e.y + e.radius * 0.3,
          e.radius * 3,
          e.radius * 1.3,
        );
        if (e.boss && e.hp < e.maxHp * 0.5)
          ctx.drawImage(
            sprites.glowDot("#ff663f"),
            e.x - 100,
            e.y - 100,
            200,
            200,
          );
        if (e.telegraph || (e.boss && e.cd < 0.65)) {
          ctx.strokeStyle = "#ff5b6d";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.boss ? 100 : 40, 0, 7);
          ctx.stroke();
        }
        ctx.save();
        ctx.translate(e.x, e.y + Math.sin(s.time * 8 + e.id) * 1.5);
        ctx.rotate(e.facing || 0);
        const type =
          e.type === 1 || e.boss ? "brute" : e.type === 2 ? "stalker" : "minor";
        if (e.boss) {
          ctx.rotate(-(e.facing || 0));
          const sprite = art.boss(
            Math.floor((s.floor - 1) / 3),
            e.hp < e.maxHp * 0.5,
          );
          ctx.save();
          ctx.scale(Math.cos(e.facing) < 0 ? -1 : 1, 1);
          ctx.drawImage(sprite, -85, -98, 170, 170);
          ctx.restore();
        } else {
          const sprite = sprites.enemy(
            type,
            Math.floor((s.floor - 1) / 3),
            e.stun > 0 ? "flash" : "normal",
          );
          ctx.drawImage(
            sprite,
            -e.radius * 1.9,
            -e.radius * 1.9,
            e.radius * 3.8,
            e.radius * 3.8,
          );
          if (e.type >= 3) {
            ctx.strokeStyle = e.telegraph ? "#ffe6ad" : "#c79df2";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 13, 0, 7);
            ctx.stroke();
          }
        }
        ctx.restore();
        ctx.fillStyle = "#300e1c";
        ctx.fillRect(e.x - 22, e.y - e.radius - 14, 44, 4);
        ctx.fillStyle = "#ed7180";
        ctx.fillRect(e.x - 22, e.y - e.radius - 14, (44 * e.hp) / e.maxHp, 4);
      }
      for (const b of s.bullets) {
        ctx.drawImage(
          sprites.glowDot(b.enemy ? "#ff7b48" : "#8ee9ff"),
          b.x - 18,
          b.y - 18,
          36,
          36,
        );
        circle(b.x, b.y, b.radius, b.enemy ? "#ffd8a1" : "#e5fbff");
      }
      const p = s.player;
      ctx.drawImage(sprites.shadow(), p.x - 30, p.y + 6, 60, 25);
      ctx.drawImage(sprites.halo(), p.x - 50, p.y - 50, 100, 100);
      ctx.save();
      const moving = Math.hypot(p.x - previousX, p.y - previousY) > 0.05;
      previousX = p.x;
      previousY = p.y;
      ctx.translate(p.x, p.y + (moving ? Math.sin(s.time * 17) * 1.6 : 0));
      ctx.rotate(p.facing);
      ctx.globalAlpha = p.invuln > 0 ? 0.82 + 0.18 * Math.sin(s.time * 40) : 1;
      const sprite = heroSprite(
        s.hero,
        meta.selectedSkin,
        s.time - p.lastDamage < 0.16,
      );
      ctx.drawImage(sprite, -30, -30, 60, 60);
      const weapon = weaponData(p.weapons[s.activeSlot]);
      ctx.save();
      ctx.translate(23, 19);
      ctx.rotate(Math.PI / 4);
      ctx.drawImage(art.weapon(weapon.id), -24, -24, 48, 48);
      ctx.restore();
      ctx.globalAlpha = 1;
      if (p.swing > 0) {
        const wp = weaponData(p.weapons[s.activeSlot]);
        const range = wp.projectile ? 65 : wp.range;
        ctx.drawImage(slash, -range, -range, range * 2, range * 2);
        ctx.fillStyle = "#ffdc8822";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(
          0,
          0,
          wp.projectile ? 65 : wp.range,
          -(wp.arc || 1) / 2,
          (wp.arc || 1) / 2,
        );
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#fff1b5";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(
          0,
          0,
          wp.projectile ? 40 : wp.range,
          -(wp.arc || 1) / 2,
          (wp.arc || 1) / 2,
        );
        ctx.stroke();
      }
      ctx.restore();
      if (p.dome > 0) {
        circle(p.x, p.y, 95, "#acd9ff22");
        ctx.strokeStyle = "#b4e4ff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 95, 0, 7);
        ctx.stroke();
      }
      if (s.target) {
        ctx.strokeStyle = "#f8dd8a55";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.target.x, s.target.y, s.target.radius + 8, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },
    minimap(s, mini) {
      const c = mini.getContext("2d");
      c.clearRect(0, 0, 160, 130);
      if (!s) return;
      c.strokeStyle = "#8d8258";
      for (const r of s.dungeon.rooms) {
        if (!r.discovered) continue;
        const x = (r.x / (SIZE * TILE)) * 150 + 5,
          y = (r.y / (SIZE * TILE)) * 120 + 5;
        if (r.parent >= 0) {
          const p = s.dungeon.rooms[r.parent];
          if (p.discovered) {
            c.beginPath();
            c.moveTo(x + 10, y + 8);
            c.lineTo(
              (p.cx / (SIZE * TILE)) * 150 + 5,
              (p.cy / (SIZE * TILE)) * 120 + 5,
            );
            c.stroke();
          }
        }
        c.fillStyle =
          r.id === s.currentRoom
            ? "#f0d18c"
            : r.cleared
              ? "#5c8079"
              : "#58405c";
        c.fillRect(
          x,
          y,
          (r.w / (SIZE * TILE)) * 150,
          (r.h / (SIZE * TILE)) * 120,
        );
        c.fillStyle = "#fff";
        c.font = "11px sans-serif";
        c.fillText(
          { chest: "▣", shop: "$", exit: "○", boss: "♜" }[r.type] || "",
          x + 5,
          y + 12,
        );
      }
    },
  };
}
