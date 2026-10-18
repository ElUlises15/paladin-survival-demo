import { random, seedToRngState } from "../sim/rng.js";
import {
  generateDungeon,
  moveCircle,
  lineOfSight,
  roomAt,
  solid,
} from "./dungeon.js";
import { HEROES, BOSSES, weapon, weaponData } from "./data.js";
export function createRun(
  meta,
  { seed = 1, floor = 1, checkpoint = null } = {},
) {
  const c = checkpoint,
    hero = c?.hero || meta.selectedHero,
    h = HEROES[hero],
    t = meta.talents;
  const s = {
    seed: c?.seed ?? seed,
    rngState: seedToRngState(c?.seed ?? seed),
    floor: c?.floor ?? floor,
    hero,
    talents: { ...t },
    unlockedWeapons: [...meta.weapons],
    time: c?.time || 0,
    kills: c?.kills || 0,
    rooms: c?.rooms || 0,
    rewards: c?.rewards ? { ...c.rewards } : { almas: 0, gemas: 0 },
    revived: c?.revived || false,
    mode: "playing",
    enemies: [],
    bullets: [],
    effects: [],
    drops: [],
    events: [],
    nextId: 1,
    activeSlot: 0,
    player: {
      x: 0,
      y: 0,
      radius: 17,
      hp: c?.hp ?? h.hp * (1 + 0.08 * (t.vigor || 0)),
      maxHp: h.hp * (1 + 0.08 * (t.vigor || 0)),
      armor: h.armor + (t.bastion || 0),
      maxArmor: h.armor + (t.bastion || 0),
      speed: h.speed,
      facing: 0,
      oro: c?.oro ?? 15 * (t.bolsa || 0),
      weapons: c?.weapons?.map((w) => ({ ...w })) || [
        weapon(),
        weapon("crossbow"),
      ],
      attackCd: 0,
      dashCd: 0,
      dashTime: 0,
      dashX: 1,
      dashY: 0,
      skillCd: 0,
      dome: 0,
      invuln: 0,
      lastDamage: -10,
      swing: 0,
      combo: 0,
      buff: c?.buff || 0,
    },
  };
  loadFloor(s, s.floor);
  return s;
}
export function loadFloor(s, floor) {
  s.floor = floor;
  s.dungeon = generateDungeon(s.seed, floor);
  const r = s.dungeon.rooms[0];
  s.player.x = r.cx;
  s.player.y = r.cy;
  s.currentRoom = 0;
  s.enemies = [];
  s.bullets = [];
  s.effects = [];
  s.drops = [];
  s.target = null;
  s.mode = "playing";
  s.events.push({ type: "floor" });
  for (const r of s.dungeon.rooms) {
    if (r.type === "chest")
      s.drops.push({ kind: "chest", x: r.cx, y: r.cy, room: r.id });
    if (r.type === "shop")
      for (let i = 0; i < 3; i++)
        s.drops.push({
          kind: ["weapon", "potion", "buff"][i],
          x: r.cx + (i - 1) * 110,
          y: r.cy,
          room: r.id,
          price: [70, 30, 60][i],
          weapon: rollWeapon(s),
        });
    if (r.type === "exit")
      s.drops.push({ kind: "portal", x: r.cx, y: r.cy, room: r.id });
  }
}
export function checkpoint(s) {
  return {
    seed: s.seed,
    floor: s.floor,
    hero: s.hero,
    hp: s.player.hp,
    oro: s.player.oro,
    weapons: s.player.weapons.map((w) => ({ ...w })),
    buff: s.player.buff,
    time: s.time,
    kills: s.kills,
    rooms: s.rooms,
    rewards: { ...s.rewards },
    revived: s.revived,
  };
}
export function rollWeapon(s) {
  const list = s.unlockedWeapons;
  return weapon(
    list[Math.floor(random(s) * list.length)] || "sword",
    Math.min(3, Math.floor(random(s) * 2 + Math.max(0, s.floor - 4) / 4)),
  );
}
export function autoAim(s) {
  let best = null,
    d = 560;
  for (const e of s.enemies) {
    if (e.hp <= 0 || e.room !== s.currentRoom || e.spawn > 0) continue;
    const n = Math.hypot(e.x - s.player.x, e.y - s.player.y);
    if (n < d && lineOfSight(s.dungeon, s.player, e)) {
      best = e;
      d = n;
    }
  }
  return best;
}
export function damagePlayer(s, amount) {
  const p = s.player;
  if (p.invuln > 0 || p.dashTime > 0 || p.dome > 0 || s.mode !== "playing")
    return false;
  const a = Math.min(p.armor, amount);
  p.armor -= a;
  p.hp -= amount - a;
  p.lastDamage = s.time;
  p.invuln = 0.65;
  s.events.push({ type: "damage" });
  s.effects.push({ kind: "hurt", x: p.x, y: p.y, r: 35, t: 0.3 });
  if (p.hp <= 0) {
    p.hp = 0;
    s.mode = "dead";
    s.events.push({ type: "death" });
  }
  return true;
}
export function spawnEnemy(s, type, r, boss = false) {
  const hp =
      (boss ? 3200 : [38, 100, 50, 44, 62][type]) * (1 + (s.floor - 1) * 0.2),
    angle = random(s) * Math.PI * 2;
  const e = {
    id: s.nextId++,
    type,
    boss,
    name: boss
      ? BOSSES[Math.floor((s.floor - 1) / 3)]
      : [
          "Diablillo",
          "Bruto",
          "Acechador",
          "Brujo",
          s.floor < 4 ? "Torreta de huesos" : "Espíritu",
        ][type],
    room: r.id,
    x: r.cx + Math.cos(angle) * 180,
    y: r.cy + Math.sin(angle) * 170,
    radius: boss ? 42 : type === 1 ? 25 : 18,
    hp,
    maxHp: hp,
    damage: (boss ? 20 : 9) * (1 + s.floor * 0.12),
    speed: boss ? 65 : [110, 65, 125, 65, 35][type],
    spawn: 0.6,
    windup: 0,
    cd: 1.5,
    pattern: 0,
    stun: 0,
    charge: 0,
    dx: 0,
    dy: 0,
  };
  s.enemies.push(e);
  return e;
}
function hit(s, e, damage, knockback = 0) {
  if (e.hp <= 0 || e.spawn > 0) return;
  e.hp -= damage;
  s.events.push({ type: "hit", x: e.x, y: e.y, heavy: damage >= 75 });
  s.effects.push({
    kind: "number",
    x: e.x,
    y: e.y - 20,
    value: Math.round(damage),
    crit: damage >= 75,
    t: 0.8,
  });
  e.stun = 0.15;
  if (knockback) {
    const a = Math.atan2(e.y - s.player.y, e.x - s.player.x);
    moveCircle(s.dungeon, e, Math.cos(a) * knockback, Math.sin(a) * knockback);
  }
  s.effects.push({ kind: "hit", x: e.x, y: e.y, r: e.radius + 7, t: 0.18 });
  if (e.hp <= 0) {
    s.effects.push(
      { kind: "burst", x: e.x, y: e.y, t: 0.6 },
      { kind: "soul", x: e.x, y: e.y, t: 1 },
    );
    s.kills++;
    s.events.push({ type: e.boss ? "bossKill" : "kill", x: e.x, y: e.y });
    s.drops.push({ kind: "coin", x: e.x, y: e.y, amount: e.boss ? 80 : 4 });
    if (random(s) < 0.12)
      s.drops.push({
        kind: random(s) < 0.5 ? "health" : "energy",
        x: e.x + 20,
        y: e.y,
      });
    if (e.boss) {
      s.rewards.almas += 100;
      s.rewards.gemas += 25;
      s.events.push({ type: "world", world: Math.ceil(s.floor / 3) });
    }
  }
}
function shoot(s, e, a, speed = 180, damage = e.damage) {
  s.bullets.push({
    x: e.x,
    y: e.y,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    radius: 7,
    life: 6,
    damage,
    enemy: true,
  });
}
function bossAttack(s, e) {
  s.events.push({ type: "slam", x: e.x, y: e.y });
  const world = Math.floor((s.floor - 1) / 3),
    phase = e.hp < e.maxHp * 0.5 ? 2 : 1,
    p = s.player,
    a = Math.atan2(p.y - e.y, p.x - e.x),
    pattern = e.pattern++ % 3;
  if (world === 0) {
    if (pattern === 0) {
      for (let i = -1; i <= 1; i++)
        s.effects.push({
          kind: "root",
          x: e.x,
          y: e.y,
          a: a + i * 0.35,
          r: 500,
          t: 1,
          delay: 0.7,
          damage: e.damage,
        });
    } else if (pattern === 1) {
      const r = s.dungeon.rooms[e.room];
      for (let i = 0; i < 2 + phase; i++)
        if (s.enemies.length < 28) spawnEnemy(s, 0, r);
    } else
      for (let i = 0; i < 10 + phase * 4; i++)
        shoot(s, e, (i * Math.PI * 2) / (10 + phase * 4), 145);
  }
  if (world === 1) {
    if (pattern === 0) {
      e.charge = 1.2;
      e.dx = Math.cos(a);
      e.dy = Math.sin(a);
      s.effects.push({
        kind: "root",
        x: e.x,
        y: e.y,
        a,
        r: 450,
        t: 0.7,
        delay: 2,
        damage: 0,
      });
    } else if (pattern === 1)
      for (let i = 0; i < 16 * phase; i++)
        shoot(s, e, (i * Math.PI * 2) / (16 * phase), 170);
    else
      for (let i = 0; i < 3; i++)
        if (s.enemies.length < 28) spawnEnemy(s, 1, s.dungeon.rooms[e.room]);
  }
  if (world === 2) {
    if (pattern === 0)
      for (let i = -4; i <= 4; i++) shoot(s, e, a + i * 0.16, 190 + phase * 20);
    else if (pattern === 1)
      for (let i = 0; i < 24 * phase; i++)
        shoot(s, e, i * 0.58 + s.time, 135 + i * 2);
    else
      for (let i = 0; i < 5 * phase; i++)
        s.effects.push({
          kind: "meteor",
          x: p.x + (random(s) - 0.5) * 300,
          y: p.y + (random(s) - 0.5) * 300,
          r: 65,
          t: 1.4,
          delay: 1,
          damage: e.damage,
        });
  }
  e.cd = phase === 2 ? 1.8 : 2.8;
}
export function nearestInteract(s) {
  let best = null,
    d = 76;
  for (const item of s.drops) {
    if (["coin", "health", "energy"].includes(item.kind)) continue;
    const n = Math.hypot(item.x - s.player.x, item.y - s.player.y);
    if (n < d) {
      best = item;
      d = n;
    }
  }
  return best;
}
export function interact(s) {
  const item = nearestInteract(s);
  if (!item) return false;
  const p = s.player;
  if (item.price && p.oro < item.price) {
    s.events.push({ type: "poor" });
    return false;
  }
  if (item.price) p.oro -= item.price;
  if (item.kind === "portal") {
    if (s.floor === 9) {
      s.mode = "victory";
      s.events.push({ type: "victory" });
    } else {
      s.rewards.almas += 35;
      s.rewards.gemas += 5;
      loadFloor(s, s.floor + 1);
    }
    return true;
  }
  s.drops.splice(s.drops.indexOf(item), 1);
  if (item.kind === "chest") {
    s.events.push({ type: "chest" });
    s.effects.push({ kind: "opened", x: item.x, y: item.y, t: 8 });
    const choice = random(s);
    s.drops.push(
      choice < 0.65
        ? {
            kind: "weapon",
            weapon: rollWeapon(s),
            x: item.x,
            y: item.y,
            room: item.room,
          }
        : {
            kind: choice < 0.85 ? "potion" : "coins",
            x: item.x,
            y: item.y,
            room: item.room,
          },
    );
  }
  if (item.kind === "weapon") {
    const old = p.weapons[s.activeSlot];
    p.weapons[s.activeSlot] = item.weapon;
    s.drops.push({
      kind: "weapon",
      weapon: old,
      x: item.x + 85,
      y: item.y,
      room: item.room,
    });
  }
  if (item.kind === "potion") p.hp = Math.min(p.maxHp, p.hp + 45);
  if (item.kind === "coins") p.oro += 45;
  if (item.kind === "buff") p.buff += 0.12;
  s.events.push({ type: "pickup" });
  return true;
}
function step(s, dt, input) {
  s.time += dt;
  const p = s.player;
  s.events.length = 0;
  for (const k of [
    "attackCd",
    "dashCd",
    "dashTime",
    "skillCd",
    "dome",
    "invuln",
    "swing",
  ])
    p[k] = Math.max(0, p[k] - dt);
  if (s.time - p.lastDamage > 3)
    p.armor = Math.min(p.maxArmor, p.armor + 7 * dt);
  let mx = input.moveX || 0,
    my = input.moveY || 0,
    len = Math.hypot(mx, my);
  if (len > 1) {
    mx /= len;
    my /= len;
  }
  if (mx || my) p.facing = Math.atan2(my, mx);
  if (input.swap) p.weapons.length > 1 && (s.activeSlot = 1 - s.activeSlot);
  if (input.dash && p.dashCd <= 0) {
    p.dashTime = 0.25;
    p.invuln = Math.max(p.invuln, 0.25);
    p.dashCd = 1 * (1 - 0.08 * (s.talents.reflejos || 0));
    p.dashX = mx || my ? mx / Math.hypot(mx, my) : Math.cos(p.facing);
    p.dashY = mx || my ? my / Math.hypot(mx, my) : Math.sin(p.facing);
    s.events.push({ type: "dash" });
  }
  moveCircle(
    s.dungeon,
    p,
    (p.dashTime > 0 ? p.dashX * 650 : mx * p.speed) * dt,
    (p.dashTime > 0 ? p.dashY * 650 : my * p.speed) * dt,
  );
  const r = roomAt(s.dungeon, p, true);
  if (r) {
    s.currentRoom = r.id;
    r.discovered = true;
    if (!r.cleared && !r.locked && ["combat", "boss"].includes(r.type)) {
      r.locked = true;
      s.events.push({ type: "lock" });
      r.spawnTimer = 0.25;
    }
  }
  const room = s.dungeon.rooms[s.currentRoom];
  if (room.locked) {
    // Anti-traba: un enemigo de la sala cerrada que quedó fuera de sus límites (empuje, embestida) vuelve adentro;
    // si no, la sala nunca se abriría.
    for (const e of s.enemies)
      if (
        e.room === room.id &&
        e.hp > 0 &&
        (e.x < room.x + 8 ||
          e.x > room.x + room.w - 8 ||
          e.y < room.y + 8 ||
          e.y > room.y + room.h - 8)
      ) {
        e.x = room.cx + (random(s) - 0.5) * 120;
        e.y = room.cy + (random(s) - 0.5) * 120;
      }
    if (!s.enemies.some((e) => e.room === room.id && e.hp > 0)) {
      room.spawnTimer -= dt;
      if (room.spawnTimer <= 0) {
        if (room.wave < (room.type === "boss" ? 1 : room.waves)) {
          room.wave++;
          if (room.type === "boss") spawnEnemy(s, 0, room, true);
          else
            for (let i = 0; i < 3 + Math.min(5, s.floor) + room.wave; i++)
              spawnEnemy(s, Math.floor(random(s) * 5), room);
          room.spawnTimer = 1;
        } else {
          room.locked = false;
          room.cleared = true;
          s.rooms++;
          s.rewards.almas += 12 + s.floor * 2;
          s.drops.push({ kind: "coin", x: room.cx, y: room.cy, amount: 15 });
          if (random(s) < 0.5)
            s.drops.push({
              kind: random(s) < 0.5 ? "health" : "energy",
              x: room.cx + 30,
              y: room.cy,
            });
          s.events.push({ type: "room" });
          // Jefe final del mundo 3: la sala se liquida (recompensas, conteo) y recién ahí termina la partida.
          if (room.type === "boss" && s.floor === 9) {
            s.mode = "victory";
            s.events.push({ type: "victory" });
          } else if (room.type === "boss")
            s.drops.push({
              kind: "portal",
              x: room.cx,
              y: room.cy,
              room: room.id,
            });
        }
      }
    }
  }
  if (
    p.attackCd > 0 &&
    p.attackCd <= dt &&
    weaponData(p.weapons[s.activeSlot]).projectile
  )
    s.events.push({ type: "draw" });
  s.target = autoAim(s);
  if (s.target) p.facing = Math.atan2(s.target.y - p.y, s.target.x - p.x);
  if (input.interact) interact(s);
  if (input.skill && p.skillCd <= 0) {
    p.skillCd = HEROES[s.hero].cooldown * (1 - 0.06 * (s.talents.fe || 0));
    s.events.push({ type: "skill" });
    if (s.hero === "cruzada") p.dome = 2.5;
    else {
      const radius = s.hero === "inquisidor" ? 240 : 160;
      s.effects.push({ kind: "nova", x: p.x, y: p.y, r: radius, t: 0.5 });
      for (const e of s.enemies)
        if (Math.hypot(e.x - p.x, e.y - p.y) < radius) {
          hit(s, e, s.hero === "inquisidor" ? 110 : 75, 50);
          if (s.hero === "inquisidor") e.stun = 2;
        }
    }
  }
  const combo = p.combo > 0 && (p.combo -= dt) <= 0;
  if ((input.attack && p.attackCd <= 0) || combo) {
    const w = weaponData(combo ? p.comboWeapon : p.weapons[s.activeSlot]);
    if (!combo) p.attackCd = w.cooldown;
    if (w.hits && !combo) {
      p.combo = 0.1;
      p.comboWeapon = { ...p.weapons[s.activeSlot] };
    }
    p.swing = 0.16;
    s.events.push({ type: "attack" });
    const damage = w.damage * (1 + 0.05 * (s.talents.filo || 0) + p.buff);
    if (w.projectile)
      s.bullets.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(p.facing) * w.projectile,
        vy: Math.sin(p.facing) * w.projectile,
        radius: 6,
        life: 3,
        enemy: false,
        damage,
        homing: w.homing,
        speed: w.projectile,
      });
    else
      for (const e of s.enemies) {
        const a = Math.atan2(e.y - p.y, e.x - p.x),
          diff = Math.atan2(Math.sin(a - p.facing), Math.cos(a - p.facing));
        if (
          Math.hypot(e.x - p.x, e.y - p.y) < w.range + e.radius &&
          Math.abs(diff) < w.arc / 2 &&
          lineOfSight(s.dungeon, p, e)
        )
          hit(s, e, damage, w.knockback || 15);
      }
  }
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    if (e.spawn > 0) {
      e.spawn -= dt;
      continue;
    }
    e.stun = Math.max(0, e.stun - dt);
    e.cd -= dt;
    if (e.stun > 0) continue;
    const a = Math.atan2(p.y - e.y, p.x - e.x),
      dist = Math.hypot(p.x - e.x, p.y - e.y);
    e.facing = a;
    if (e.boss) {
      if (e.cd <= 0 && !e.windup) {
        e.windup = 0.65;
        s.events.push({ type: "roar" });
      }
      if (e.windup > 0) {
        e.windup -= dt;
        if (e.windup <= 0) {
          e.windup = 0;
          bossAttack(s, e);
        }
      }
      if (e.charge > 0) {
        e.charge -= dt;
        moveCircle(s.dungeon, e, e.dx * 400 * dt, e.dy * 400 * dt);
      } else if (dist > 160)
        moveCircle(
          s.dungeon,
          e,
          Math.cos(a) * e.speed * dt,
          Math.sin(a) * e.speed * dt,
        );
    } else if (e.type >= 3) {
      if (e.cd <= 0.6 && e.cd > 0) e.telegraph = true;
      if (e.cd <= 0) {
        if (lineOfSight(s.dungeon, e, p)) {
          const biome = Math.floor((s.floor - 1) / 3);
          const count =
            e.type === 3 ? 1 : biome === 0 ? 3 : biome === 1 ? 4 : 5;
          for (let i = 0; i < count; i++) {
            const angle =
              e.type === 3
                ? a
                : biome === 1
                  ? s.time + (i * Math.PI) / 2
                  : a + (i - (count - 1) / 2) * 0.24;
            shoot(s, e, angle, 150 + s.floor * 7);
          }
        }
        e.cd = 2.5;
        e.telegraph = false;
      }
      if (dist > 290)
        moveCircle(
          s.dungeon,
          e,
          Math.cos(a) * e.speed * dt,
          Math.sin(a) * e.speed * dt,
        );
    } else {
      let speed = e.speed;
      if (e.type === 2 && e.cd <= 0) {
        e.charge = 0.4;
        e.dx = Math.cos(a);
        e.dy = Math.sin(a);
        e.cd = 3;
      }
      if (e.charge > 0) {
        e.charge -= dt;
        moveCircle(s.dungeon, e, e.dx * 330 * dt, e.dy * 330 * dt);
      } else
        moveCircle(
          s.dungeon,
          e,
          Math.cos(a) * speed * dt,
          Math.sin(a) * speed * dt,
        );
    }
    if (dist < p.radius + e.radius) damagePlayer(s, e.damage);
  }
  // Symmetric separation preserves space between enemies and respects tile collision.
  for (let i = 0; i < s.enemies.length; i++)
    for (let j = i + 1; j < s.enemies.length; j++) {
      const a = s.enemies[i],
        b = s.enemies[j];
      if (a.hp <= 0 || b.hp <= 0) continue;
      const dx = b.x - a.x,
        dy = b.y - a.y,
        d = Math.hypot(dx, dy),
        min = a.radius + b.radius + 7;
      if (d < min) {
        const nx = d ? dx / d : 1,
          ny = d ? dy / d : 0,
          push = Math.min((min - d) * 0.5, 120 * dt);
        moveCircle(s.dungeon, a, -nx * push, -ny * push);
        moveCircle(s.dungeon, b, nx * push, ny * push);
      }
    }
  if (p.dashTime > 0 && Math.floor(s.time * 60) % 3 === 0)
    s.effects.push({ kind: "afterimage", x: p.x, y: p.y, t: 0.3 });
  while (s.effects.length > 160) {
    const cosmetic = s.effects.findIndex(
      (f) => f.kind !== "root" && f.kind !== "meteor",
    );
    if (cosmetic < 0) break;
    s.effects.splice(cosmetic, 1);
  }
  for (const b of s.bullets) {
    b.life -= dt;
    if (b.homing && s.target) {
      const a = Math.atan2(s.target.y - b.y, s.target.x - b.x);
      b.vx += (Math.cos(a) * b.speed - b.vx) * dt * 5;
      b.vy += (Math.sin(a) * b.speed - b.vy) * dt * 5;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (solid(s.dungeon, b.x, b.y)) {
      b.life = 0;
      if (!b.enemy)
        s.events.push({
          type: "arrowWall",
          x: b.x - b.vx * dt,
          y: b.y - b.vy * dt,
          angle: Math.atan2(b.vy, b.vx),
        });
    }
    if (b.enemy) {
      if (p.dome > 0 && Math.hypot(p.x - b.x, p.y - b.y) < 95) b.life = 0;
      else if (Math.hypot(p.x - b.x, p.y - b.y) < p.radius + b.radius) {
        damagePlayer(s, b.damage);
        b.life = 0;
      }
    } else
      for (const e of s.enemies)
        if (
          e.hp > 0 &&
          e.spawn <= 0 &&
          Math.hypot(e.x - b.x, e.y - b.y) < e.radius + b.radius
        ) {
          hit(s, e, b.damage, 10);
          b.life = 0;
          break;
        }
  }
  for (const f of s.effects) {
    f.t -= dt;
    if (f.delay !== undefined) {
      f.delay -= dt;
      if (f.delay <= 0 && !f.fired) {
        f.fired = true;
        if (f.kind === "meteor" && Math.hypot(p.x - f.x, p.y - f.y) < f.r)
          damagePlayer(s, f.damage);
        if (f.kind === "root") {
          const dx = p.x - f.x,
            dy = p.y - f.y,
            along = dx * Math.cos(f.a) + dy * Math.sin(f.a),
            across = Math.abs(-dx * Math.sin(f.a) + dy * Math.cos(f.a));
          if (along >= 0 && along < f.r && across < 25)
            damagePlayer(s, f.damage);
        }
      }
    }
  }
  for (const d of s.drops)
    if (
      ["coin", "health", "energy"].includes(d.kind) &&
      Math.hypot(p.x - d.x, p.y - d.y) < 40
    ) {
      if (d.kind === "coin") p.oro += d.amount;
      if (d.kind === "health") p.hp = Math.min(p.maxHp, p.hp + 18);
      if (d.kind === "energy") p.skillCd = Math.max(0, p.skillCd - 3);
      d.taken = true;
      s.events.push({
        type: d.kind === "health" ? "heal" : "pickup",
        x: d.x,
        y: d.y,
      });
    }
  s.enemies = s.enemies.filter((e) => e.hp > 0);
  s.bullets = s.bullets.filter((b) => b.life > 0);
  s.effects = s.effects.filter((f) => f.t > 0);
  s.drops = s.drops.filter((d) => !d.taken);
}
export function updateRun(s, dt, input = {}) {
  if (s.mode !== "playing") return;
  const n = Math.ceil(dt / (1 / 60));
  for (let i = 0; i < n && s.mode === "playing"; i++)
    step(s, dt / n, {
      ...input,
      swap: i === 0 && input.swap,
      dash: i === 0 && input.dash,
      skill: i === 0 && input.skill,
      interact: i === 0 && input.interact,
    });
}
export function revive(s) {
  if (s.revived || s.mode !== "dead") return false;
  s.revived = true;
  s.player.hp = s.player.maxHp * 0.85;
  s.player.armor = s.player.maxArmor;
  s.player.invuln = 3;
  s.mode = "playing";
  return true;
}
