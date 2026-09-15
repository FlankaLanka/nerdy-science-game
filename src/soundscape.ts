export type SoundMix = { gain: number; pan: number };
export type EnvironmentSound = "door" | "door-close" | "power" | "power-down";
export type EnvironmentEvent = { kind: EnvironmentSound; x: number; z: number };

/** Nearby machinery stays clear; distant doors fall out of the mix. */
export function spatialMix(
  source: { x: number; z: number },
  listener: { x: number; z: number; yaw: number },
): SoundMix {
  const dx = source.x - listener.x, dz = source.z - listener.z;
  const distance = Math.hypot(dx, dz);
  const fade = Math.max(0, 1 - Math.max(0, distance - 2) / 14);
  return {
    gain: fade * fade,
    pan: distance < .01 ? 0 : .85 * (dx * Math.cos(listener.yaw) - dz * Math.sin(listener.yaw)) / distance,
  };
}

/** Emit on the start of actual travel, including reversals and instant motion. */
export function doorMotion(before: number, after: number): -1 | 0 | 1 {
  return Math.abs(after - before) < .0001 ? 0 : after > before ? 1 : -1;
}
