// Presentation snapshots never enter checkpoints or the deterministic simulation.
export const lerp = (a, b, alpha) =>
  a + (b - a) * Math.max(0, Math.min(1, alpha));
export function interpolateEntities(previous, current, alpha) {
  const byId = new Map(previous.map((entity) => [entity.id, entity]));
  return current.map((entity) => {
    const before = byId.get(entity.id);
    return before
      ? {
          ...entity,
          x: lerp(before.x, entity.x, alpha),
          y: lerp(before.y, entity.y, alpha),
        }
      : { ...entity };
  });
}
export function createInterpolation() {
  let before = null;
  const cameraTarget = (p) => ({
    x: p.x + Math.cos(p.facing) * 32,
    y: p.y + Math.sin(p.facing) * 22,
  });
  const identities = new WeakMap();
  let nextId = 1;
  const projectiles = (s) =>
    s.bullets.map((b) => {
      if (!identities.has(b)) identities.set(b, nextId++);
      return { ...b, id: identities.get(b) };
    });
  return {
    snapshot(s) {
      before = {
        dungeon: s.dungeon,
        player: { ...s.player },
        cameraTarget: cameraTarget(s.player),
        enemies: s.enemies.map((e) => ({ ...e })),
        bullets: projectiles(s),
      };
    },
    render(s, alpha) {
      if (!s || before?.dungeon !== s.dungeon) return s;
      return {
        ...s,
        cameraTarget: {
          x: lerp(before.cameraTarget.x, cameraTarget(s.player).x, alpha),
          y: lerp(before.cameraTarget.y, cameraTarget(s.player).y, alpha),
        },
        player: {
          ...s.player,
          x: lerp(before.player.x, s.player.x, alpha),
          y: lerp(before.player.y, s.player.y, alpha),
        },
        enemies: interpolateEntities(before.enemies, s.enemies, alpha),
        bullets: interpolateEntities(before.bullets, projectiles(s), alpha),
      };
    },
    reset() {
      before = null;
    },
  };
}
