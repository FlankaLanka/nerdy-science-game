import { missionById, wireKey } from "./missions.ts";
import type { MissionId, Material, Wire } from "./missions.ts";

export type CircuitResult = {
  lamps: Record<string, { on: boolean; power: number; voltage: number }>;
  short: boolean;
  activeWires: string[];
  activeTerminals: string[];
  bridgeActive: boolean;
  count: number;
};

// Simplified physical model: ideal 6 V source and equal 12 ohm resistive lamps.
export const SOURCE_VOLTS = 6;
export const LAMP_OHMS = 12;
export const FULL_POWER = SOURCE_VOLTS ** 2 / LAMP_OHMS;

export function sanitizeWires(id: MissionId, input: unknown): Wire[] {
  if (!Array.isArray(input)) return [];
  const mission = missionById(id),
    ids = new Set(mission.terminals.map((t) => t.id));
  const seen = new Set(mission.fixed.map(wireKey));
  const wires: Wire[] = [];
  for (const candidate of input.slice(0, 20)) {
    if (!Array.isArray(candidate) || candidate.length !== 2) continue;
    const [a, b] = candidate;
    if (
      typeof a !== "string" ||
      typeof b !== "string" ||
      a === b ||
      !ids.has(a) ||
      !ids.has(b)
    )
      continue;
    const w: Wire = [a, b],
      key = wireKey(w);
    if (!seen.has(key) && wires.length < 10) {
      wires.push(w);
      seen.add(key);
    }
  }
  return wires;
}

export function solveCircuit(
  id: MissionId,
  input: Wire[],
  material: Material = "copper",
  removed: string | null = null,
): CircuitResult {
  const mission = missionById(id);
  const wires = [...mission.fixed, ...sanitizeWires(id, input)];
  const parent = new Map(mission.terminals.map((t) => [t.id, t.id]));
  const root = (n: string): string => {
    const p = parent.get(n)!;
    if (p !== n) parent.set(n, root(p));
    return parent.get(n)!;
  };
  const join = (a: string, b: string) => parent.set(root(a), root(b));
  wires.forEach(([a, b]) => join(a, b));
  if (id === "workshop" && material === "copper") join("m1", "m2");
  const positive = root("p"),
    negative = root("n");
  const result: CircuitResult = {
    lamps: Object.fromEntries(
      mission.lamps.map((l) => [l.id, { on: false, power: 0, voltage: 0 }]),
    ),
    short: positive === negative,
    activeWires: [],
    activeTerminals: [],
    bridgeActive: false,
    count: 0,
  };
  if (result.short) return result;
  const lamps = mission.lamps.filter((l) => l.id !== removed);
  const edges = lamps.map((l) => ({
    a: root(l.left),
    b: root(l.right),
    id: l.id,
  }));
  const reachable = new Set([positive, negative]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const e of edges) {
      if (reachable.has(e.a) && !reachable.has(e.b)) {
        reachable.add(e.b);
        changed = true;
      }
      if (reachable.has(e.b) && !reachable.has(e.a)) {
        reachable.add(e.a);
        changed = true;
      }
    }
  }
  const unknowns = [...reachable].filter(
    (n) => n !== positive && n !== negative,
  );
  const index = new Map(unknowns.map((n, i) => [n, i]));
  const matrix = unknowns.map(
    () => Array(unknowns.length + 1).fill(0) as number[],
  );
  for (const e of edges) {
    if (e.a === e.b) continue;
    for (const [a, b] of [
      [e.a, e.b],
      [e.b, e.a],
    ]) {
      const i = index.get(a);
      if (i === undefined) continue;
      matrix[i][i] += 1 / LAMP_OHMS;
      const j = index.get(b);
      if (j !== undefined) matrix[i][j] -= 1 / LAMP_OHMS;
      else if (b === positive)
        matrix[i][unknowns.length] += SOURCE_VOLTS / LAMP_OHMS;
    }
  }
  // Gaussian elimination with partial pivoting. Floating components were excluded.
  for (let col = 0; col < unknowns.length; col++) {
    let pivot = col;
    for (let row = col + 1; row < unknowns.length; row++)
      if (Math.abs(matrix[row][col]) > Math.abs(matrix[pivot][col]))
        pivot = row;
    [matrix[col], matrix[pivot]] = [matrix[pivot], matrix[col]];
    const divisor = matrix[col][col];
    if (Math.abs(divisor) < 1e-12) continue;
    for (let k = col; k <= unknowns.length; k++) matrix[col][k] /= divisor;
    for (let row = 0; row < unknowns.length; row++) {
      if (row === col) continue;
      const factor = matrix[row][col];
      for (let k = col; k <= unknowns.length; k++)
        matrix[row][k] -= factor * matrix[col][k];
    }
  }
  const volts = new Map<string, number>([
    [positive, SOURCE_VOLTS],
    [negative, 0],
  ]);
  unknowns.forEach((n, i) => volts.set(n, matrix[i][unknowns.length]));
  for (const e of edges) {
    const voltage = Math.abs((volts.get(e.a) ?? 0) - (volts.get(e.b) ?? 0));
    const power = voltage ** 2 / LAMP_OHMS;
    result.lamps[e.id] = { on: power > 1e-6, power, voltage };
  }
  result.count = Object.values(result.lamps).filter((l) => l.on).length;

  // Highlight only wires on a complete source-to-source path through a powered lamp.
  const graph = new Map<
    string,
    { to: string; key: string; lamp?: boolean }[]
  >();
  const add = (a: string, b: string, key: string, lamp = false) => {
    for (const [from, to] of [
      [a, b],
      [b, a],
    ])
      graph.set(from, [...(graph.get(from) ?? []), { to, key, lamp }]);
  };
  wires.forEach((w) => add(w[0], w[1], wireKey(w)));
  if (id === "workshop" && material === "copper") add("m1", "m2", "bridge");
  lamps
    .filter((l) => result.lamps[l.id].on)
    .forEach((l) => add(l.left, l.right, `lamp-${l.id}`, true));
  const active = new Set<string>(),
    terminals = new Set<string>();
  function walk(
    node: string,
    visited: string[],
    path: string[],
    throughLamp: boolean,
  ) {
    if (node === "n") {
      if (throughLamp) {
        path.forEach((p) => active.add(p));
        visited.forEach((t) => terminals.add(t));
      }
      return;
    }
    for (const edge of graph.get(node) ?? []) {
      if (!visited.includes(edge.to))
        walk(
          edge.to,
          [...visited, edge.to],
          [...path, edge.key],
          throughLamp || !!edge.lamp,
        );
    }
  }
  walk("p", ["p"], [], false);
  result.activeWires = [...active].filter((k) => k.includes(":"));
  result.bridgeActive = active.has("bridge");
  result.activeTerminals = [...terminals];
  return result;
}

export function resultLabel(id: MissionId, result: CircuitResult): string {
  if (result.short) return "The fuse opened. A wire bypasses the lamps.";
  if (id === "workshop")
    return result.count ? "The lamp is glowing." : "The lamp is still dark.";
  if (result.count === 2) return "Both lamps are glowing.";
  if (result.count === 0) return "Both lamps are dark.";
  return `Only lamp ${result.lamps.a?.on ? "A" : "B"} is glowing.`;
}

export function outcomeId(id: MissionId, result: CircuitResult): string {
  return id === "workshop"
    ? result.count
      ? "on"
      : "off"
    : result.count === 2
      ? "both"
      : result.count === 1
        ? "one"
        : "none";
}
