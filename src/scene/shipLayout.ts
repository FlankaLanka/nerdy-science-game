import type { MissionId } from "../missions.ts";

/** One deck plan drives the hull, walking boundaries, and navigation display. */
export const DECK = [
  {
    id: "engineering",
    name: "Engineering",
    x: 0,
    z: 15.5,
    width: 16,
    depth: 17,
    height: 5.4,
    color: "#60eadb",
  },
  {
    id: "aft-passage",
    name: "Aft passage",
    x: 0,
    z: 5.5,
    width: 6,
    depth: 3,
    height: 4,
    color: "#60eadb",
  },
  {
    id: "relay",
    name: "Power relay",
    x: 0,
    z: -3,
    width: 16,
    depth: 14,
    height: 5.4,
    color: "#ffb568",
  },
  {
    id: "forward-passage",
    name: "Forward passage",
    x: 0,
    z: -12,
    width: 6,
    depth: 4,
    height: 4,
    color: "#a9adff",
  },
  {
    id: "command",
    name: "Command deck",
    x: 0,
    z: -21.5,
    width: 20,
    depth: 15,
    height: 6,
    color: "#a9adff",
  },
] as const;

export const SHIP_SITES: Record<
  MissionId,
  { x: number; z: number; name: string; color: string; system: string }
> = {
  workshop: {
    x: -4,
    z: 11,
    name: "Engineering",
    color: "#60eadb",
    system: "Auxiliary power",
  },
  harbor: {
    x: 4,
    z: -3,
    name: "Power relay",
    color: "#ffb568",
    system: "Distribution bus",
  },
  beacon: {
    x: 0,
    z: -23,
    name: "Command deck",
    color: "#a9adff",
    system: "Distress transmitter",
  },
};

export const DOORWAYS = [5.5, -12] as const;
export const FURNITURE = [
  { x: 4.6, z: 13, radius: 1.65 },
  { x: -4.7, z: -3, radius: 1.7 },
  { x: -6.9, z: 20.5, width: 1.25, depth: 3.4 },
  { x: -6.9, z: 15.5, width: 1.25, depth: 3.4 },
  { x: 6.4, z: 21.5, width: 2, depth: 2 },
  { x: -7, z: -20, width: 2.6, depth: 1.3 },
  { x: 7, z: -20, width: 2.6, depth: 1.3 },
] as const;

export function insideDeck(x: number, z: number) {
  return DECK.some(
    (room) =>
      Math.abs(x - room.x) <= room.width / 2 &&
      Math.abs(z - room.z) <= room.depth / 2,
  );
}

export function deckSection(z: number) {
  return z > 5.5 ? "Engineering" : z > -12 ? "Power relay" : "Command deck";
}

/** Forward points up on the ship's deck display; meters are scaled uniformly. */
export function deckPoint(x: number, z: number): [number, number] {
  return [350 + x * 7.2, 36 + (z + 29) * 7.2];
}
