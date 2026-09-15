/** The public station begins beyond the completed circuit wing. */
export const STATION_DECK = [
  { x: 10, z: 37, width: 4, depth: 4, height: 4.2, name: "Station access" },
  { x: 10, z: 60, width: 36, depth: 42, height: 11.2, name: "Station commons" },
  { x: -14, z: 61, width: 12, depth: 24, height: 6.4, name: "Earth gallery" },
  { x: 34, z: 60, width: 12, depth: 30, height: 6.4, name: "Research concourse" },
  { x: 10, z: 87, width: 24, depth: 12, height: 7, name: "Docking gallery" },
].map((room) => ({ ...room, station: true, system: "branch" as const, color: "#bdcccb" }));

// Placeholder level counts; these bays have no playable lessons yet.
export const FUTURE_LABS = [
  { name: "Kinematics", code: "K", levels: 8, x: 40, z: 50 },
  { name: "Electromagnetism", code: "E", levels: 10, x: 40, z: 60 },
  { name: "Waves & optics", code: "W", levels: 8, x: 40, z: 70 },
];
export const FUTURE_LAB_STATUS = "Coming soon";

export const STATION_FURNITURE = [
  { kind: "garden", x: 2, z: 60, width: 3, depth: 7 },
  { kind: "garden", x: 18, z: 60, width: 3, depth: 7 },
  { kind: "seat", x: -13, z: 54, width: 1.1, depth: 4 },
  { kind: "seat", x: -13, z: 68, width: 1.1, depth: 4 },
  { kind: "galley", x: 23, z: 44, width: 6, depth: 2.2 },
  { kind: "cargo", x: 19, z: 87, width: 3.2, depth: 3.2 },
] as const;

export const inMainStation = (x: number, z: number) => STATION_DECK.some(
  (r) => Math.abs(x - r.x) <= r.width / 2 && Math.abs(z - r.z) <= r.depth / 2,
);
