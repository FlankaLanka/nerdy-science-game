import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultConfig,
  measure,
  rcAt,
  initialLab,
  updateLab,
  labReady,
  restoreLab,
} from "../src/labPhysics.ts";
import { initialState, reducer, restoreState } from "../src/campaign.ts";
import { available, ACTIVITY_IDS } from "../src/activities.ts";
import { campaignFixtures } from "./fixtures.ts";
const near = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-8, `${a} ≠ ${b}`);
test("resistivity uses SI units; geometry scales resistance independently of voltage", () => {
  const c = { ...defaultConfig(), material: 1 };
  near(measure("ohm", c).resistance, 12);
  near(measure("ohm", c).current, 0.5);
  near(measure("ohm", { ...c, length: 2.4 }).resistance, 24);
  near(measure("ohm", { ...c, area: 0.22 }).resistance, 6);
  near(measure("ohm", { ...c, voltage: 12 }).current, 1);
  assert.equal(measure("ohm", { ...c, material: 0 }).fuse, true);
  near(measure("ohm", { ...c, material: 2 }).current, 0);
});
test("pump power and KVL include internal source losses", () => {
  const c = { ...defaultConfig(), ballast: 5 };
  const r = measure("power", c);
  near(r.current, 1);
  near(r.vb, 6);
  near(r.va, 5);
  near(r.loss, 1);
  near(r.loss + r.current * r.va + r.power, r.sourcePower);
  near(r.vb + r.va + r.current * c.internal, 12);
  near(measure("power", { ...c, internal: 0, ballast: 6 }).vb, 6);
});
test("junction conservation, equivalent resistance and isolation respond to topology", () => {
  const c = { ...defaultConfig(), topology: 1 };
  const r = measure("junction", c);
  near(r.current, r.ia + r.ib);
  near(r.current, 1.5);
  near(r.resistance, 8);
  near(measure("junction", { ...c, branch: 0 }).vb, 12);
  for (const topology of [1, 2]) {
    const isolated = measure("junction", { ...c, topology, branch: 0 });
    near(isolated.va, 0);
    near(isolated.ia, 0);
    near(isolated.current, isolated.ib);
  }
  near(measure("junction", { ...c, topology: 0, branch: 0 }).vb, 0);
  assert.ok(measure("junction", { ...c, topology: 2, branch: 0 }).vb < 12);
});
test("unequal series capacitors share charge; parallel ones share voltage and store more energy", () => {
  const c = { ...defaultConfig(), ca: 10, cb: 20 };
  const series = measure("storage", c),
    parallel = measure("storage", { ...c, topology: 1 });
  near(series.capacitance, 1 / 150);
  near(series.va, 8);
  near(series.vb, 4);
  near(series.va * 0.01, series.vb * 0.02);
  near(parallel.capacitance, 0.03);
  near(parallel.va, 12);
  near(parallel.energy, 2.16);
  near(parallel.charge, 0.36);
});
test("RC response is continuous, has correct one-tau limits, energy, and current signs", () => {
  const c = defaultConfig();
  near(rcAt(c, "charge", 0, 0).voltage, 0);
  near(rcAt(c, "discharge", 12, 0).voltage, 12);
  near(rcAt(c, "charge", 0, 1).voltage, 12 * (1 - Math.exp(-1)));
  near(rcAt(c, "discharge", 12, 1).voltage, 12 * Math.exp(-1));
  assert.ok(rcAt(c, "charge", 0, 0.2).current > 0);
  assert.ok(rcAt(c, "discharge", 12, 0.2).current < 0);
  near(rcAt(c, "charge", 0, 100).current, 0);
  const r = rcAt(c, "discharge", 12, 1);
  near(r.energy, 0.5 * 0.01 * r.voltage * r.voltage);
  near(r.charge, 0.01 * r.voltage);
});
test("RC results do not depend on time-step subdivision; a small bank fails and a larger bank holds", () => {
  let p = updateLab("timing", initialLab(), { type: "STEADY" });
  p = updateLab("timing", p, { type: "OUTAGE" });
  let a = p,
    b = p;
  for (let i = 0; i < 2; i++)
    a = updateLab("timing", a, { type: "ADVANCE", seconds: 1 });
  for (let i = 0; i < 20; i++)
    b = updateLab("timing", b, { type: "ADVANCE", seconds: 0.1 });
  near(a.rc.voltage, b.rc.voltage);
  assert.equal(labReady("timing", a), false);
  p = updateLab("timing", p, { type: "SET", key: "capacitance", value: 40 });
  p = updateLab("timing", p, { type: "STEADY" });
  p = updateLab("timing", p, { type: "OUTAGE" });
  for (let i = 0; i < 2; i++)
    p = updateLab("timing", p, { type: "ADVANCE", seconds: 1 });
  assert.ok(labReady("timing", p));
  assert.ok(labReady("timing", restoreLab("timing", p)));
});
test("changing a specimen invalidates the test and requires a controlled voltage comparison", () => {
  let p = updateLab("ohm", initialLab(), {
    type: "SET",
    key: "material",
    value: 1,
  });
  p = updateLab("ohm", p, { type: "TEST" });
  assert.equal(labReady("ohm", p), false);
  p = updateLab("ohm", p, { type: "SET", key: "voltage", value: 3 });
  p = updateLab("ohm", p, { type: "TEST" });
  p = updateLab("ohm", p, { type: "SET", key: "voltage", value: 6 });
  assert.equal(labReady("ohm", p), false);
  p = updateLab("ohm", p, { type: "TEST" });
  assert.ok(labReady("ohm", p));
  p = updateLab("ohm", p, { type: "SET", key: "area", value: 0.22 });
  assert.equal(labReady("ohm", p), false);
});
test("the graph opens two branches, permits early inspection and blocks early commissioning", () => {
  assert.ok(available("ohm", ["workshop"]));
  assert.ok(available("harbor", ["workshop"]));
  assert.equal(available("power", ["workshop", "ohm"]), false);
  let s = reducer(initialState(), { type: "START" });
  s = reducer(s, { type: "LAB", id: "storage", action: { type: "TEST" } });
  assert.equal(s.labs.storage.samples.length, 1);
  assert.deepEqual(reducer(s, { type: "COMPLETE", id: "storage", now: 1 }), s);
});
test("all eight repairs validate and survive reload without prediction or explanation data", () => {
  const { complete } = campaignFixtures();
  assert.equal(complete.completed.length, 8);
  const restored = restoreState(JSON.stringify(complete));
  assert.deepEqual(restored.completed, ACTIVITY_IDS);
  assert.ok(reducer(restored, { type: "SEND_DISTRESS" }).distressSent);
  assert.equal(complete.missions.workshop.prediction, null);
  assert.equal(complete.missions.beacon.explanation, null);
});
test("malformed lab saves cannot forge RC voltage or preserve stale measurements", () => {
  const p = initialLab();
  p.config.capacitance = Infinity;
  p.rc = {
    mode: "discharge",
    voltage: 100,
    time: 2,
    start: 100,
    running: true,
  };
  p.tested = true;
  assert.equal(labReady("timing", restoreLab("timing", p)), false);
  assert.deepEqual(restoreState("bad"), initialState());
  const d = { ...initialState(), completed: ACTIVITY_IDS, distressSent: true };
  assert.deepEqual(restoreState(JSON.stringify(d)).completed, []);
});
test("commissioned lab evidence cannot be changed by subsequent mission actions", () => {
  const { complete } = campaignFixtures();
  assert.equal(
    reducer(complete, { type: "LAB", id: "ohm", action: { type: "RESET" } }),
    complete,
  );
});
