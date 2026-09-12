import test from "node:test";
import assert from "node:assert/strict";
import {
  cloneCircuit,
  editCircuit,
  simulate,
  FUSE_CURRENT,
  LEAD_RESISTANCE,
} from "../src/circuitKit.ts";
import { CHAMBERS, isRestored } from "../src/chambers.ts";
import {
  campaignReducer,
  completedIds,
  initialCampaign,
  restoreCampaign,
  serializeCampaign,
  unlockedIndex,
} from "../src/chamberCampaign.ts";
import { chamberFixture, solvedCircuit } from "./chamber-fixtures.ts";
const near = (actual: number, expected: number, tolerance = 1e-6) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`);

test("an open circuit has voltage at its source and no lamp current; closing the path lights it", () => {
  const c = CHAMBERS[0];
  const open = simulate(c.initial);
  assert.equal(open.tripped, false);
  near(open.parts.source.voltage, 6);
  near(open.parts.lamp.current, 0);
  const closed = simulate(solvedCircuit(0));
  near(Math.abs(closed.parts.lamp.current), 6 / (12 + 2 * LEAD_RESISTANCE));
  assert.equal(isRestored(c.id, solvedCircuit(0)), true);
});
test("all six authored chambers have achievable live-circuit goals", () => {
  CHAMBERS.forEach((c, i) => {
    assert.equal(isRestored(c.id, c.initial), false, c.id);
    assert.equal(isRestored(c.id, solvedCircuit(i)), true, c.id);
  });
});
test("Kirchhoff energy balance holds for the resistor circuit", () => {
  const doc = solvedCircuit(3),
    result = simulate(doc);
  near(result.parts.lamp.voltage, 6, 0.002);
  const resistor = doc.parts.find((p) => p.kind === "resistor")!;
  near(result.parts[resistor.id].voltage, result.parts.lamp.voltage);
  const losses = Object.values(result.wires).reduce(
    (sum, i) => sum + i * i * LEAD_RESISTANCE,
    0,
  );
  near(
    result.sourcePower,
    result.parts.lamp.power + result.parts[resistor.id].power + losses,
  );
});
test("series loads share current and voltage drops; parallel loads have independent paths", () => {
  const series = simulate(solvedCircuit(4));
  const lamps = solvedCircuit(4).parts.filter((p) => p.kind === "bulb");
  near(series.parts[lamps[0].id].voltage, 6, 0.002);
  near(
    Math.abs(series.parts[lamps[0].id].current),
    Math.abs(series.parts[lamps[1].id].current),
  );
  const parallel = solvedCircuit(5);
  const b = parallel.parts.find((p) => p.kind === "bulb" && p.id !== "lamp-a")!;
  const live = simulate(parallel);
  near(live.parts[b.id].voltage, 6, 0.003);
  near(live.parts["lamp-a"].voltage, 6, 0.003);
  parallel.parts.find((p) => p.id === "isolator")!.closed = false;
  const isolated = simulate(parallel);
  near(isolated.parts["lamp-a"].current, 0);
  near(isolated.parts[b.id].voltage, 6, 0.003);
});
test("a shared switch cannot falsely pass the independent branch chamber", () => {
  const doc = solvedCircuit(5),
    b = doc.parts.find((p) => p.kind === "bulb" && p.id !== "lamp-a")!;
  doc.wires = doc.wires.map((w) =>
    w.b === `${b.id}:b` ? { ...w, a: "isolator:b" } : w,
  );
  assert.equal(isRestored("branch", doc), false);
  assert.equal(simulate(doc).tripped, false);
});
test("too little or too much resistance does not restore the 6 V lamp", () => {
  for (const value of [6, 24]) {
    const doc = solvedCircuit(3);
    doc.parts.find((p) => p.kind === "resistor")!.value = value;
    assert.equal(isRestored("resist", doc), false);
  }
});
test("short protection recovers immediately after removing the short", () => {
  const doc = solvedCircuit(0);
  doc.wires.push({ id: "short", a: "source:a", b: "source:b" });
  assert.ok(FUSE_CURRENT > 1);
  const shorted = simulate(doc);
  assert.equal(shorted.tripped, true);
  assert.equal(shorted.parts.lamp.power, 0);
  doc.wires.pop();
  assert.equal(simulate(doc).tripped, false);
});
test("source-free disconnected components and dangling branches carry no current", () => {
  const doc = solvedCircuit(2);
  doc.parts.push({
    id: "spare",
    kind: "resistor",
    x: 400,
    y: 150,
    angle: 0,
    value: 10,
  });
  const a = simulate(doc);
  assert.equal(a.tripped, false);
  near(a.parts.spare.current, 0);
  doc.wires.push({ id: "dangling", a: `${doc.parts[0].id}:a`, b: "spare:a" });
  const b = simulate(doc);
  near(b.parts.spare.current, 0);
  near(b.wires.dangling, 0);
});
test("identical and reversed duplicate wires, invalid endpoints and exhausted stock are rejected", () => {
  const c = CHAMBERS[0],
    doc = cloneCircuit(c.initial);
  for (const action of [
    { type: "wire", a: "source:a", b: "lamp:a" },
    { type: "wire", a: "lamp:a", b: "source:a" },
    { type: "wire", a: "source:b", b: "source:b" },
    { type: "wire", a: "unknown:a", b: "lamp:b" },
    { type: "add", kind: "battery", x: 400, y: 200 },
  ] as const)
    assert.equal(editCircuit(doc, action, c), doc);
  assert.equal(
    editCircuit(doc, { type: "move", id: "source", x: 100, y: 100 }, c),
    doc,
  );
});
test("completion is automatic, sequential, and latched across undo and practice", () => {
  let state = initialCampaign();
  assert.equal(
    campaignReducer(state, {
      type: "EDIT",
      room: 1,
      action: { type: "toggle", id: "isolator" },
    }),
    state,
  );
  state = campaignReducer(state, {
    type: "EDIT",
    room: 0,
    action: { type: "wire", a: "source:b", b: "lamp:b" },
  });
  assert.deepEqual(completedIds(state), ["wake"]);
  assert.equal(unlockedIndex(state), 1);
  state = campaignReducer(state, { type: "UNDO", room: 0 });
  assert.equal(isRestored("wake", state.rooms[0]), false);
  assert.deepEqual(completedIds(state), ["wake"]);
  assert.deepEqual(completedIds(restoreCampaign(serializeCampaign(state))), [
    "wake",
  ]);
});
test("saving preserves completed circuits and rejects forged or out-of-order unlocks", () => {
  const full = chamberFixture(6);
  assert.equal(unlockedIndex(restoreCampaign(serializeCampaign(full))), 6);
  const forged = chamberFixture(6);
  forged.proofs[2] = CHAMBERS[2].initial;
  assert.equal(unlockedIndex(restoreCampaign(serializeCampaign(forged))), 2);
  const outOfOrder = initialCampaign();
  outOfOrder.proofs[5] = solvedCircuit(5);
  assert.equal(
    unlockedIndex(restoreCampaign(serializeCampaign(outOfOrder))),
    0,
  );
});
test("save sanitization rejects malformed parts and recovers without crashing", () => {
  for (const raw of ["null", "{}", "invalid", "[]"])
    assert.equal(unlockedIndex(restoreCampaign(raw)), 0);
  const state = chamberFixture(2);
  state.rooms[2] = {
    parts: [
      { id: "bad", kind: "battery", x: NaN, y: Infinity, angle: 0, value: 999 },
    ],
    wires: [{ id: "badwire", a: "bad:a", b: "unknown:b" }],
    serial: 1,
  };
  const restored = restoreCampaign(serializeCampaign(state));
  assert.equal(restored.rooms[2].parts.length, 0);
  assert.equal(restored.rooms[2].wires.length, 0);
  assert.equal(unlockedIndex(restored), 2);
});
