import { terrainHeight } from "./scene/navigation.ts";
import { WATER_LEVEL } from "./scene/islandLayout.ts";
import { TRAILS } from "./scene/trails.ts";

export const CHART = {
  width: 700,
  height: 500,
  scale: 5.55,
  centerX: 350,
  centerY: 250,
};
export function chartPoint(x: number, z: number): [number, number] {
  return [
    CHART.centerX + x * CHART.scale,
    CHART.centerY + (z + 2) * CHART.scale,
  ];
}
export function chartPath(
  points: readonly (readonly [number, number])[],
  close = false,
) {
  return (
    points
      .map(
        ([x, z], i) =>
          `${i ? "L" : "M"}${chartPoint(x, z)
            .map((n) => n.toFixed(2))
            .join(",")}`,
      )
      .join(" ") + (close ? " Z" : "")
  );
}
/** Intersect the actual height field with the water plane; the shoreline is not artwork. */
export function coastline(level = WATER_LEVEL) {
  return Array.from({ length: 240 }, (_, i): [number, number] => {
    const angle = (i / 240) * Math.PI * 2;
    let lo = 0.65,
      hi = 1.12;
    for (let n = 0; n < 22; n++) {
      const r = (lo + hi) / 2;
      if (
        terrainHeight(Math.sin(angle) * 34 * r, Math.cos(angle) * 38 * r - 2) >
        level
      )
        lo = r;
      else hi = r;
    }
    return [
      (Math.sin(angle) * 34 * (lo + hi)) / 2,
      (Math.cos(angle) * 38 * (lo + hi)) / 2 - 2,
    ];
  });
}
export const COASTLINE = coastline();
export const SHORE_PATH = chartPath(COASTLINE, true);
export const TIDE_PATH = chartPath(coastline(-1.5), true);
export const TRAIL_PATHS = TRAILS.map((points) =>
  chartPath(points.map((p) => [p.x, p.z])),
);

/** Survey contours from the same height field, using interpolated marching squares. */
export function contours(level: number) {
  const segments: string[] = [];
  const step = 0.9;
  for (let x = -34; x < 34; x += step)
    for (let z = -40; z < 36; z += step) {
      const corners: [number, number][] = [
        [x, z],
        [x + step, z],
        [x + step, z + step],
        [x, z + step],
      ];
      const heights = corners.map(([px, pz]) => terrainHeight(px, pz));
      const crossings: [number, number][] = [];
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        if (heights[i] >= level === heights[j] >= level) continue;
        const t = (level - heights[i]) / (heights[j] - heights[i]);
        crossings.push([
          corners[i][0] + (corners[j][0] - corners[i][0]) * t,
          corners[i][1] + (corners[j][1] - corners[i][1]) * t,
        ]);
      }
      for (let i = 0; i + 1 < crossings.length; i += 2)
        segments.push(chartPath([crossings[i], crossings[i + 1]]));
    }
  return segments.join(" ");
}
export const CONTOURS = [0, 1, 2, 3, 4, 5].map(contours);
