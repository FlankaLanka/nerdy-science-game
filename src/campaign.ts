import {
  initialState as legacyInitial,
  updateProgress,
  canFinish,
  restoreState as restoreLegacy,
} from "./game.ts";
import type {
  GameState as LegacyState,
  GameAction as LegacyAction,
} from "./game.ts";
import type { MissionId } from "./missions.ts";
import {
  ACTIVITY_IDS,
  LAB_IDS,
  available,
  isLab,
  nextActivity,
} from "./activities.ts";
import type { ActivityId, LabId } from "./activities.ts";
import { initialLab, updateLab, labReady, restoreLab } from "./labPhysics.ts";
import type { LabProgress, LabAction } from "./labPhysics.ts";
export { initialProgress, updateProgress } from "./game.ts";
export type { Progress } from "./game.ts";
export type GameState = Omit<LegacyState, "version" | "completed"> & {
  version: 2;
  completed: ActivityId[];
  labs: Record<LabId, LabProgress>;
  visited: ActivityId[];
  tracked: ActivityId | null;
};
export const SAVE_KEY = "signal.asterion.circuits.v2";
export function initialState(): GameState {
  return {
    ...legacyInitial(),
    version: 2,
    completed: [],
    labs: Object.fromEntries(LAB_IDS.map((id) => [id, initialLab()])) as Record<
      LabId,
      LabProgress
    >,
    visited: [],
    tracked: null,
  };
}
export type GameAction =
  | Exclude<LegacyAction, { type: "COMPLETE" }>
  | { type: "COMPLETE"; id: ActivityId; now: number }
  | { type: "LAB"; id: LabId; action: LabAction }
  | { type: "VISIT"; id: ActivityId }
  | { type: "TRACK"; id: ActivityId };
export const currentMission = (s: GameState) =>
  nextActivity(s.completed, s.tracked);
export function reducer(s: GameState, a: GameAction): GameState {
  switch (a.type) {
    case "START":
      return { ...s, started: true };
    case "INTRO":
      return { ...s, intro: Math.max(0, Math.min(3, a.step)) };
    case "LESSON":
      return { ...s, lesson: Math.max(0, Math.min(4, a.step)) };
    case "RESET":
      return {
        ...initialState(),
        sound: s.sound,
        reducedMotion: s.reducedMotion,
      };
    case "SOUND":
      return { ...s, sound: !s.sound };
    case "MOTION":
      return { ...s, reducedMotion: !s.reducedMotion };
    case "NOTE":
      return { ...s, note: a.text.slice(0, 3000) };
    case "VISIT":
      return s.visited.includes(a.id)
        ? s
        : { ...s, visited: [...s.visited, a.id] };
    case "TRACK":
      return { ...s, tracked: a.id };
    case "MISSION":
      return s.started && !s.completed.includes(a.id)
        ? {
            ...s,
            missions: {
              ...s.missions,
              [a.id]: updateProgress(a.id, s.missions[a.id], a.action),
            },
          }
        : s;
    case "LAB":
      return s.started && !s.completed.includes(a.id)
        ? {
            ...s,
            labs: {
              ...s.labs,
              [a.id]: updateLab(a.id, s.labs[a.id], a.action),
            },
          }
        : s;
    case "COMPLETE": {
      if (
        !s.started ||
        s.completed.includes(a.id) ||
        !available(a.id, s.completed)
      )
        return s;
      if (
        isLab(a.id)
          ? !labReady(a.id, s.labs[a.id])
          : !canFinish(a.id, s.missions[a.id])
      )
        return s;
      return {
        ...s,
        completed: [...s.completed, a.id],
        tracked: s.tracked === a.id ? null : s.tracked,
        missions: isLab(a.id)
          ? s.missions
          : {
              ...s.missions,
              [a.id]: { ...s.missions[a.id], phase: "complete" },
            },
        finishedAt: a.id === "beacon" ? a.now : s.finishedAt,
      };
    }
    case "SEND_DISTRESS":
      return s.completed.length === ACTIVITY_IDS.length
        ? { ...s, distressSent: true }
        : s;
    default:
      return s;
  }
}
export function restoreState(raw: string | null): GameState {
  const s = initialState();
  try {
    const d = JSON.parse(raw ?? "null");
    if (!d || ![1, 2].includes(d.version)) return s;
    const old = restoreLegacy(JSON.stringify({ ...d, version: 1 }));
    Object.assign(s, {
      started: old.started,
      intro: old.intro,
      lesson: old.lesson,
      missions: old.missions,
      sound: old.sound,
      reducedMotion: old.reducedMotion,
      note: typeof d.note === "string" ? d.note.slice(0, 3000) : "",
    });
    for (const id of LAB_IDS) s.labs[id] = restoreLab(id, d.labs?.[id]);
    for (const id of ACTIVITY_IDS) {
      if (
        !Array.isArray(d.completed) ||
        !d.completed.includes(id) ||
        !available(id, s.completed)
      )
        continue;
      if (isLab(id)) {
        if (labReady(id, s.labs[id])) s.completed.push(id);
      } else {
        const p = s.missions[id];
        const check = {
          ...p,
          phase:
            p.phase === "complete"
              ? id === "workshop"
                ? "reflect"
                : "fault-result"
              : p.phase,
        } as typeof p;
        if (canFinish(id, check)) {
          s.completed.push(id);
          p.phase = "complete";
        }
      }
    }
    // Old builds had only three repairs. Preserve their work, while requiring the new commissioning prerequisites.
    for (const id of ["workshop", "harbor", "beacon"] as MissionId[])
      if (!s.completed.includes(id) && s.missions[id].phase === "complete")
        s.missions[id].phase = id === "workshop" ? "reflect" : "fault-result";
    s.visited = ACTIVITY_IDS.filter(
      (id) => Array.isArray(d.visited) && d.visited.includes(id),
    );
    s.tracked = ACTIVITY_IDS.includes(d.tracked) ? d.tracked : null;
    s.distressSent =
      s.completed.length === ACTIVITY_IDS.length && d.distressSent === true;
    s.finishedAt =
      s.completed.length === ACTIVITY_IDS.length &&
      Number.isFinite(d.finishedAt)
        ? d.finishedAt
        : null;
    return s;
  } catch {
    return s;
  }
}
