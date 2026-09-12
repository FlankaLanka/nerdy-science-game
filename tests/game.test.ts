import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  initialProgress,
  reducer,
  restoreState,
  updateProgress,
  canFinish,
} from "../src/game.ts";
import type { MissionId, Wire } from "../src/missions.ts";

test("a prediction is required and editing invalidates a stale result and prediction", () => {
  let p = initialProgress();
  assert.equal(updateProgress("workshop", p, { type: "TEST" }), p);
  p = updateProgress("workshop", p, { type: "PREDICT", value: "off" });
  p = updateProgress("workshop", p, { type: "TEST" });
  assert.equal(p.experiments.length, 1);
  assert.equal(p.experiments[0].matched, true);
  p = updateProgress("workshop", p, { type: "WIRE", wire: ["a2", "m1"] });
  assert.equal(p.prediction, null);
  assert.equal(p.tested, false);
  p = updateProgress("workshop", p, { type: "UNDO" });
  assert.deepEqual(p.wires, []);
});
test("the complete adventure needs real working circuits, a fault experiment, and supported explanations", () => {
  let s = reducer(initialState(), { type: "START" });
  assert.equal(reducer(s, { type: "SEND_DISTRESS" }), s);
  assert.equal(reducer(s, { type: "COMPLETE", id: "beacon", now: 1 }), s);
  const wiring: Record<MissionId, Wire[]> = {
    workshop: [["a2", "m1"]],
    harbor: [["b2", "n"]],
    beacon: [
      ["p", "a1"],
      ["a2", "n"],
      ["p", "b1"],
      ["b2", "n"],
    ],
  };
  for (const id of ["workshop", "harbor", "beacon"] as const) {
    const send = (action: Parameters<typeof updateProgress>[2]) => {
      s = reducer(s, { type: "MISSION", id, action });
    };
    if (id === "workshop") send({ type: "MATERIAL", material: "copper" });
    for (const wire of wiring[id]) send({ type: "WIRE", wire });
    send({ type: "PREDICT", value: id === "workshop" ? "on" : "both" });
    send({ type: "TEST" });
    if (id !== "workshop") {
      assert.equal(s.missions[id].phase, "fault-ready");
      send({ type: "FAULT_PREDICT", value: id === "beacon" ? "stays" : "out" });
      send({ type: "FAULT_TEST" });
    }
    assert.equal(canFinish(id, s.missions[id]), false);
    send({ type: "EXPLAIN", value: id === "beacon" ? "branch" : "loop" });
    s = reducer(s, { type: "COMPLETE", id, now: 1234 });
    assert.ok(s.completed.includes(id));
  }
  assert.equal(s.completed.length, 3);
  assert.equal(s.finishedAt, 1234);
  assert.equal(s.distressSent, false);
  s = reducer(s, { type: "SEND_DISTRESS" });
  assert.equal(s.distressSent, true);
  const restored = restoreState(JSON.stringify(s));
  assert.deepEqual(restored.completed, s.completed);
  assert.equal(restored.finishedAt, 1234);
  assert.equal(restored.distressSent, true);
  assert.equal(
    restoreState(JSON.stringify({ ...initialState(), distressSent: true }))
      .distressSent,
    false,
  );
});
test("series wiring at the beacon fails the backup test and can be revised without losing evidence", () => {
  let p = initialProgress();
  for (const wire of [
    ["p", "a1"],
    ["a2", "b1"],
    ["b2", "n"],
  ] as Wire[])
    p = updateProgress("beacon", p, { type: "WIRE", wire });
  p = updateProgress("beacon", p, { type: "PREDICT", value: "both" });
  p = updateProgress("beacon", p, { type: "TEST" });
  p = updateProgress("beacon", p, { type: "FAULT_PREDICT", value: "stays" });
  p = updateProgress("beacon", p, { type: "FAULT_TEST" });
  assert.equal(p.experiments[1].matched, false);
  assert.equal(p.experiments[1].outcome, "out");
  p = updateProgress("beacon", p, { type: "EXPLAIN", value: "branch" });
  assert.equal(canFinish("beacon", p), false);
  p = updateProgress("beacon", p, { type: "REVISE" });
  assert.equal(p.phase, "build");
  assert.equal(p.experiments.length, 2);
  assert.equal(p.prediction, null);
});
test("wrong first explanation is retained even after correction", () => {
  let p = {
    ...initialProgress(),
    material: "copper" as const,
    wires: [["a2", "m1"]] as Wire[],
  };
  p = updateProgress("workshop", p, {
    type: "PREDICT",
    value: "on",
  }) as typeof p;
  p = updateProgress("workshop", p, { type: "TEST" }) as typeof p;
  p = updateProgress("workshop", p, {
    type: "EXPLAIN",
    value: "one",
  }) as typeof p;
  p = updateProgress("workshop", p, {
    type: "EXPLAIN",
    value: "loop",
  }) as typeof p;
  assert.equal(p.firstExplanation, "one");
  assert.equal(p.explanation, "loop");
  assert.ok(canFinish("workshop", p));
});
test("hints are attributed to each prediction attempt and history is immutable", () => {
  let p = updateProgress("workshop", initialProgress(), { type: "HINT" });
  p = updateProgress("workshop", p, { type: "PREDICT", value: "off" });
  p = updateProgress("workshop", p, { type: "TEST" });
  p = updateProgress("workshop", p, { type: "WIRE", wire: ["a2", "m1"] });
  assert.equal(p.experiments[0].hints, 1);
  assert.deepEqual(p.experiments[0].wires, []);
});
test("malformed saves cannot unlock future repairs or preserve invented outcomes", () => {
  assert.deepEqual(restoreState("nope"), initialState());
  const s = initialState();
  s.started = true;
  s.completed = ["beacon"];
  s.missions.beacon.phase = "complete";
  s.missions.beacon.explanation = "branch";
  const r = restoreState(JSON.stringify(s));
  assert.deepEqual(r.completed, []);
  assert.equal(r.missions.beacon.phase, "build");
  const poisoned = {
    ...s,
    missions: {
      workshop: {
        ...initialProgress(),
        experiments: [
          {
            type: "circuit",
            wires: [],
            material: "polymer",
            prediction: "on",
            outcome: "on",
            matched: true,
          },
        ],
      },
    },
  };
  assert.equal(
    restoreState(JSON.stringify(poisoned)).missions.workshop.experiments[0]
      .matched,
    false,
  );
});
test("fault prediction and wires survive reload while unfinished", () => {
  let s = reducer(initialState(), { type: "START" });
  let p = initialProgress();
  p.wires = [["a2", "m1"]];
  p.material = "copper";
  p.phase = "reflect";
  p.explanation = "loop";
  p.firstExplanation = "loop";
  s.missions.workshop = p;
  s = reducer(s, { type: "COMPLETE", id: "workshop", now: 1 });
  s.missions.harbor = {
    ...initialProgress(),
    wires: [["b2", "n"]],
    phase: "fault-ready",
    prediction: "both",
    faultPrediction: "stays",
    tested: true,
  };
  const r = restoreState(JSON.stringify(s));
  assert.equal(r.missions.harbor.phase, "fault-ready");
  assert.equal(r.missions.harbor.faultPrediction, "stays");
  assert.deepEqual(r.missions.harbor.wires, [["b2", "n"]]);
});
