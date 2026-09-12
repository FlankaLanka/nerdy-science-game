import { CatmullRomCurve3, Vector3 } from "three";
import { ISLAND_PATHS } from "./islandLayout.ts";

export const TRAILS = ISLAND_PATHS.map((points) =>
  new CatmullRomCurve3(points.map(([x, z]) => new Vector3(x, 0, z))).getPoints(
    100,
  ),
);
const cells = new Map<string, [Vector3, Vector3][]>();
for (const trail of TRAILS)
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1],
      b = trail[i];
    for (
      let x = Math.floor((Math.min(a.x, b.x) - 2) / 4);
      x <= Math.floor((Math.max(a.x, b.x) + 2) / 4);
      x++
    )
      for (
        let z = Math.floor((Math.min(a.z, b.z) - 2) / 4);
        z <= Math.floor((Math.max(a.z, b.z) + 2) / 4);
        z++
      ) {
        const key = `${x}:${z}`,
          value = cells.get(key) ?? [];
        value.push([a, b]);
        cells.set(key, value);
      }
  }
/** Shared by ground paint and vegetation exclusion. No overlapping path planes. */
export function distanceToTrail(x: number, z: number) {
  let squared = Infinity;
  for (const [a, b] of cells.get(`${Math.floor(x / 4)}:${Math.floor(z / 4)}`) ??
    []) {
    const dx = b.x - a.x,
      dz = b.z - a.z;
    const t = Math.max(
      0,
      Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)),
    );
    squared = Math.min(
      squared,
      (x - a.x - t * dx) ** 2 + (z - a.z - t * dz) ** 2,
    );
  }
  return Math.sqrt(squared);
}
