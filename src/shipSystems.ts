import type { MissionId } from "./missions.ts";

/** Persistent repairs are the authority for the world, objective, map and instruments. */
export const SYSTEM_ORDER: MissionId[] = ["workshop", "harbor", "beacon"];
export const SHIP_SYSTEMS = {
  workshop: {
    code: "AUX–01",
    label: "Auxiliary power",
    goal: "Restore auxiliary power",
    fault: "A surge melted the conductor insert. The lighting circuit is open.",
    consequence: "Restore deck lighting and release the relay bulkhead.",
    restored: "Deck lighting restored. Relay bulkhead released.",
    destination: "Engineering · port service console",
    loadA: "Deck lighting",
    loadB: "",
  },
  harbor: {
    code: "BUS–02",
    label: "Power distribution",
    goal: "Commission the distribution bus",
    fault:
      "The relay indicators share a damaged series feed. Verify their failure dependency before reconnecting the bus.",
    consequence: "Start the reactor and open the command observation shield.",
    restored: "Reactor synchronized. Command access released.",
    destination: "Power relay · starboard service console",
    loadA: "Relay A",
    loadB: "Relay B",
  },
  beacon: {
    code: "COM–03",
    label: "Distress transmitter",
    goal: "Build a fault-tolerant transmitter",
    fault:
      "The main array is unreliable. The backup must keep transmitting when the main branch fails.",
    consequence:
      "Keep the backup online, then send our coordinates to rescue control.",
    restored: "Independent backup verified. Transmitter ready.",
    destination: "Command deck · forward console",
    loadA: "Main array",
    loadB: "Backup array",
  },
} as const;

export function systemStatus(id: MissionId, completed: MissionId[]) {
  if (completed.includes(id)) return "ONLINE";
  const index = SYSTEM_ORDER.indexOf(id);
  return index === 0 || completed.includes(SYSTEM_ORDER[index - 1])
    ? "FAULT"
    : "NO FEED";
}

/** Doors release only after the upstream repair. Always allow return from the forward
 * side and protect a saved capsule already inside the opening from being crushed. */
export function bulkheadAccess(
  index: number,
  completed: MissionId[],
  playerZ: number,
  doorZ: number,
  resumingInAperture = false,
) {
  return (
    completed.includes(SYSTEM_ORDER[index]) ||
    playerZ < doorZ ||
    (resumingInAperture && Math.abs(playerZ - doorZ) <= 0.65)
  );
}

// Starting values; acceptance metrics and adjustment directions: docs/redesign.md.
export const SHIP_TUNING = {
  doorApproach: 5.5,
  doorDamping: 8,
  powerDamping: 1.8,
  shieldDamping: 0.7,
  restorationNoticeMs: 4200,
  bootNoticeMs: 1400,
  transmissionMs: 2600,
} as const;
