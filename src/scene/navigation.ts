import type { MissionId } from "../missions.ts";
import { insideDeck, SHIP_SITES } from "./shipLayout.ts";

export type Player = { x: number; z: number; yaw: number; pitch: number };
export type Obstacle =
  | { x: number; z: number; radius: number }
  | { x: number; z: number; width: number; depth: number };
export const PLAYER_KEY = "signal.dead-orbit.player.v1";
export const SPAWN: Player = { x: -4, z: 20, yaw: 0, pitch: 0.015 };
export const SITES = SHIP_SITES;
export function groundHeight(_x: number, _z: number) {
  return 0;
}

export function canWalk(x: number, z: number, obstacles: Obstacle[]) {
  // Keep the entire player capsule inside the connected deck, including room corners.
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    if (!insideDeck(x + Math.cos(a) * 0.3, z + Math.sin(a) * 0.3)) return false;
  }
  return !obstacles.some((o) =>
    "radius" in o
      ? Math.hypot(x - o.x, z - o.z) < 0.3 + o.radius
      : Math.abs(x - o.x) < o.width / 2 + 0.3 &&
        Math.abs(z - o.z) < o.depth / 2 + 0.3,
  );
}

/** Substeps prevent tunnelling; independent axes let the player slide along walls. */
export function movePlayer(
  player: Player,
  right: number,
  forward: number,
  dt: number,
  sprint: boolean,
  obstacles: Obstacle[],
): Player {
  const length = Math.hypot(right, forward);
  if (!length) return player;
  const speed =
    ((sprint ? 6 : 3.5) * Math.min(0.1, Math.max(0, dt))) / Math.max(1, length);
  const dx =
    (Math.cos(player.yaw) * right - Math.sin(player.yaw) * forward) * speed;
  const dz =
    (-Math.sin(player.yaw) * right - Math.cos(player.yaw) * forward) * speed;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.12));
  let { x, z } = player;
  for (let i = 0; i < steps; i++) {
    if (canWalk(x + dx / steps, z, obstacles)) x += dx / steps;
    if (canWalk(x, z + dz / steps, obstacles)) z += dz / steps;
  }
  return { ...player, x, z };
}

export function focusedSite(
  player: Player,
  obstacles: Obstacle[],
): MissionId | null {
  for (const [id, site] of Object.entries(SITES)) {
    const dx = site.x - player.x,
      dz = site.z - player.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 2.9 || Math.abs(player.pitch) > 0.85) continue;
    if (
      distance > 0.2 &&
      (-Math.sin(player.yaw) * dx - Math.cos(player.yaw) * dz) / distance < 0.65
    )
      continue;
    // Ignore the cabinet's own collider, but trace the entire approach through other obstacles.
    const occluders = obstacles.filter((o) => o.x !== site.x || o.z !== site.z);
    let blocked = false;
    for (let t = 0.1; t < distance; t += 0.15) {
      if (
        !canWalk(
          player.x + (dx * t) / distance,
          player.z + (dz * t) / distance,
          occluders,
        )
      ) {
        blocked = true;
        break;
      }
    }
    if (!blocked) return id as MissionId;
  }
  return null;
}

export function restorePlayer(
  raw: string | null,
  obstacles: Obstacle[],
): Player {
  try {
    const p = JSON.parse(raw ?? "null");
    if (
      p &&
      [p.x, p.z, p.yaw, p.pitch].every(Number.isFinite) &&
      canWalk(p.x, p.z, obstacles)
    )
      return {
        x: p.x,
        z: p.z,
        yaw: p.yaw % (Math.PI * 2),
        pitch: Math.max(-1.25, Math.min(1.25, p.pitch)),
      };
  } catch {
    /* A damaged or unavailable save starts safely on the engineering deck. */
  }
  return { ...SPAWN };
}
