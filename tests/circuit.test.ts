import { test } from "node:test";
import assert from "node:assert/strict";
import { solveCircuit, sanitizeWires } from "../src/circuit.ts";
import type { Wire } from "../src/missions.ts";

const parallel: Wire[] = [
  ["p", "a1"],
  ["a2", "n"],
  ["p", "b1"],
  ["b2", "n"],
];
const series: Wire[] = [
  ["p", "a1"],
  ["a2", "b1"],
  ["b2", "n"],
];

test("a complete copper path powers the workshop lamp; polymer and glass do not", () => {
  const wires: Wire[] = [["a2", "m1"]];
  const copper = solveCircuit("workshop", wires, "copper");
  assert.equal(copper.lamps.a.power, 3);
  assert.equal(copper.bridgeActive, true);
  for (const material of ["polymer", "glass"] as const)
    assert.equal(solveCircuit("workshop", wires, material).count, 0);
  assert.equal(solveCircuit("workshop", [], "copper").count, 0);
});
test("a valid wire bypass around an insulator remains a real circuit", () => {
  const result = solveCircuit("workshop", [["a2", "n"]], "polymer");
  assert.equal(result.count, 1);
  assert.equal(result.bridgeActive, false);
});
test("equal series lamps share voltage and each receives one quarter of the single-lamp power", () => {
  const r = solveCircuit("beacon", series);
  assert.equal(r.lamps.a.voltage, 3);
  assert.equal(r.lamps.b.voltage, 3);
  assert.equal(r.lamps.a.power, 0.75);
  assert.equal(r.lamps.b.power, 0.75);
});
test("parallel lamps each receive the full source voltage", () => {
  const r = solveCircuit("beacon", parallel);
  assert.equal(r.lamps.a.power, 3);
  assert.equal(r.lamps.b.power, 3);
});
test("removing A extinguishes the series circuit while parallel B stays at full power", () => {
  assert.equal(solveCircuit("beacon", series, "copper", "a").count, 0);
  const r = solveCircuit("beacon", parallel, "copper", "a");
  assert.equal(r.lamps.a.on, false);
  assert.equal(r.lamps.b.power, 3);
  assert.deepEqual(r.activeWires.sort(), ["b1:p", "b2:n"]);
});
test("a direct source short trips the virtual fuse and no lamp falsely lights", () => {
  const r = solveCircuit("beacon", [...parallel, ["p", "n"]]);
  assert.equal(r.short, true);
  assert.equal(r.count, 0);
  assert.deepEqual(r.activeWires, []);
});
test("a bypassed lamp has zero voltage while the other lamp can operate", () => {
  const r = solveCircuit("beacon", [...series, ["a1", "a2"]]);
  assert.equal(r.short, false);
  assert.equal(r.lamps.a.power, 0);
  assert.equal(r.lamps.b.power, 3);
});
test("a disconnected circuit or one-ended connection cannot create energy", () => {
  for (const wires of [
    [],
    [["p", "a1"]],
    [
      ["a1", "b1"],
      ["a2", "b2"],
    ],
    [
      ["p", "a1"],
      ["a2", "b1"],
    ],
  ] as Wire[][]) {
    const r = solveCircuit("beacon", wires);
    assert.equal(r.count, 0);
    for (const lamp of Object.values(r.lamps))
      assert.ok(Number.isFinite(lamp.power));
  }
});
test("wire order, orientation, and duplicate input do not alter the result", () => {
  const reversed = parallel.map(([a, b]) => [b, a] as Wire).reverse();
  assert.deepEqual(
    solveCircuit("beacon", parallel).lamps,
    solveCircuit("beacon", [...reversed, ...parallel]).lamps,
  );
});
test("unknown, fixed, duplicate, malformed, and self connections are discarded", () => {
  assert.deepEqual(
    sanitizeWires("workshop", [
      ["p", "a1"],
      ["n", "n"],
      ["x", "p"],
      ["a2", "m1"],
      ["m1", "a2"],
      null,
      ["p"],
      42,
    ]),
    [["a2", "m1"]],
  );
});
