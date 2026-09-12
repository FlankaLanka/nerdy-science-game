export type MissionId = "workshop" | "harbor" | "beacon";
export type Material = "copper" | "polymer" | "glass";
export type Wire = [string, string];
export type Terminal = { id: string; label: string; x: number; y: number };
export type Lamp = {
  id: "a" | "b";
  x: number;
  y: number;
  left: string;
  right: string;
};
export type Choice = { id: string; text: string };
export type Mission = {
  id: MissionId;
  number: string;
  place: string;
  title: string;
  task: string;
  intro: string;
  prediction: string;
  predictions: Choice[];
  terminals: Terminal[];
  lamps: Lamp[];
  fixed: Wire[];
  question: string;
  explanations: Choice[];
  answer: string;
  misconception: Record<string, string>;
  discovery: string;
  evidence: string;
  restore: string;
  farewell: string;
};

const battery: Terminal[] = [
  { id: "p", label: "Battery positive", x: 130, y: 150 },
  { id: "n", label: "Battery negative", x: 130, y: 320 },
];
const lampA: Lamp = { id: "a", x: 480, y: 145, left: "a1", right: "a2" };
const lampB: Lamp = { id: "b", x: 480, y: 330, left: "b1", right: "b2" };
const lampTerminals = (lamp: Lamp): Terminal[] => [
  {
    id: lamp.left,
    label: `Lamp ${lamp.id.toUpperCase()} left`,
    x: lamp.x - 72,
    y: lamp.y,
  },
  {
    id: lamp.right,
    label: `Lamp ${lamp.id.toUpperCase()} right`,
    x: lamp.x + 72,
    y: lamp.y,
  },
];

export const MISSIONS: Mission[] = [
  {
    id: "workshop",
    number: "01",
    place: "Engineering",
    title: "Auxiliary power.",
    task: "Restore the auxiliary lighting supply.",
    intro:
      "A surge broke the auxiliary power circuit. Choose a bridge material, then join the empty sockets with a wire.",
    prediction: "When you test it, the lamp will…",
    predictions: [
      { id: "on", text: "Light up" },
      { id: "off", text: "Stay dark" },
    ],
    terminals: [
      ...battery,
      ...lampTerminals(lampA),
      { id: "m1", label: "Bridge left", x: 408, y: 330 },
      { id: "m2", label: "Bridge right", x: 552, y: 330 },
    ],
    lamps: [lampA],
    fixed: [
      ["p", "a1"],
      ["m2", "n"],
    ],
    question: "What does the lamp need to light?",
    explanations: [
      { id: "near", text: "To be close to the battery" },
      {
        id: "loop",
        text: "A conducting path through the lamp, joining both battery ends",
      },
      { id: "one", text: "A wire to just one end of the battery" },
    ],
    answer: "loop",
    misconception: {
      near: "Distance is not the deciding factor. Trace the connected path through the lamp and back to the battery.",
      one: "One connection leaves a gap. Follow the path from one battery end, through the lamp, to the other end.",
    },
    discovery: "A complete conducting loop.",
    evidence:
      "The lamp lights when a conducting loop connects it to both battery terminals. Polymer and glass leave the bridge open in our model.",
    restore: "Restore auxiliary power",
    farewell: "That’s our first light. Power relay is just down the path.",
  },
  {
    id: "harbor",
    number: "02",
    place: "Power relay",
    title: "Shared power.",
    task: "Reconnect both relay indicators. Then isolate a failed module.",
    intro:
      "These lamps share one route. Reconnect the loose end to the battery, then we’ll see how they depend on each other.",
    prediction: "When you test this circuit…",
    predictions: [
      { id: "both", text: "Both lamps light" },
      { id: "one", text: "Only one lights" },
      { id: "none", text: "Neither lights" },
    ],
    terminals: [...battery, ...lampTerminals(lampA), ...lampTerminals(lampB)],
    lamps: [lampA, lampB],
    fixed: [
      ["p", "a1"],
      ["a2", "b1"],
    ],
    question: "Why did both lamps go out?",
    explanations: [
      { id: "used", text: "Lamp A used up all the current" },
      { id: "loop", text: "Removing A opened their only complete path" },
      { id: "battery", text: "Removing a lamp always empties the battery" },
    ],
    answer: "loop",
    misconception: {
      used: "Current is not used up by the first lamp. Removing it made a gap in the one path both lamps shared.",
      battery:
        "The battery is still there. Look for the gap made when lamp A was removed.",
    },
    discovery: "One path. Shared failure.",
    evidence:
      "In the tested series circuit, both lamps shared one path. Removing A broke that path, so B also went out. The battery was not empty.",
    restore: "Restore distribution",
    farewell:
      "Distribution restored. Command needs independent backup power for the transmitter.",
  },
  {
    id: "beacon",
    number: "03",
    place: "Command deck",
    title: "A signal that survives.",
    task: "Light both lamps. Keep B shining if A is disconnected.",
    intro:
      "The distress transmitter needs power that survives a component failure. Build independent paths for its two lamps.",
    prediction: "When you test your circuit…",
    predictions: [
      { id: "both", text: "Both lamps light" },
      { id: "one", text: "Only one lights" },
      { id: "none", text: "Neither lights" },
    ],
    terminals: [...battery, ...lampTerminals(lampA), ...lampTerminals(lampB)],
    lamps: [lampA, lampB],
    fixed: [],
    question: "Why can B keep shining without A?",
    explanations: [
      { id: "store", text: "B stored some light for later" },
      { id: "bigger", text: "B became a stronger lamp" },
      {
        id: "branch",
        text: "B has its own complete path to both battery ends",
      },
    ],
    answer: "branch",
    misconception: {
      store:
        "B is still receiving energy from the battery. Trace its connected path while A is missing.",
      bigger:
        "It is the same lamp. What changed is the way the two lamps connect to the battery.",
    },
    discovery: "Independent paths.",
    evidence:
      "Each parallel branch connects across the battery. Opening A’s branch leaves a complete path through B. That is why the backup stays on.",
    restore: "Power the transmitter",
    farewell:
      "The transmitter is holding. Send a distress signal from Command.",
  },
];

export function missionById(id: MissionId): Mission {
  return MISSIONS.find((m) => m.id === id)!;
}
export function wireKey(w: Wire): string {
  return [...w].sort().join(":");
}
export const MATERIALS: { id: Material; name: string; short: string }[] = [
  { id: "copper", name: "Copper strip", short: "Copper" },
  { id: "polymer", name: "Polymer", short: "Polymer" },
  { id: "glass", name: "Glass strip", short: "Glass" },
];
