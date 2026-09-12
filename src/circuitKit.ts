export type PartKind = "battery" | "bulb" | "resistor" | "switch";
export type Tool = PartKind | "wire";
export type Part = {
  id: string;
  kind: PartKind;
  x: number;
  y: number;
  angle: number;
  value: number;
  rating?: number;
  closed?: boolean;
  fixed?: boolean;
};
export type Cable = { id: string; a: string; b: string };
export type Circuit = { parts: Part[]; wires: Cable[]; serial: number };
export type Reading = { voltage: number; current: number; power: number };
export type CircuitResult = {
  tripped: boolean;
  parts: Record<string, Reading>;
  wires: Record<string, number>;
  sourcePower: number;
};
export const PART_NAMES: Record<Tool, string> = {
  wire: "Wire",
  battery: "Battery",
  bulb: "Bulb",
  resistor: "Resistor",
  switch: "Switch",
};
export const KIT_SIZE = { width: 900, height: 500 };
export const LEAD_RESISTANCE = 0.001;
export const FUSE_CURRENT = 4;
export const cloneCircuit = (c: Circuit): Circuit => structuredClone(c);
export const terminalId = (id: string, end: "a" | "b") => `${id}:${end}`;
export function terminalPoint(part: Part, end: "a" | "b") {
  const length = end === "a" ? -76 : 76;
  return {
    x: part.x + Math.cos(part.angle) * length,
    y: part.y + Math.sin(part.angle) * length,
  };
}
export function endpoints(circuit: Circuit) {
  return Object.fromEntries(
    circuit.parts.flatMap((p) =>
      (["a", "b"] as const).map((end) => [
        terminalId(p.id, end),
        terminalPoint(p, end),
      ]),
    ),
  );
}
export function cablePath(
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const sag = Math.min(42, d * 0.13);
  return `M ${a.x} ${a.y} C ${a.x + (b.x - a.x) / 3} ${a.y + (b.y - a.y) / 3 + sag}, ${a.x + (2 * (b.x - a.x)) / 3} ${a.y + (2 * (b.y - a.y)) / 3 + sag}, ${b.x} ${b.y}`;
}

/** Modified nodal analysis: source voltage constraints and KCL are solved together.
 * Leads and closed contacts have 1 mΩ resistance, avoiding indeterminate ideal-wire currents. */
export function simulate(circuit: Circuit): CircuitResult {
  const result: CircuitResult = {
    tripped: false,
    parts: {},
    wires: {},
    sourcePower: 0,
  };
  const nodes = circuit.parts.flatMap((p) => [
    terminalId(p.id, "a"),
    terminalId(p.id, "b"),
  ]);
  const valid = new Set(nodes);
  type Edge = {
    a: string;
    b: string;
    resistance: number;
    id: string;
    wire: boolean;
  };
  const edges: Edge[] = circuit.wires
    .filter((w) => valid.has(w.a) && valid.has(w.b) && w.a !== w.b)
    .map((w) => ({ ...w, resistance: LEAD_RESISTANCE, wire: true }));
  const sources = circuit.parts.filter((p) => p.kind === "battery");
  for (const p of circuit.parts) {
    result.parts[p.id] = { voltage: 0, current: 0, power: 0 };
    if (p.kind !== "battery" && (p.kind !== "switch" || p.closed))
      edges.push({
        a: terminalId(p.id, "a"),
        b: terminalId(p.id, "b"),
        resistance:
          p.kind === "switch" ? LEAD_RESISTANCE : Math.max(0.01, p.value),
        id: p.id,
        wire: false,
      });
  }
  for (const w of circuit.wires) result.wires[w.id] = 0;
  const adjacency = new Map(nodes.map((n) => [n, new Set<string>()]));
  for (const e of [
    ...edges,
    ...sources.map((p) => ({
      a: terminalId(p.id, "a"),
      b: terminalId(p.id, "b"),
    })),
  ]) {
    adjacency.get(e.a)?.add(e.b);
    adjacency.get(e.b)?.add(e.a);
  }
  const visited = new Set<string>();
  for (const start of nodes) {
    if (visited.has(start)) continue;
    const island: string[] = [],
      queue = [start];
    while (queue.length) {
      const n = queue.pop()!;
      if (visited.has(n)) continue;
      visited.add(n);
      island.push(n);
      for (const neighbor of adjacency.get(n) ?? [])
        if (!visited.has(neighbor)) queue.push(neighbor);
    }
    const members = new Set(island);
    const batteries = sources.filter((p) => members.has(terminalId(p.id, "a")));
    if (!batteries.length) continue;
    const ground = terminalId(batteries[0].id, "b");
    const unknowns = island.filter((n) => n !== ground),
      n = unknowns.length;
    const indexes = new Map(unknowns.map((id, index) => [id, index]));
    const size = n + batteries.length;
    const matrix = Array.from(
      { length: size },
      () => Array(size + 1).fill(0) as number[],
    );
    const localEdges = edges.filter((e) => members.has(e.a));
    for (const e of localEdges) {
      const a = indexes.get(e.a),
        b = indexes.get(e.b),
        g = 1 / e.resistance;
      if (a !== undefined) matrix[a][a] += g;
      if (b !== undefined) matrix[b][b] += g;
      if (a !== undefined && b !== undefined) {
        matrix[a][b] -= g;
        matrix[b][a] -= g;
      }
    }
    batteries.forEach((battery, k) => {
      for (const [end, sign] of [
        ["a", 1],
        ["b", -1],
      ] as const) {
        const i = indexes.get(terminalId(battery.id, end));
        if (i !== undefined) {
          matrix[i][n + k] += sign;
          matrix[n + k][i] += sign;
        }
      }
      matrix[n + k][size] = battery.value;
    });
    const solution = linearSolve(matrix);
    if (!solution) {
      result.tripped = true;
      continue;
    }
    const potential = (id: string) =>
      id === ground ? 0 : solution[indexes.get(id)!];
    for (const e of localEdges) {
      const voltage = potential(e.a) - potential(e.b),
        current = voltage / e.resistance;
      if (e.wire) result.wires[e.id] = current;
      else
        result.parts[e.id] = {
          voltage: Math.abs(voltage),
          current,
          power: voltage * current,
        };
    }
    // Open switches have no current, but can have a potential difference across their contacts.
    for (const part of circuit.parts.filter(
      (p) => p.kind === "switch" && !p.closed,
    )) {
      const a = terminalId(part.id, "a"),
        b = terminalId(part.id, "b");
      if (members.has(a) && members.has(b))
        result.parts[part.id].voltage = Math.abs(potential(a) - potential(b));
    }
    batteries.forEach((battery, k) => {
      const current = solution[n + k];
      result.parts[battery.id] = {
        voltage: battery.value,
        current,
        power: battery.value * current,
      };
      result.sourcePower -= battery.value * current;
      if (Math.abs(current) > FUSE_CURRENT || !Number.isFinite(current))
        result.tripped = true;
    });
  }
  if (result.tripped) {
    result.sourcePower = 0;
    for (const id of Object.keys(result.parts))
      result.parts[id] = { voltage: 0, current: 0, power: 0 };
    for (const id of Object.keys(result.wires)) result.wires[id] = 0;
  }
  return result;
}
function linearSolve(matrix: number[][]): number[] | null {
  const n = matrix.length;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(matrix[row][col]) > Math.abs(matrix[pivot][col]))
        pivot = row;
    if (Math.abs(matrix[pivot][col]) < 1e-9) return null;
    [matrix[pivot], matrix[col]] = [matrix[col], matrix[pivot]];
    const d = matrix[col][col];
    for (let j = col; j <= n; j++) matrix[col][j] /= d;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = matrix[row][col];
      for (let j = col; j <= n; j++) matrix[row][j] -= factor * matrix[col][j];
    }
  }
  const values = matrix.map((row) => row[n]);
  return values.every(Number.isFinite) ? values : null;
}
export function lampState(part: Part, result: CircuitResult) {
  const voltage = result.parts[part.id]?.voltage ?? 0;
  const ratio = voltage / (part.rating ?? 6);
  return {
    ratio,
    lit: ratio >= 0.94 && ratio <= 1.06,
    overloaded: ratio > 1.1,
    brightness: Math.min(1.4, ratio * ratio),
  };
}

export type KitAction =
  | { type: "wire"; a: string; b: string }
  | { type: "add"; kind: PartKind; x: number; y: number }
  | { type: "move"; id: string; x: number; y: number }
  | { type: "rotate"; id: string }
  | { type: "remove"; id: string }
  | { type: "value"; id: string; value: number }
  | { type: "toggle"; id: string };
export type KitRules = {
  tools: Tool[];
  limits: Partial<Record<PartKind, number>>;
  voltage: number;
  resistorValues: number[];
};
export function editCircuit(
  circuit: Circuit,
  action: KitAction,
  rules: KitRules,
): Circuit {
  const next = cloneCircuit(circuit);
  const part =
    "id" in action ? next.parts.find((p) => p.id === action.id) : undefined;
  const clamp = (v: number, maximum: number) =>
    Math.max(105, Math.min(maximum - 105, Math.round(v / 10) * 10));
  if (action.type === "wire") {
    const terminals = endpoints(next);
    if (
      !rules.tools.includes("wire") ||
      !Object.hasOwn(terminals, action.a) ||
      !Object.hasOwn(terminals, action.b) ||
      action.a === action.b ||
      next.wires.length >= 24 ||
      next.wires.some(
        (w) =>
          (w.a === action.a && w.b === action.b) ||
          (w.b === action.a && w.a === action.b),
      )
    )
      return circuit;
    next.wires.push({ id: `wire-${next.serial++}`, a: action.a, b: action.b });
  } else if (action.type === "add") {
    if (
      !rules.tools.includes(action.kind) ||
      !Number.isFinite(action.x) ||
      !Number.isFinite(action.y) ||
      next.parts.filter((p) => p.kind === action.kind).length >=
        (rules.limits[action.kind] ?? 0)
    )
      return circuit;
    next.parts.push({
      id: `${action.kind}-${next.serial++}`,
      kind: action.kind,
      x: clamp(action.x, KIT_SIZE.width),
      y: clamp(action.y, KIT_SIZE.height),
      angle:
        action.kind === "battery" || action.kind === "bulb" ? -Math.PI / 2 : 0,
      value:
        action.kind === "battery"
          ? rules.voltage
          : action.kind === "resistor"
            ? rules.resistorValues[0]
            : 12,
      rating: action.kind === "bulb" ? 6 : undefined,
      closed: action.kind === "switch" ? false : undefined,
    });
  } else if (action.type === "remove") {
    if (part?.fixed || (!part && !next.wires.some((w) => w.id === action.id)))
      return circuit;
    next.parts = next.parts.filter((p) => p.id !== action.id);
    next.wires = next.wires.filter(
      (w) =>
        w.id !== action.id &&
        ![w.a, w.b].some((n) => n.split(":")[0] === action.id),
    );
  } else if (part) {
    if (action.type === "toggle" && part.kind === "switch")
      part.closed = !part.closed;
    else if (
      action.type === "move" &&
      !part.fixed &&
      Number.isFinite(action.x) &&
      Number.isFinite(action.y)
    ) {
      part.x = clamp(action.x, KIT_SIZE.width);
      part.y = clamp(action.y, KIT_SIZE.height);
    } else if (action.type === "rotate" && !part.fixed)
      part.angle = (part.angle + Math.PI / 2) % (2 * Math.PI);
    else if (
      action.type === "value" &&
      part.kind === "resistor" &&
      rules.resistorValues.includes(action.value)
    )
      part.value = action.value;
    else return circuit;
  } else return circuit;
  return next;
}
