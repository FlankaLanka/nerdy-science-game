/** Shared survey coordinates for the world model and the keeper's chart. North is −Z. */
export const WATER_LEVEL = -0.68;
export const LIGHTHOUSE = { x: 11, z: -21, radius: 2.65 } as const;
export const HARBOR = {
  approach: 20.7,
  start: 22,
  end: 34,
  z: 14.5,
  width: 4.2,
  floor: 0.95,
} as const;
export const HARBOR_SIGN = {
  x: 18.4,
  z: 13,
  width: 1.8,
  height: 0.48,
  depth: 0.12,
  centerHeight: 1.6,
} as const;
export const ISLAND_PATHS = [
  [
    [-3, 24],
    [-3, 14],
    [-3, 4],
  ],
  [
    [-3, 8],
    [5, 10],
    [13, 12],
    [23, 14],
  ],
  [
    [1, 8],
    [6, 2],
    [10, -6],
    [11, -15],
  ],
] as const;
export const TREE_SPOTS = [
  [-15, 8],
  [-17, 1],
  [-14, -9],
  [-19, -12],
  [-10, -13],
  [-4, -12],
  [-19, 15],
  [-12, 20],
  [6, 18],
  [11, 18],
  [18, 3],
  [21, -4],
  [23, -12],
  [1, -20],
  [-6, -23],
  [18, -27],
  [6, -30],
] as const;
