// Bounded reusable presentation particles: never consume the simulation RNG.
export function createParticles(capacity = 240) {
  const active = [],
    free = [];
  let limit = capacity;
  return {
    get active() {
      return active;
    },
    setLimit(value) {
      limit = Math.max(0, Math.min(capacity, value));
      while (active.length > limit) free.push(active.pop());
    },
    emit(x, y, color, count = 8, speed = 85, life = 0.6, kind = "spark") {
      for (let i = 0; i < count && active.length < limit; i++) {
        const a = Math.random() * Math.PI * 2,
          v = Math.random() * speed;
        const p = free.pop() || {};
        Object.assign(p, {
          x,
          y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          life,
          max: life,
          color,
          kind,
          angle: a,
        });
        active.push(p);
      }
    },
    update(dt) {
      for (let i = active.length - 1; i >= 0; i--) {
        const p = active[i];
        p.life -= dt;
        if (p.life <= 0) {
          free.push(p);
          active[i] = active[active.length - 1];
          active.pop();
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy -= dt * 9;
      }
    },
    clear() {
      while (active.length) free.push(active.pop());
    },
  };
}
