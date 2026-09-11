import type { MissionId } from "../missions.ts";

export type Player = { x: number; z: number; yaw: number; pitch: number };
export type Obstacle =
  | { x: number; z: number; radius: number }
  | { x: number; z: number; width: number; depth: number };
export const PLAYER_KEY = "signal.lighthouse.player.v1";
export const SPAWN: Player = { x: -3, z: 15.5, yaw: 0, pitch: 0.015 };
export const SITES: Record<
  MissionId,
  { x: number; z: number; name: string; task: string }
> = {
  workshop: {
    x: -3,
    z: 3.2,
    name: "Keeper’s workshop",
    task: "Restore the workshop power",
  },
  harbor: {
    x: 21,
    z: 12,
    name: "Harbor relay",
    task: "Bring the harbor lights online",
  },
  beacon: {
    x: 11,
    z: -16.3,
    name: "Lighthouse control",
    task: "Give the lighthouse a backup circuit",
  },
};

export function terrainHeight(x: number, z: number) {
  const radius = Math.hypot(x / 34, (z + 2) / 38);
  const hill = 4.4 * Math.exp(-((x - 11) ** 2 / 190 + (z + 21) ** 2 / 220));
  const land = 1.15 + hill + Math.sin(x * 0.14) * Math.cos(z * 0.16) * 0.28;
  const coast = Math.max(0, Math.min(1, (radius - 0.76) / 0.28));
  return land * (1 - coast * coast) - 2.6 * coast * coast;
}

export function groundHeight(x: number, z: number) {
  if (x >= 22 && x <= 34 && z >= 12.4 && z <= 16.6) return 0.95;
  return terrainHeight(x, z);
}

export function canWalk(x: number, z: number, obstacles: Obstacle[]) {
  const onPier = x >= 22 && x <= 33.5 && z >= 12.85 && z <= 16.15;
  if (
    !onPier &&
    (Math.hypot(x / 34, (z + 2) / 38) > 0.87 || terrainHeight(x, z) < 0.15)
  )
    return false;
  const radius = 0.3;
  return !obstacles.some((o) =>
    "radius" in o
      ? Math.hypot(x - o.x, z - o.z) < radius + o.radius
      : Math.abs(x - o.x) < o.width / 2 + radius &&
        Math.abs(z - o.z) < o.depth / 2 + radius,
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
    /* A damaged or unavailable save starts safely on the path. */
  }
  return { ...SPAWN };
}
