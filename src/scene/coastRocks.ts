import { rng } from "./art.ts";
import { terrainHeight } from "./navigation.ts";

/** The same boulders are placed in the world and surveyed on the chart. */
export const COAST_ROCKS = Array.from({ length: 190 }, (_, i) => {
  const a = rng(i + 11) * Math.PI * 2,
    r = 0.75 + rng(i + 700) * 0.29;
  const x = Math.sin(a) * 33 * r,
    z = Math.cos(a) * 37 * r - 2;
  return {
    i,
    x,
    z,
    r,
    y: terrainHeight(x, z) - 0.2,
    scale: 0.5 + rng(i + 71) * 2.4,
  };
}).filter(
  ({ x, z }) =>
    !(x > 18 && z > 10 && z < 18) &&
    // Keep the boat's mooring and swing clear of shoreline boulders.
    !(x > 24 && z > 17.5 && z < 23.5),
);
