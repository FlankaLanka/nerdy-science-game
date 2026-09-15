import { STATION_DECK } from "./stationLayout.ts";
import { CHAMBERS } from "../chambers.ts";
import type { ChamberId } from "../chambers.ts";
type Deck = {
  station?: boolean;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  name: string;
  system: ChamberId;
  color: string;
};
export const DECK: Deck[] = [
  ...CHAMBERS.map((c, i) => ({
    x: c.x,
    z: c.z,
    width: 12,
    depth: 10,
    height: [4.4, 3.8, 4.4, 4.6, 4.8, 4.4][i],
    name: c.name,
    system: c.id,
    color: c.color,
  })),
  {
    x: -10,
    z: 13,
    width: 4,
    depth: 4,
    height: 3.4,
    name: "Access",
    system: "wake",
    color: "#b3c9ba",
  },
  {
    x: -10,
    z: -1,
    width: 4,
    depth: 4,
    height: 3.4,
    name: "Access",
    system: "contact",
    color: "#d8ba85",
  },
  {
    x: 0,
    z: -8,
    width: 8,
    depth: 4,
    height: 3.4,
    name: "Transfer",
    system: "build",
    color: "#a4c4cc",
  },
  {
    x: 10,
    z: -1,
    width: 4,
    depth: 4,
    height: 3.4,
    name: "Access",
    system: "resist",
    color: "#dbc194",
  },
  {
    x: 10,
    z: 13,
    width: 4,
    depth: 4,
    height: 3.4,
    name: "Access",
    system: "share",
    color: "#b6d3b4",
  },
  {
    x: 10,
    z: 26,
    width: 4,
    depth: 2,
    height: 3.4,
    name: "Observation access",
    system: "branch",
    color: "#aacbdc",
  },
  {
    x: 10,
    z: 31,
    width: 12,
    depth: 8,
    height: 5.2,
    name: "Arrival gallery",
    system: "branch",
    color: "#acc8d6",
  },
  ...STATION_DECK,
];
export const PORTALS = [
  { x: -10, z: 13, rotation: 0, system: "wake", name: "02" },
  { x: -10, z: -1, rotation: 0, system: "contact", name: "03" },
  { x: 0, z: -8, rotation: -Math.PI / 2, system: "build", name: "04" },
  { x: 10, z: -1, rotation: Math.PI, system: "resist", name: "05" },
  { x: 10, z: 13, rotation: Math.PI, system: "share", name: "06" },
  { x: 10, z: 26, rotation: Math.PI, system: "branch", name: "HUB" },
] satisfies {
  x: number;
  z: number;
  rotation: number;
  system: ChamberId;
  name: string;
}[];
export const WINDOW_BANKS = [
  ...CHAMBERS.map((c) => ({
    id: c.id,
    x: c.x + (c.x < 0 ? -6 : 6),
    z: c.z,
    rotation: c.x < 0 ? Math.PI / 2 : -Math.PI / 2,
    width: 6,
    sill: 1.05,
    head: 3.3,
  })),
  {
    id: "assembly-forward",
    x: -10,
    z: -13,
    rotation: 0,
    width: 8,
    sill: 1.05,
    head: 3.3,
  },
  {
    id: "balance-forward",
    x: 10,
    z: -13,
    rotation: 0,
    width: 8,
    sill: 1.05,
    head: 3.3,
  },
  {
    id: "observation-port",
    x: 4,
    z: 31,
    rotation: Math.PI / 2,
    width: 8,
    sill: 0.95,
    head: 3.7,
  },
  {
    id: "observation-starboard",
    x: 16,
    z: 31,
    rotation: -Math.PI / 2,
    width: 8,
    sill: 0.95,
    head: 3.7,
  },
  {
    id: "observation-aft",
    x: 10,
    z: 35,
    rotation: Math.PI,
    width: 8,
    sill: 0.95,
    head: 3.7,
  },
];
export function windowAt(x: number, z: number, rotation: number) {
  return WINDOW_BANKS.find(
    (w) =>
      Math.abs(w.rotation - rotation) < 0.001 &&
      Math.abs(
        (x - w.x) * Math.sin(rotation) + (z - w.z) * Math.cos(rotation),
      ) < 0.001 &&
      Math.abs(
        (x - w.x) * Math.cos(rotation) - (z - w.z) * Math.sin(rotation),
      ) <
        w.width / 2 - 0.001,
  );
}
export const FURNITURE = CHAMBERS.map((c) => ({
  x: c.bench.x,
  z: c.bench.z,
  width: 3,
  depth: 1.7,
}));
export const SHIP_SITES = Object.fromEntries(
  CHAMBERS.map((c) => [c.id, { ...c.bench, name: c.name }]),
) as Record<ChamberId, { x: number; z: number; name: string }>;
export const insideDeck = (x: number, z: number) =>
  DECK.some(
    (r) => Math.abs(x - r.x) <= r.width / 2 && Math.abs(z - r.z) <= r.depth / 2,
  );
export function roomAt(x: number, z: number) {
  return CHAMBERS.findIndex(
    (c) => Math.abs(x - c.x) <= 6 && Math.abs(z - c.z) <= 5,
  );
}
export const deckSection = (z: number, x = 0) =>
  DECK.find(
    (r) => Math.abs(x - r.x) <= r.width / 2 && Math.abs(z - r.z) <= r.depth / 2,
  )?.name ?? "Access";
export const deckPoint = (x: number, z: number): [number, number] => [
  250 + x * 10,
  28 + (z + 13) * 10,
];

/** A saved position beyond an unpowered gate cannot skip its chamber. */
export function progressionStageAt(x: number, z: number) {
  const room = roomAt(x, z);
  if (room >= 0) return room;
  const section = DECK.find(
    (r) => Math.abs(x - r.x) <= r.width / 2 && Math.abs(z - r.z) <= r.depth / 2,
  );
  if (section?.station || section?.name === "Arrival gallery") return CHAMBERS.length;
  const portal = PORTALS.find((p) => p.system === section?.system);
  if (!portal) return 0;
  const normal =
    (x - portal.x) * Math.sin(portal.rotation) +
    (z - portal.z) * Math.cos(portal.rotation);
  return (
    CHAMBERS.findIndex((c) => c.id === portal.system) + (normal < 0 ? 1 : 0)
  );
}
