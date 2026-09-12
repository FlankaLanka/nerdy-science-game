import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { projectWaypoint } from "../src/scene/waypoint.ts";

function camera() {
  const camera = new THREE.PerspectiveCamera(68, 1280 / 720, 0.08, 650);
  camera.position.set(0, 1.68, 10);
  camera.updateMatrixWorld();
  return camera;
}
test("waypoint coordinates follow the current camera pose with no cached position", () => {
  const c = camera(),
    target = new THREE.Vector3(0, 2.45, 0);
  let previous = projectWaypoint(c, target, 1280, 720, 10, true);
  assert.equal(previous.x, 640);
  for (let i = 1; i <= 10; i++) {
    c.rotation.y = i * 0.03;
    c.updateMatrixWorld();
    const next = projectWaypoint(c, target, 1280, 720, 10, true);
    assert.ok(next.visible);
    assert.ok(next.x > previous.x);
    const doubled = projectWaypoint(c, target, 2560, 1440, 10, true);
    assert.equal(doubled.x, next.x * 2);
    assert.equal(doubled.y, next.y * 2);
    previous = next;
  }
});
test("behind-camera, nearby and disabled destinations are hidden", () => {
  const c = camera();
  assert.equal(
    projectWaypoint(c, new THREE.Vector3(0, 2, 20), 1280, 720, 10, true)
      .visible,
    false,
  );
  assert.equal(
    projectWaypoint(c, new THREE.Vector3(0, 2, 0), 1280, 720, 2, true).visible,
    false,
  );
  assert.equal(
    projectWaypoint(c, new THREE.Vector3(0, 2, 0), 1280, 720, 10, false)
      .visible,
    false,
  );
});
