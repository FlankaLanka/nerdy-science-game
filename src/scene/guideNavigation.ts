import { canWalk } from "./navigation.ts";
import type { Obstacle } from "./navigation.ts";
export type GuidePoint = { x: number; z: number };
export function clearGuidePath(
  a: GuidePoint,
  b: GuidePoint,
  obstacles: Obstacle[],
) {
  const distance = Math.hypot(b.x - a.x, b.z - a.z),
    steps = Math.max(1, Math.ceil(distance / 0.16));
  for (let i = 1; i <= steps; i++)
    if (
      !canWalk(
        a.x + ((b.x - a.x) * i) / steps,
        a.z + ((b.z - a.z) * i) / steps,
        obstacles,
      )
    )
      return false;
  return true;
}
/** Bounded A*: a closed door yields its reachable approach, never a teleport. */
export function guidePath(
  start: GuidePoint,
  target: GuidePoint,
  obstacles: Obstacle[],
): GuidePoint[] {
  if (clearGuidePath(start, target, obstacles)) return [target];
  type Node = GuidePoint & { g: number; h: number; parent: Node | null };
  const distance = (p: GuidePoint) =>
    Math.hypot(target.x - p.x, target.z - p.z);
  const nodes: Node[] = [];
  const scores = new Map<string, number>();
  for (let x = Math.floor(start.x) - 1; x <= Math.ceil(start.x) + 1; x++)
    for (let z = Math.floor(start.z) - 1; z <= Math.ceil(start.z) + 1; z++) {
      const p = { x, z };
      if (clearGuidePath(start, p, obstacles))
        nodes.push({
          ...p,
          g: Math.hypot(x - start.x, z - start.z),
          h: distance(p),
          parent: null,
        });
    }
  let best: Node | null = null,
    iterations = 0;
  while (nodes.length && iterations++ < 6500) {
    let winner = 0;
    for (let i = 1; i < nodes.length; i++)
      if (nodes[i].g + nodes[i].h < nodes[winner].g + nodes[winner].h)
        winner = i;
    const n = nodes.splice(winner, 1)[0],
      key = `${n.x},${n.z}`;
    if ((scores.get(key) ?? Infinity) < n.g) continue;
    if (!best || n.h < best.h) best = n;
    if (n.h < 1.5 && clearGuidePath(n, target, obstacles)) {
      best = { ...target, g: n.g + n.h, h: 0, parent: n };
      break;
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = n.x + dx,
        z = n.z + dz,
        k = `${x},${z}`,
        g = n.g + 1;
      if (
        x < -21 ||
        x > 41 ||
        z < -14 ||
        z > 94 ||
        (scores.get(k) ?? Infinity) <= g ||
        !clearGuidePath(n, { x, z }, obstacles)
      )
        continue;
      scores.set(k, g);
      nodes.push({ x, z, g, h: distance({ x, z }), parent: n });
    }
  }
  const path: GuidePoint[] = [];
  while (best) {
    path.unshift({ x: best.x, z: best.z });
    best = best.parent;
  }
  while (path.length > 1 && clearGuidePath(start, path[1], obstacles))
    path.shift();
  return path;
}
