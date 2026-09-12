import { ACTIVITIES, available } from "./activities.ts";
import type { ActivityId as MissionId } from "./activities.ts";

/** Persistent repairs are the authority for the world, objective, map and instruments. */
export const SYSTEM_ORDER: MissionId[] = ["workshop", "harbor", "beacon"];
export const SHIP_SYSTEMS = Object.fromEntries(
  ACTIVITIES.map((a) => [
    a.id,
    {
      code: a.code,
      label: a.system,
      goal: a.goal,
      fault: a.guide,
      consequence: a.purpose,
      restored: a.restored,
      destination: a.name,
      loadA:
        a.id === "workshop"
          ? "Deck lighting"
          : a.id === "harbor"
            ? "Interlock A"
            : "Main array",
      loadB: a.id === "harbor" ? "Interlock B" : "Backup array",
    },
  ]),
) as Record<
  MissionId,
  {
    code: string;
    label: string;
    goal: string;
    fault: string;
    consequence: string;
    restored: string;
    destination: string;
    loadA: string;
    loadB: string;
  }
>;
export function systemStatus(id: MissionId, completed: MissionId[]) {
  return completed.includes(id)
    ? "ONLINE"
    : available(id, completed)
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
