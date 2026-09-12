import type { MissionId } from "./missions.ts";
export type LabId = "ohm" | "power" | "junction" | "storage" | "timing";
export type ActivityId = MissionId | LabId;
export type Activity = {
  id: ActivityId;
  code: string;
  name: string;
  system: string;
  goal: string;
  purpose: string;
  restored: string;
  prerequisites: ActivityId[];
  topics: string;
  concept: string;
  guide: string;
  discovery: string;
  color: string;
  x: number;
  z: number;
};
export const ACTIVITIES: Activity[] = [
  {
    id: "workshop",
    code: "AUX–01",
    name: "Engineering",
    system: "Emergency lighting",
    goal: "Restore the emergency lighting",
    purpose:
      "A broken return path left the deck on emergency power. Restore a conducting loop to release access to the station hub.",
    restored: "Deck lighting online. Both maintenance wings are accessible.",
    prerequisites: [],
    topics: "11.1 · 11.2",
    concept: "Charge, current & complete circuits",
    guide:
      "Join the two loose sockets. Try an insert, then switch on. You can test at any time.",
    discovery:
      "Current is charge moving around a complete conducting loop. The source transfers energy to charges already in the circuit; the lamp does not consume the charge.",
    color: "#9ce3cb",
    x: -3,
    z: 20,
  },
  {
    id: "ohm",
    code: "MAT–02",
    name: "Materials workshop",
    system: "Sensor feed",
    goal: "Deliver 0.50 A at 6 V",
    purpose:
      "The environmental sensors need a predictable current. Compare a wire sample at two voltages, then find a suitable conductor geometry.",
    restored: "Sensor network calibrated. Life support can be commissioned.",
    prerequisites: ["workshop"],
    topics: "11.3",
    concept: "Resistance, resistivity & Ohm’s law",
    guide:
      "Keep the same sample and record two voltages. Then adjust its material, length or area until 6 V gives about 0.50 A.",
    discovery:
      "For an ohmic sample, I rises in proportion to V. R = ρL/A: doubling length doubles resistance; doubling cross-sectional area halves it. Resistivity belongs to the material.",
    color: "#dbb379",
    x: -15,
    z: 13,
  },
  {
    id: "harbor",
    code: "BUS–03",
    name: "Distribution",
    system: "Series interlock",
    goal: "Investigate the shared interlock circuit",
    purpose:
      "Two interlock indicators share one route. Restore that route, then disconnect one module to identify why both indicators fail together.",
    restored:
      "Series interlock verified. Junction diagnostics are available in the hub.",
    prerequisites: ["workshop"],
    topics: "11.5 · 11.6",
    concept: "Series circuits & voltage sharing",
    guide:
      "Connect the loose return to source −. Switch on, then disconnect A and watch both meters.",
    discovery:
      "Series elements carry the same current. Their voltage drops add to the source rise. Opening either element breaks the only path; current is not used up along the route.",
    color: "#dcbb81",
    x: 14,
    z: 13,
  },
  {
    id: "power",
    code: "ENV–04",
    name: "Life support",
    system: "Circulation pump",
    goal: "Deliver 6.0 V to the circulation pump",
    purpose:
      "A 6 Ω pump controller is connected to a 12 V supply with 1 Ω internal resistance. Choose a ballast resistor that protects the load.",
    restored: "Ventilation circulating. The life-support fans are running.",
    prerequisites: ["ohm", "harbor"],
    topics: "11.4 · 11.6",
    concept: "Power, energy & nonideal sources",
    guide:
      "Adjust the ballast. Read the voltage across each element. The rises and drops must balance; the pump needs 6.0 V.",
    discovery:
      "The source supplies 12 J per coulomb. Some energy heats its internal resistance, some heats the ballast, and the rest reaches the load. P = IV; charge is conserved throughout.",
    color: "#b6d49b",
    x: -15,
    z: -6,
  },
  {
    id: "junction",
    code: "HUB–05",
    name: "Station hub",
    system: "Independent supply",
    goal: "Keep reserve B at 12 V when A is isolated",
    purpose:
      "The station’s backup supply must survive a failed primary branch. Reconfigure the distribution network, measure both loads, then isolate A.",
    restored:
      "Independent reserve feed online. Energy storage can be serviced.",
    prerequisites: ["harbor"],
    topics: "11.5 · 11.7",
    concept: "Parallel branches & junction conservation",
    guide:
      "Compare series, parallel and a shared feed. Record both loads working; then switch A off and check B.",
    discovery:
      "Parallel branches share a voltage, not necessarily a current. At a junction, the incoming current equals the sum of outgoing currents. Adding a parallel branch increases the current drawn from an ideal voltage source.",
    color: "#93cebe",
    x: 4,
    z: 4,
  },
  {
    id: "storage",
    code: "CAP–06",
    name: "Reserve vault",
    system: "Capacitor bank",
    goal: "Store at least 2.5 J on the 12 V reserve bus",
    purpose:
      "The emergency release needs a short pulse of energy. Connect two capacitor modules and compare their combined charge and energy.",
    restored: "Reserve bank charged. Airlock hold-up testing is available.",
    prerequisites: ["junction"],
    topics: "10.6 bridge · 11.8",
    concept: "Capacitance, charge, energy & combinations",
    guide:
      "Try a series connection and record it. Then try parallel. Choose a bank that stores at least 2.5 J without exceeding 12 V on either module.",
    discovery:
      "A capacitor separates equal and opposite charges; Q means the magnitude on one plate. Parallel capacitances add. Series capacitors share charge and divide voltage. Stored energy is ½CV².",
    color: "#aecbdc",
    x: 14,
    z: -6,
  },
  {
    id: "timing",
    code: "AIR–07",
    name: "Airlock control",
    system: "Power hold-up",
    goal: "Keep the latch above 6 V for a 2 s outage",
    purpose:
      "The airlock controller resets during a supply interruption. Use a charged capacitor and a resistive test load to keep it alive while the source is disconnected.",
    restored: "Airlock hold-up verified. The communications reserve is ready.",
    prerequisites: ["storage", "ohm"],
    topics: "11.8",
    concept: "RC charging, discharging & time constant",
    guide:
      "Choose R and C, charge the bank, then start a 2 s outage test. Watch voltage fall and current reverse. A larger RC makes the change slower.",
    discovery:
      "The capacitor voltage changes continuously. After one time constant RC, charging has reached about 63% of its final voltage; discharging retains about 37% of its starting voltage. A fully charged capacitor carries no steady DC current.",
    color: "#9ebfd3",
    x: 0,
    z: -7,
  },
  {
    id: "beacon",
    code: "COM–08",
    name: "Command",
    system: "Distress transmitter",
    goal: "Build the final resilient communications circuit",
    purpose:
      "Ventilation, distribution and stored-energy backup are ready. Wire independent paths for the main and backup transmitter indicators, then prove the backup survives a fault.",
    restored:
      "Transmitter commissioned. Send the distress signal from Command.",
    prerequisites: ["power", "timing", "junction"],
    topics: "11.2–11.8 transfer",
    concept: "Transfer: a repair without a supplied route",
    guide:
      "Use the tools you have learned. Build a complete route through each load, energize both, then isolate the main load.",
    discovery:
      "A reliable system combines correct load voltage, independent branches and a finite energy reserve. The commissioned capacitor bank supplies the regulated reserve; these 6 V indicators verify the final branch wiring.",
    color: "#b7cbd3",
    x: 0,
    z: -19,
  },
];
export const ACTIVITY_IDS = ACTIVITIES.map((a) => a.id);
export const LAB_IDS: LabId[] = [
  "ohm",
  "power",
  "junction",
  "storage",
  "timing",
];
export const activity = (id: ActivityId) =>
  ACTIVITIES.find((a) => a.id === id)!;
export const isLab = (id: ActivityId): id is LabId =>
  LAB_IDS.includes(id as LabId);
export const available = (id: ActivityId, completed: ActivityId[]) =>
  activity(id).prerequisites.every((p) => completed.includes(p));
export const nextActivity = (
  completed: ActivityId[],
  tracked?: ActivityId | null,
): ActivityId =>
  tracked && !completed.includes(tracked) && available(tracked, completed)
    ? tracked
    : (ACTIVITIES.find(
        (a) => !completed.includes(a.id) && available(a.id, completed),
      )?.id ?? "beacon");
