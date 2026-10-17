import { seedToRngState, random } from "../sim/rng.js";
export const TILE = 48,
  ROOM = 12,
  STRIDE = 16,
  GRID = 5,
  SIZE = GRID * STRIDE;
export function generateDungeon(seed, floor = 1) {
  const rng = { rngState: seedToRngState(`${seed}:${floor}`) },
    rooms = [{ gx: 2, gy: 2, parent: -1 }],
    used = new Set(["2,2"]);
  const count = 6 + Math.floor(random(rng) * 4);
  while (rooms.length < count) {
    const p = Math.floor(random(rng) * rooms.length),
      r = rooms[p],
      ds = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ],
      d = ds[Math.floor(random(rng) * 4)],
      gx = r.gx + d[0],
      gy = r.gy + d[1],
      k = `${gx},${gy}`;
    if (gx < 0 || gy < 0 || gx >= 5 || gy >= 5 || used.has(k)) continue;
    used.add(k);
    rooms.push({ gx, gy, parent: p });
  }
  const tiles = new Uint8Array(SIZE * SIZE),
    doors = [];
  const carve = (x, y) => {
    tiles[y * SIZE + x] = 1;
  };
  rooms.forEach((r, i) => {
    Object.assign(r, {
      id: i,
      type: i === 0 ? "start" : "combat",
      x: (r.gx * STRIDE + 2) * TILE,
      y: (r.gy * STRIDE + 2) * TILE,
      w: ROOM * TILE,
      h: ROOM * TILE,
      discovered: i === 0,
      cleared: i === 0,
      locked: false,
      wave: 0,
      waves: 2 + Math.floor(random(rng) * 2),
      spawnTimer: 0,
    });
    r.cx = r.x + r.w / 2;
    r.cy = r.y + r.h / 2;
    for (let y = r.gy * STRIDE + 2; y < r.gy * STRIDE + 2 + ROOM; y++)
      for (let x = r.gx * STRIDE + 2; x < r.gx * STRIDE + 2 + ROOM; x++)
        carve(x, y);
    if (i) {
      const p = rooms[r.parent],
        ax = Math.floor(p.cx / TILE),
        ay = Math.floor(p.cy / TILE),
        bx = Math.floor(r.cx / TILE),
        by = Math.floor(r.cy / TILE);
      for (let y = Math.min(ay, by) - 1; y <= Math.max(ay, by); y++)
        for (let x = Math.min(ax, bx) - 1; x <= Math.max(ax, bx); x++)
          carve(x, y);
      const horizontal = ay === by;
      for (const room of [p, r]) {
        const other = room === p ? r : p;
        doors.push({
          room: room.id,
          x: horizontal
            ? (other.cx > room.cx ? room.x + room.w : room.x) - 8
            : room.cx - TILE,
          y: horizontal
            ? room.cy - TILE
            : (other.cy > room.cy ? room.y + room.h : room.y) - 8,
          w: horizontal ? 16 : TILE * 2,
          h: horizontal ? TILE * 2 : 16,
        });
      }
    }
  });
  rooms.at(-1).type = floor % 3 === 0 ? "boss" : "exit";
  rooms[1].type = "chest";
  if (floor % 3 === 2) rooms[2].type = "shop";
  return { seed, floor, rooms, doors, tiles, size: SIZE, tile: TILE };
}
export function solid(d, x, y) {
  const tx = Math.floor(x / TILE),
    ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= SIZE || ty >= SIZE || !d.tiles[ty * SIZE + tx])
    return true;
  return d.doors.some(
    (b) =>
      d.rooms[b.room].locked &&
      x >= b.x &&
      x <= b.x + b.w &&
      y >= b.y &&
      y <= b.y + b.h,
  );
}
function circleRect(x, y, r, bx, by, bw, bh) {
  const dx = x - Math.max(bx, Math.min(x, bx + bw)),
    dy = y - Math.max(by, Math.min(y, by + bh));
  return dx * dx + dy * dy < r * r;
}
export function circleBlocked(d, x, y, r) {
  for (
    let ty = Math.floor((y - r) / TILE);
    ty <= Math.floor((y + r) / TILE);
    ty++
  )
    for (
      let tx = Math.floor((x - r) / TILE);
      tx <= Math.floor((x + r) / TILE);
      tx++
    ) {
      if (
        tx >= 0 &&
        ty >= 0 &&
        tx < SIZE &&
        ty < SIZE &&
        d.tiles[ty * SIZE + tx]
      )
        continue;
      if (circleRect(x, y, r, tx * TILE, ty * TILE, TILE, TILE)) return true;
    }
  for (const b of d.doors)
    if (d.rooms[b.room].locked && circleRect(x, y, r, b.x, b.y, b.w, b.h))
      return true;
  return false;
}
export function moveCircle(d, e, dx, dy) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 8));
  for (let i = 0; i < n; i++) {
    if (!circleBlocked(d, e.x + dx / n, e.y, e.radius)) e.x += dx / n;
    if (!circleBlocked(d, e.x, e.y + dy / n, e.radius)) e.y += dy / n;
  }
}
export function lineOfSight(d, a, b) {
  const dist = Math.hypot(b.x - a.x, b.y - a.y),
    n = Math.ceil(dist / 12);
  for (let i = 1; i <= n; i++)
    if (solid(d, a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n))
      return false;
  return true;
}
// Bars extend 8 px into a room; wait until the entire circle clears them.
export function roomAt(d, p, inside = false) {
  return d.rooms.find(
    (r) =>
      p.x >= r.x + (inside ? p.radius + 10 : 0) &&
      p.x <= r.x + r.w - (inside ? p.radius + 10 : 0) &&
      p.y >= r.y + (inside ? p.radius + 10 : 0) &&
      p.y <= r.y + r.h - (inside ? p.radius + 10 : 0),
  );
}
