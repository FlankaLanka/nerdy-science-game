import { MISSIONS, missionById, wireKey } from "./missions.ts";
import type { MissionId, Wire, Material } from "./missions.ts";
import { outcomeId, sanitizeWires, solveCircuit } from "./circuit.ts";

export type Phase =
  "build" | "fault-ready" | "fault-result" | "reflect" | "complete";
export type Experiment = {
  type: "circuit" | "fault";
  wires: Wire[];
  material: Material;
  prediction: string;
  outcome: string;
  matched: boolean;
  hints: number;
};
export type Progress = {
  wires: Wire[];
  material: Material;
  phase: Phase;
  history: { wires: Wire[]; material: Material }[];
  prediction: string | null;
  faultPrediction: string | null;
  experiments: Experiment[];
  hints: number;
  tested: boolean;
  explanation: string | null;
  firstExplanation: string | null;
};
export type GameState = {
  version: 1;
  started: boolean;
  intro: number;
  lesson: number;
  completed: MissionId[];
  missions: Record<MissionId, Progress>;
  note: string;
  sound: boolean;
  reducedMotion: boolean;
  finishedAt: number | null;
};
export const SAVE_KEY = "signal.lighthouse.v1";
export function initialProgress(): Progress {
  return {
    wires: [],
    material: "wood",
    phase: "build",
    history: [],
    prediction: null,
    faultPrediction: null,
    experiments: [],
    hints: 0,
    tested: false,
    explanation: null,
    firstExplanation: null,
  };
}
export function initialState(): GameState {
  return {
    version: 1,
    started: false,
    intro: 0,
    lesson: 0,
    completed: [],
    missions: {
      workshop: initialProgress(),
      harbor: initialProgress(),
      beacon: initialProgress(),
    },
    note: "",
    sound: true,
    reducedMotion: false,
    finishedAt: null,
  };
}
export type MissionAction =
  | { type: "WIRE"; wire: Wire }
  | { type: "MATERIAL"; material: Material }
  | { type: "UNDO" }
  | { type: "CLEAR" }
  | { type: "PREDICT"; value: string }
  | { type: "TEST" }
  | { type: "FAULT_PREDICT"; value: string }
  | { type: "FAULT_TEST" }
  | { type: "EXPLAIN"; value: string }
  | { type: "REVISE" }
  | { type: "HINT" };
export type GameAction =
  | { type: "START" }
  | { type: "INTRO"; step: number }
  | { type: "LESSON"; step: number }
  | { type: "RESET" }
  | { type: "MISSION"; id: MissionId; action: MissionAction }
  | { type: "COMPLETE"; id: MissionId; now: number }
  | { type: "NOTE"; text: string }
  | { type: "SOUND" }
  | { type: "MOTION" };

export function currentMission(state: GameState): MissionId {
  return MISSIONS.find((m) => !state.completed.includes(m.id))?.id ?? "beacon";
}
export function unlocked(state: GameState, id: MissionId): boolean {
  return (
    state.started &&
    (id === currentMission(state) || state.completed.includes(id))
  );
}
export function canFinish(id: MissionId, p: Progress): boolean {
  if (p.explanation !== missionById(id).answer) return false;
  if (id === "workshop")
    return (
      p.phase === "reflect" && solveCircuit(id, p.wires, p.material).count === 1
    );
  if (p.phase !== "fault-result" || !p.faultPrediction) return false;
  const base = solveCircuit(id, p.wires, p.material),
    fault = solveCircuit(id, p.wires, p.material, "a");
  return (
    base.count === 2 && (id === "harbor" ? fault.count === 0 : fault.lamps.b.on)
  );
}

export function updateProgress(
  id: MissionId,
  p: Progress,
  action: MissionAction,
): Progress {
  const mission = missionById(id);
  const edit = (wires: Wire[], material = p.material): Progress => ({
    ...p,
    wires,
    material,
    history: [...p.history, { wires: p.wires, material: p.material }].slice(
      -20,
    ),
    prediction: null,
    tested: false,
    explanation: null,
  });
  switch (action.type) {
    case "WIRE": {
      if (p.phase !== "build") return p;
      const key = wireKey(action.wire);
      if (mission.fixed.some((w) => wireKey(w) === key)) return p;
      const exists = p.wires.some((w) => wireKey(w) === key);
      const wires = exists
        ? p.wires.filter((w) => wireKey(w) !== key)
        : sanitizeWires(id, [...p.wires, action.wire]);
      if (JSON.stringify(wires) === JSON.stringify(p.wires)) return p;
      return edit(wires);
    }
    case "MATERIAL":
      return p.phase === "build" &&
        id === "workshop" &&
        ["copper", "wood", "glass"].includes(action.material) &&
        action.material !== p.material
        ? edit(p.wires, action.material)
        : p;
    case "UNDO": {
      if (p.phase !== "build" || !p.history.length) return p;
      const previous = p.history[p.history.length - 1];
      return {
        ...p,
        ...previous,
        history: p.history.slice(0, -1),
        tested: false,
        prediction: null,
      };
    }
    case "CLEAR":
      return p.phase === "build" && p.wires.length ? edit([]) : p;
    case "PREDICT":
      return p.phase === "build" &&
        mission.predictions.some((c) => c.id === action.value)
        ? { ...p, prediction: action.value }
        : p;
    case "TEST": {
      if (p.phase !== "build" || !p.prediction) return p;
      const result = solveCircuit(id, p.wires, p.material);
      const outcome = outcomeId(id, result);
      const experiment: Experiment = {
        type: "circuit",
        wires: p.wires,
        material: p.material,
        prediction: p.prediction,
        outcome,
        matched: outcome === p.prediction,
        hints: p.hints,
      };
      const lit = result.count === mission.lamps.length;
      // Harbor is an investigation of the supplied series path. A bypass is real,
      // but must be revised so the intended comparison is actually experienced.
      const series =
        id !== "harbor" ||
        solveCircuit(id, p.wires, p.material, "a").count === 0;
      return {
        ...p,
        tested: true,
        experiments: [...p.experiments, experiment].slice(-80),
        phase:
          lit && series
            ? id === "workshop"
              ? "reflect"
              : "fault-ready"
            : "build",
      };
    }
    case "FAULT_PREDICT":
      return p.phase === "fault-ready" &&
        ["stays", "out"].includes(action.value)
        ? { ...p, faultPrediction: action.value }
        : p;
    case "FAULT_TEST": {
      if (p.phase !== "fault-ready" || !p.faultPrediction) return p;
      const result = solveCircuit(id, p.wires, p.material, "a");
      const outcome = result.lamps.b?.on ? "stays" : "out";
      return {
        ...p,
        phase: "fault-result",
        experiments: [
          ...p.experiments,
          {
            type: "fault" as const,
            wires: p.wires,
            material: p.material,
            prediction: p.faultPrediction,
            outcome,
            matched: outcome === p.faultPrediction,
            hints: p.hints,
          },
        ].slice(-80),
      };
    }
    case "EXPLAIN": {
      if (
        !["reflect", "fault-result"].includes(p.phase) ||
        !mission.explanations.some((c) => c.id === action.value)
      )
        return p;
      if (
        id === "beacon" &&
        !solveCircuit(id, p.wires, p.material, "a").lamps.b.on
      )
        return p;
      return {
        ...p,
        explanation: action.value,
        firstExplanation: p.firstExplanation ?? action.value,
      };
    }
    case "REVISE":
      return p.phase === "fault-result"
        ? {
            ...p,
            phase: "build",
            tested: false,
            prediction: null,
            faultPrediction: null,
            explanation: null,
          }
        : p;
    case "HINT":
      return p.phase !== "complete"
        ? { ...p, hints: Math.min(p.hints + 1, 999) }
        : p;
    default:
      return p;
  }
}

export function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START":
      return { ...state, started: true };
    case "INTRO":
      return state.started &&
        Number.isInteger(action.step) &&
        action.step >= 0 &&
        action.step <= 3
        ? { ...state, intro: action.step }
        : state;
    case "LESSON":
      return state.started &&
        Number.isInteger(action.step) &&
        action.step >= 0 &&
        action.step <= 4
        ? { ...state, lesson: action.step }
        : state;
    case "RESET":
      return {
        ...initialState(),
        sound: state.sound,
        reducedMotion: state.reducedMotion,
      };
    case "SOUND":
      return { ...state, sound: !state.sound };
    case "MOTION":
      return { ...state, reducedMotion: !state.reducedMotion };
    case "NOTE":
      return { ...state, note: action.text.slice(0, 1500) };
    case "MISSION": {
      if (!unlocked(state, action.id) || state.completed.includes(action.id))
        return state;
      return {
        ...state,
        missions: {
          ...state.missions,
          [action.id]: updateProgress(
            action.id,
            state.missions[action.id],
            action.action,
          ),
        },
      };
    }
    case "COMPLETE": {
      if (
        !unlocked(state, action.id) ||
        state.completed.includes(action.id) ||
        !canFinish(action.id, state.missions[action.id])
      )
        return state;
      return {
        ...state,
        completed: [...state.completed, action.id],
        missions: {
          ...state.missions,
          [action.id]: { ...state.missions[action.id], phase: "complete" },
        },
        finishedAt: action.id === "beacon" ? action.now : state.finishedAt,
      };
    }
    default:
      return state;
  }
}

export function restoreState(raw: string | null): GameState {
  const state = initialState();
  if (!raw) return state;
  try {
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || typeof data !== "object") return state;
    state.started = data.started === true;
    // Existing adventures resume without replaying the new arrival or lesson.
    state.intro =
      Number.isInteger(data.intro) && data.intro >= 0 && data.intro <= 3
        ? data.intro
        : state.started
          ? 3
          : 0;
    state.lesson =
      Number.isInteger(data.lesson) && data.lesson >= 0 && data.lesson <= 4
        ? data.lesson
        : state.started
          ? 4
          : 0;
    state.sound = data.sound !== false;
    state.reducedMotion = data.reducedMotion === true;
    state.note = typeof data.note === "string" ? data.note.slice(0, 1500) : "";
    for (const mission of MISSIONS) {
      const saved = data.missions?.[mission.id];
      if (!saved || typeof saved !== "object") continue;
      const p = initialProgress();
      p.wires = sanitizeWires(mission.id, saved.wires);
      p.material = ["wood", "glass", "copper"].includes(saved.material)
        ? saved.material
        : "wood";
      p.prediction = mission.predictions.some((c) => c.id === saved.prediction)
        ? saved.prediction
        : null;
      p.faultPrediction = ["stays", "out"].includes(saved.faultPrediction)
        ? saved.faultPrediction
        : null;
      p.explanation = mission.explanations.some(
        (c) => c.id === saved.explanation,
      )
        ? saved.explanation
        : null;
      p.firstExplanation = mission.explanations.some(
        (c) => c.id === saved.firstExplanation,
      )
        ? saved.firstExplanation
        : null;
      p.hints = Number.isInteger(saved.hints)
        ? Math.min(999, Math.max(0, saved.hints))
        : 0;
      if (Array.isArray(saved.experiments))
        p.experiments = saved.experiments
          .slice(-80)
          .flatMap((e: Record<string, unknown>) => {
            if (
              !e ||
              !["circuit", "fault"].includes(e.type as string) ||
              typeof e.prediction !== "string"
            )
              return [];
            const type = e.type as "circuit" | "fault";
            if (
              !(type === "circuit"
                ? mission.predictions.some((c) => c.id === e.prediction)
                : ["stays", "out"].includes(e.prediction))
            )
              return [];
            const wires = sanitizeWires(mission.id, e.wires);
            const material: Material = ["wood", "glass", "copper"].includes(
              e.material as string,
            )
              ? (e.material as Material)
              : "wood";
            const result = solveCircuit(
              mission.id,
              wires,
              material,
              type === "fault" ? "a" : null,
            );
            const outcome =
              type === "fault"
                ? result.lamps.b?.on
                  ? "stays"
                  : "out"
                : outcomeId(mission.id, result);
            return [
              {
                type,
                wires,
                material,
                prediction: e.prediction,
                outcome,
                matched: outcome === e.prediction,
                hints:
                  typeof e.hints === "number"
                    ? Math.max(0, Math.min(999, Math.floor(e.hints)))
                    : 0,
              },
            ];
          });
      const validBase =
        solveCircuit(mission.id, p.wires, p.material).count ===
        mission.lamps.length;
      if (
        validBase &&
        ["reflect", "fault-ready", "fault-result", "complete"].includes(
          saved.phase,
        )
      ) {
        if (mission.id === "workshop") p.phase = "reflect";
        else
          p.phase =
            p.faultPrediction &&
            ["fault-result", "complete"].includes(saved.phase)
              ? "fault-result"
              : "fault-ready";
      }
      p.tested = saved.tested === true && !!p.prediction;
      state.missions[mission.id] = p;
      const orderOkay =
        mission.id === "workshop" ||
        state.completed.includes(MISSIONS[MISSIONS.indexOf(mission) - 1].id);
      if (
        state.started &&
        orderOkay &&
        Array.isArray(data.completed) &&
        data.completed.includes(mission.id) &&
        canFinish(mission.id, p)
      ) {
        state.completed.push(mission.id);
        p.phase = "complete";
      }
    }
    state.finishedAt =
      state.completed.length === 3 &&
      typeof data.finishedAt === "number" &&
      Number.isFinite(data.finishedAt)
        ? data.finishedAt
        : null;
    return state;
  } catch {
    return state;
  }
}
