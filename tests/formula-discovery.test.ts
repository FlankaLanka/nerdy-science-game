import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { CHAMBERS } from "../src/chambers.ts";
import { campaignReducer, initialCampaign, restoreCampaign, serializeCampaign } from "../src/chamberCampaign.ts";
import { focusedFormula, formulaFraming, formulaScreen, projectFormulaScreen } from "../src/scene/formulaView.ts";
import { chamberFixture } from "./chamber-fixtures.ts";

test("formula discovery requires inspection, persists independently, and resets on a new run", () => {
  const visited = campaignReducer(chamberFixture(3), { type: "VISIT", id: "resist" });
  assert.deepEqual(visited.formulas, []);
  const state = campaignReducer(initialCampaign(), { type: "DISCOVER_FORMULA", id: "ohm" });
  assert.deepEqual(state.formulas, ["ohm"]);
  assert.deepEqual(state.visited, []);
  assert.ok(state.proofs.every(p => p === null));
  assert.equal(campaignReducer(state, { type: "DISCOVER_FORMULA", id: "ohm" }), state);
  assert.deepEqual(restoreCampaign(serializeCampaign(state)).formulas, ["ohm"]);
  assert.deepEqual(campaignReducer(state, { type: "NEW_GAME" }).formulas, []);
});

test("older saves and malformed discoveries never unlock formulas from room visits", () => {
  const old = JSON.parse(serializeCampaign(chamberFixture(6)));
  delete old.formulas;
  assert.deepEqual(restoreCampaign(JSON.stringify(old)).formulas, []);
  for (const formulas of [null, "ohm", {}, ["ohm", "ohm", "unknown", null, "parallel"]]) {
    assert.deepEqual(restoreCampaign(JSON.stringify({ ...old, formulas })).formulas,
      Array.isArray(formulas) ? ["ohm", "parallel"] : []);
  }
});

test("formula targeting requires a nearby visible screen in front of the player", () => {
  for (const index of [3, 4, 5]) {
    const s = formulaScreen(CHAMBERS[index]);
    const p = { x: s.x - 2.5, z: s.z, yaw: -Math.PI / 2, pitch: 0.1 };
    assert.equal(focusedFormula(p, []), index);
    assert.equal(focusedFormula({ ...p, x: s.x - 4 }, []), null);
    assert.equal(focusedFormula({ ...p, yaw: Math.PI / 2 }, []), null);
    assert.equal(focusedFormula({ ...p, pitch: 1 }, []), null);
    assert.equal(focusedFormula({ ...p, z: s.z - 2 }, []), null);
    assert.equal(focusedFormula(p, [{ x: s.x - 1, z: s.z, width: 0.2, depth: 2 }]), null);
  }
});

for (const [width, height] of [[1280, 720], [390, 844], [320, 568], [844, 390]]) {
  test(`the whole formula screen fits at ${width} × ${height}`, () => {
    const s = formulaScreen(CHAMBERS[3]);
    const framing = formulaFraming(width, height);
    const camera = new THREE.PerspectiveCamera(framing.fov, width / height, 0.08, 650);
    camera.position.set(s.x - framing.distance, s.y, s.z);
    camera.rotation.set(0, -Math.PI / 2, 0);
    camera.updateMatrixWorld();
    const display = projectFormulaScreen(3, camera, width, height);
    assert.ok(display.left > 0 && display.top > 0);
    assert.ok(display.left + display.width < width && display.top + display.height < height);
    const ray = new THREE.Raycaster();
    for (const [px, py, zSign, ySign] of [[display.left, display.top, -1, 1],
      [display.left + display.width, display.top + display.height, 1, -1]]) {
      ray.setFromCamera(new THREE.Vector2(px / width * 2 - 1, 1 - py / height * 2), camera);
      const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(1, 0, 0), -(s.x - s.displayDepth)), new THREE.Vector3())!;
      assert.ok(Math.abs(hit.y - (s.y + ySign * s.displayHeight / 2)) < 1e-8);
      assert.ok(Math.abs(hit.z - (s.z + zSign * s.displayWidth / 2)) < 1e-8);
    }
    for (const y of [-s.height / 2, s.height / 2]) for (const z of [-s.width / 2, s.width / 2]) {
      const p = new THREE.Vector3(s.x - 0.065, s.y + y, s.z + z).project(camera);
      assert.ok(Math.abs(p.x) < 0.98 && Math.abs(p.y) < 0.75, "screen stays inside the viewport and clear of controls");
    }
  });
}
