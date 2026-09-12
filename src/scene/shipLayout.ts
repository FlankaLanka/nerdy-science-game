import { ACTIVITIES } from "../activities.ts";
import type { ActivityId } from "../activities.ts";
type Compartment = {
  id: string;
  name: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
  system: ActivityId;
};
/** Authored footprints shared by architecture, collision, map and routing. Two wing loops reconnect to the hub and cross passage. */
export const DECK: Compartment[] = [
  {
    id: "engineering",
    name: "Engineering",
    x: 0,
    z: 20,
    width: 12,
    depth: 12,
    height: 4.4,
    color: "#bdab87",
    system: "workshop",
  },
  {
    id: "entry",
    name: "Hub access",
    x: 0,
    z: 13,
    width: 4,
    depth: 2,
    height: 3.2,
    color: "#a9c7b4",
    system: "workshop",
  },
  {
    id: "hub",
    name: "Station hub",
    x: 0,
    z: 5,
    width: 14,
    depth: 14,
    height: 5.7,
    color: "#a9c7b4",
    system: "junction",
  },
  {
    id: "west-link",
    name: "Materials access",
    x: -8,
    z: 10,
    width: 2,
    depth: 4,
    height: 3.2,
    color: "#ceb084",
    system: "workshop",
  },
  {
    id: "east-link",
    name: "Distribution access",
    x: 8,
    z: 10,
    width: 2,
    depth: 4,
    height: 3.2,
    color: "#d6b278",
    system: "workshop",
  },
  {
    id: "materials",
    name: "Materials workshop",
    x: -14,
    z: 12,
    width: 10,
    depth: 10,
    height: 3.8,
    color: "#ceb084",
    system: "ohm",
  },
  {
    id: "distribution",
    name: "Distribution",
    x: 14,
    z: 12,
    width: 10,
    depth: 10,
    height: 4.2,
    color: "#d6b278",
    system: "harbor",
  },
  {
    id: "west-gallery",
    name: "West service gallery",
    x: -14,
    z: 4,
    width: 4,
    depth: 6,
    height: 3.2,
    color: "#b6c596",
    system: "power",
  },
  {
    id: "east-gallery",
    name: "East service gallery",
    x: 14,
    z: 4,
    width: 4,
    depth: 6,
    height: 3.2,
    color: "#a2c3d1",
    system: "storage",
  },
  {
    id: "life-support",
    name: "Life support",
    x: -14,
    z: -5,
    width: 10,
    depth: 12,
    height: 4.4,
    color: "#b6c596",
    system: "power",
  },
  {
    id: "reserve",
    name: "Reserve vault",
    x: 14,
    z: -5,
    width: 10,
    depth: 12,
    height: 4.4,
    color: "#a2c3d1",
    system: "storage",
  },
  {
    id: "west-cross",
    name: "West cross passage",
    x: -5.5,
    z: -6,
    width: 7,
    depth: 3,
    height: 3.2,
    color: "#a9c7b4",
    system: "workshop",
  },
  {
    id: "east-cross",
    name: "East cross passage",
    x: 5.5,
    z: -6,
    width: 7,
    depth: 3,
    height: 3.2,
    color: "#a9c7b4",
    system: "workshop",
  },
  {
    id: "spine",
    name: "Airlock control",
    x: 0,
    z: -6.5,
    width: 4,
    depth: 9,
    height: 3.6,
    color: "#a2c3d1",
    system: "timing",
  },
  {
    id: "command",
    name: "Command",
    x: 0,
    z: -17,
    width: 16,
    depth: 12,
    height: 5.2,
    color: "#bbcbd2",
    system: "beacon",
  },
];
export const SHIP_SITES = Object.fromEntries(
  ACTIVITIES.map((a) => [
    a.id,
    { x: a.x, z: a.z, name: a.name, color: a.color, system: a.system },
  ]),
) as Record<
  ActivityId,
  { x: number; z: number; name: string; color: string; system: string }
>;
export const DOORWAYS = [13] as const;
export const PORTALS = [
  { x: 0, z: 13, rotation: 0, name: "HUB" },
  { x: -8, z: 10, rotation: Math.PI / 2, name: "MATERIALS" },
  { x: 8, z: 10, rotation: -Math.PI / 2, name: "DISTRIBUTION" },
  { x: 0, z: -11, rotation: 0, name: "COMMAND" },
  { x: -14, z: 2.8, rotation: 0, name: "LIFE SUPPORT" },
  { x: 14, z: 2.8, rotation: 0, name: "RESERVE" },
] as const;
/** Actual hull apertures. Ranges align with the two-metre structural bays. */
export const WINDOW_BANKS = [
  {
    id: "engineering-port",
    x: -6,
    z: 21,
    rotation: Math.PI / 2,
    width: 6,
    sill: 1.05,
    head: 3.3,
  },
  {
    id: "engineering-starboard",
    x: 6,
    z: 21,
    rotation: -Math.PI / 2,
    width: 6,
    sill: 1.05,
    head: 3.3,
  },
  {
    id: "materials",
    x: -19,
    z: 12,
    rotation: Math.PI / 2,
    width: 6,
    sill: 1.65,
    head: 3.25,
  },
  {
    id: "distribution",
    x: 19,
    z: 12,
    rotation: -Math.PI / 2,
    width: 6,
    sill: 1.05,
    head: 3.3,
  },
  {
    id: "life-support",
    x: -14,
    z: -11,
    rotation: 0,
    width: 6,
    sill: 1.05,
    head: 3.3,
  },
  {
    id: "reserve",
    x: 14,
    z: -11,
    rotation: 0,
    width: 6,
    sill: 1.05,
    head: 3.3,
  },
  {
    id: "command-forward",
    x: 0,
    z: -23,
    rotation: 0,
    width: 12,
    sill: 0.95,
    head: 3.7,
  },
  {
    id: "command-port",
    x: -8,
    z: -17,
    rotation: Math.PI / 2,
    width: 8,
    sill: 1.05,
    head: 3.6,
  },
  {
    id: "command-starboard",
    x: 8,
    z: -17,
    rotation: -Math.PI / 2,
    width: 8,
    sill: 1.05,
    head: 3.6,
  },
] as const;
export function windowAt(x: number, z: number, rotation: number) {
  return WINDOW_BANKS.find((w) => {
    if (Math.abs(w.rotation - rotation) > 0.001) return false;
    const dx = x - w.x,
      dz = z - w.z;
    return (
      Math.abs(dx * Math.sin(rotation) + dz * Math.cos(rotation)) < 0.001 &&
      Math.abs(dx * Math.cos(rotation) - dz * Math.sin(rotation)) <
        w.width / 2 - 0.001
    );
  });
}
export const FURNITURE = [
  { x: -17.3, z: 11, width: 1.5, depth: 5 },
  { x: 14, z: 16.3, width: 6.5, depth: 1 },
  { x: -3.2, z: 25.4, width: 4, depth: 0.8 },
  { x: -1.5, z: 4.5, radius: 1.7 },
  { x: 2.8, z: 25, width: 4.4, depth: 1.3 },
  { x: -17.7, z: -5, width: 1, depth: 7 },
  { x: 17.6, z: -5, width: 1.4, depth: 7 },
  { x: -5.9, z: -18, width: 1.6, depth: 3 },
  { x: 5.9, z: -18, width: 1.6, depth: 3 },
] as const;
export function insideDeck(x: number, z: number) {
  return DECK.some(
    (r) => Math.abs(x - r.x) <= r.width / 2 && Math.abs(z - r.z) <= r.depth / 2,
  );
}
export function deckSection(z: number, x = 0) {
  return (
    DECK.find(
      (r) =>
        Math.abs(x - r.x) <= r.width / 2 && Math.abs(z - r.z) <= r.depth / 2,
    )?.name ?? "Station access"
  );
}
export function deckPoint(x: number, z: number): [number, number] {
  return [350 + x * 8, 24 + (z + 23) * 8];
}
