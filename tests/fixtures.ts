import { initialState, reducer } from "../src/campaign.ts";
import type { GameState } from "../src/campaign.ts";
import type { MissionId, Wire } from "../src/missions.ts";
import type { ActivityId, LabId } from "../src/activities.ts";
import type { LabAction } from "../src/labPhysics.ts";
export function campaignFixtures() {
  let state = reducer(initialState(), { type: "START" });
  const snapshots: Partial<Record<ActivityId, GameState>> = {};
  const complete = (id: ActivityId) => {
    state = reducer(state, { type: "COMPLETE", id, now: 1 });
    if (!state.completed.includes(id)) throw Error(`Invalid fixture: ${id}`);
    snapshots[id] = structuredClone(state);
  };
  const lab = (id: LabId, action: LabAction) => {
    state = reducer(state, { type: "LAB", id, action });
  };
  const circuit = (id: MissionId, wires: Wire[]) => {
    for (const wire of wires)
      state = reducer(state, {
        type: "MISSION",
        id,
        action: { type: "WIRE", wire },
      });
    if (id === "workshop")
      state = reducer(state, {
        type: "MISSION",
        id,
        action: { type: "MATERIAL", material: "copper" },
      });
    state = reducer(state, { type: "MISSION", id, action: { type: "TEST" } });
    if (id !== "workshop")
      state = reducer(state, {
        type: "MISSION",
        id,
        action: { type: "FAULT_TEST" },
      });
    complete(id);
  };
  circuit("workshop", [["a2", "m1"]]);
  lab("ohm", { type: "SET", key: "material", value: 1 });
  lab("ohm", { type: "TEST" });
  lab("ohm", { type: "SET", key: "voltage", value: 3 });
  lab("ohm", { type: "TEST" });
  lab("ohm", { type: "SET", key: "voltage", value: 6 });
  lab("ohm", { type: "TEST" });
  complete("ohm");
  circuit("harbor", [["b2", "n"]]);
  lab("power", { type: "SET", key: "ballast", value: 5 });
  lab("power", { type: "TEST" });
  complete("power");
  lab("junction", { type: "SET", key: "topology", value: 1 });
  lab("junction", { type: "TEST" });
  lab("junction", { type: "SET", key: "branch", value: 0 });
  lab("junction", { type: "TEST" });
  complete("junction");
  lab("storage", { type: "TEST" });
  lab("storage", { type: "SET", key: "topology", value: 1 });
  lab("storage", { type: "TEST" });
  complete("storage");
  lab("timing", { type: "SET", key: "capacitance", value: 40 });
  lab("timing", { type: "STEADY" });
  lab("timing", { type: "OUTAGE" });
  lab("timing", { type: "ADVANCE", seconds: 1 });
  lab("timing", { type: "ADVANCE", seconds: 1 });
  complete("timing");
  circuit("beacon", [
    ["p", "a1"],
    ["a2", "n"],
    ["p", "b1"],
    ["b2", "n"],
  ]);
  return { snapshots, complete: state };
}
