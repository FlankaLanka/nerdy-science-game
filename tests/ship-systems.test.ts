import assert from "node:assert/strict";
import test from "node:test";
import { bulkheadAccess, systemStatus } from "../src/shipSystems.ts";
import { initialProgress, updateProgress } from "../src/game.ts";

test("upstream repairs release the correct bulkhead without releasing the next", () => {
  assert.equal(bulkheadAccess(0, [], 10, 5.5), false);
  assert.equal(bulkheadAccess(0, ["workshop"], 10, 5.5), true);
  assert.equal(bulkheadAccess(1, ["workshop"], -8, -12), false);
  assert.equal(bulkheadAccess(1, ["workshop", "harbor"], -8, -12), true);
  assert.equal(systemStatus("workshop", []), "FAULT");
  assert.equal(systemStatus("harbor", []), "NO FEED");
  assert.equal(systemStatus("harbor", ["workshop"]), "FAULT");
  assert.equal(
    systemStatus("beacon", ["workshop", "harbor", "beacon"]),
    "ONLINE",
  );
});

test("old saves beyond a sealed door can retreat and saved capsules in its aperture are protected", () => {
  for (const [i, z] of [5.5, -12].entries()) {
    assert.equal(bulkheadAccess(i, [], z - 3, z), true);
    assert.equal(bulkheadAccess(i, [], z, z, true), true);
    assert.equal(bulkheadAccess(i, [], z + 0.5, z, true), true);
    assert.equal(bulkheadAccess(i, [], z + 0.5, z), false);
    assert.equal(bulkheadAccess(i, [], z + 1, z), false);
  }
});

test("undo after a tested wiring edit restores the previous circuit and clears stale observations", () => {
  let p = updateProgress("workshop", initialProgress(), {
    type: "WIRE",
    wire: ["a2", "m1"],
  });
  p = updateProgress("workshop", p, { type: "MATERIAL", material: "glass" });
  p = updateProgress("workshop", p, { type: "PREDICT", value: "on" });
  p = updateProgress("workshop", p, { type: "TEST" });
  assert.equal(p.tested, true);
  const originalEvidence = p.experiments;
  p = updateProgress("workshop", p, { type: "UNDO" });
  assert.equal(p.material, "polymer");
  assert.equal(p.tested, false);
  assert.equal(p.prediction, null);
  assert.equal(p.explanation, null);
  assert.deepEqual(p.experiments, originalEvidence);
});
