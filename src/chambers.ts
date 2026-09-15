import { cloneCircuit, lampState, simulate } from "./circuitKit.ts";
import type { Circuit, KitRules, Part } from "./circuitKit.ts";
export type ChamberId =
  "wake" | "contact" | "build" | "resist" | "share" | "branch";
export type FormulaId = "ohm" | "series" | "parallel";
export type Chamber = KitRules & {
  id: ChamberId;
  name: string;
  number: string;
  x: number;
  z: number;
  bench: { x: number; z: number };
  color: string;
  intro: string;
  hint: string;
  restored: string;
  formula?: FormulaId;
  initial: Circuit;
  bulbs: number;
};
const part = (
  id: string,
  kind: Part["kind"],
  x: number,
  y: number,
  value = 12,
  angle = 0,
  fixed = true,
): Part => ({
  id,
  kind,
  x,
  y,
  value,
  angle,
  fixed,
  ...(kind === "bulb" ? { rating: 6 } : {}),
  ...(kind === "switch" ? { closed: false } : {}),
});
const circuit = (parts: Part[], pairs: [string, string][]): Circuit => ({
  parts,
  wires: pairs.map(([a, b], i) => ({ id: `lead-${i}`, a, b })),
  serial: 1,
});
export const CHAMBERS: Chamber[] = [
  {
    id: "wake",
    number: "01",
    name: "Wake",
    x: -10,
    z: 20,
    bench: { x: -10, z: 19 },
    color: "#bddbcc",
    intro: "Welcome to Asterion. I'm ASTER. Let's bring the lights back, one circuit at a time.",
    hint: "Join the two open contacts.",
    restored: "One complete circuit. A bright start. The next room is ready for you.",
    tools: ["wire"],
    limits: { battery: 1, bulb: 1 },
    voltage: 6,
    resistorValues: [],
    bulbs: 1,
    initial: circuit(
      [
        part("source", "battery", 250, 265, 6, -Math.PI / 2),
        part("lamp", "bulb", 650, 265, 12, -Math.PI / 2),
      ],
      [["source:a", "lamp:a"]],
    ),
  },
  {
    id: "contact",
    number: "02",
    name: "Contact",
    x: -10,
    z: 6,
    bench: { x: -10, z: 5 },
    color: "#dcc6a2",
    intro: "The manual isolator is open. My arms were an optional extra.",
    hint: "Close the switch.",
    restored: "Contact made. A very small switch with excellent connections.",
    tools: ["wire"],
    limits: { battery: 1, bulb: 1, switch: 1 },
    voltage: 6,
    resistorValues: [],
    bulbs: 1,
    initial: circuit(
      [
        part("source", "battery", 250, 290, 6, -Math.PI / 2),
        part("lamp", "bulb", 650, 290, 12, -Math.PI / 2),
        part("isolator", "switch", 450, 155),
      ],
      [
        ["source:b", "isolator:a"],
        ["isolator:b", "lamp:b"],
        ["source:a", "lamp:a"],
      ],
    ),
  },
  {
    id: "build",
    number: "03",
    name: "Assembly",
    x: -10,
    z: -8,
    bench: { x: -10, z: -9 },
    color: "#aacbdc",
    intro:
      "A fresh set of parts. This time, you get to design the circuit.",
    hint: "Place a battery and a bulb. Give them a complete loop.",
    restored: "Your own circuit, from scratch. I knew you had a bright side.",
    tools: ["wire", "battery", "bulb"],
    limits: { battery: 1, bulb: 1 },
    voltage: 6,
    resistorValues: [],
    bulbs: 1,
    initial: circuit([], []),
  },
  {
    id: "resist",
    number: "04",
    name: "Balance",
    x: 10,
    z: -8,
    bench: { x: 10, z: -9 },
    color: "#d7bc91",
    intro: "Twelve volts from this supply. That lamp is rated for six.",
    hint: "Add resistance. Watch what reaches the lamp.",
    restored:
      "Six volts at the lamp. The rest across the resistor. Just enough.",
    formula: "ohm",
    tools: ["wire", "resistor"],
    limits: { battery: 1, bulb: 1, resistor: 1 },
    voltage: 12,
    resistorValues: [6, 12, 24],
    bulbs: 1,
    initial: circuit(
      [
        part("source", "battery", 235, 275, 12, -Math.PI / 2),
        part("lamp", "bulb", 665, 275, 12, -Math.PI / 2),
      ],
      [["source:a", "lamp:a"]],
    ),
  },
  {
    id: "share",
    number: "05",
    name: "Shared light",
    x: 10,
    z: 6,
    bench: { x: 10, z: 5 },
    color: "#b4cfa4",
    intro: "Two lamps. One twelve-volt supply. They can share it.",
    hint: "Each lamp needs six volts.",
    restored: "Two lights in one path. Sharing looks good on them.",
    formula: "series",
    tools: ["wire", "bulb"],
    limits: { battery: 1, bulb: 2 },
    voltage: 12,
    resistorValues: [],
    bulbs: 2,
    initial: circuit(
      [part("source", "battery", 220, 260, 12, -Math.PI / 2)],
      [],
    ),
  },
  {
    id: "branch",
    number: "06",
    name: "Independence",
    x: 10,
    z: 20,
    bench: { x: 10, z: 19 },
    color: "#b3cddc",
    intro:
      "That switch isolates the first lamp. The second needs its own way home.",
    hint: "Keep the second lamp powered when the first is switched off.",
    restored:
      "Two independent paths. Nicely done. The observation deck is yours to enjoy.",
    formula: "parallel",
    tools: ["wire", "bulb"],
    limits: { battery: 1, bulb: 2, switch: 1 },
    voltage: 6,
    resistorValues: [],
    bulbs: 2,
    initial: circuit(
      [
        part("source", "battery", 220, 270, 6, -Math.PI / 2),
        { ...part("isolator", "switch", 460, 125), closed: true },
        part("lamp-a", "bulb", 675, 225, 12, -Math.PI / 2),
      ],
      [
        ["source:b", "isolator:a"],
        ["isolator:b", "lamp-a:b"],
        ["source:a", "lamp-a:a"],
      ],
    ),
  },
];
export const CHAMBER_IDS = CHAMBERS.map((c) => c.id);
export const chamber = (id: ChamberId) => CHAMBERS.find((c) => c.id === id)!;
export const FORMULAS: Record<
  FormulaId,
  { name: string; equation: string; note: string }
> = {
  ohm: {
    name: "Ohm's law",
    equation: "V = I R",
    note: "V · volts    I · amps    R · ohms",
  },
  series: {
    name: "Series",
    equation: "Vₛ = V₁ + V₂",
    note: "One path · same current",
  },
  parallel: {
    name: "Parallel",
    equation: "V₁ = V₂ = Vₛ",
    note: "Separate paths · shared voltage",
  },
};
export function isRestored(id: ChamberId, document: Circuit) {
  const c = chamber(id),
    result = simulate(document);
  const bulbs = document.parts.filter((p) => p.kind === "bulb");
  if (
    result.tripped ||
    bulbs.length !== c.bulbs ||
    !bulbs.every((p) => lampState(p, result).lit)
  )
    return false;
  if (id === "contact")
    return document.parts.some(
      (p) =>
        p.kind === "switch" &&
        p.closed &&
        Math.abs(result.parts[p.id]?.current ?? 0) > 0.05,
    );
  if (id === "resist")
    return document.parts.some(
      (p) =>
        p.kind === "resistor" &&
        Math.abs(result.parts[p.id]?.current ?? 0) > 0.05,
    );
  if (id === "branch") {
    const isolated = cloneCircuit(document);
    const toggle = isolated.parts.find((p) => p.id === "isolator");
    if (!toggle || !document.parts.some((p) => p.id === "lamp-a")) return false;
    toggle.closed = false;
    const outage = simulate(isolated);
    return (
      !outage.tripped &&
      outage.parts["lamp-a"].voltage < 0.05 &&
      bulbs
        .filter((p) => p.id !== "lamp-a")
        .every((p) => lampState(p, outage).lit)
    );
  }
  return true;
}
