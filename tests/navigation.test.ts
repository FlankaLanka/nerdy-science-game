import assert from "node:assert/strict";
import test from "node:test";
import {
  canWalk,
  focusedSite,
  movePlayer,
  restorePlayer,
  SPAWN,
  SITES,
} from "../src/scene/navigation.ts";
import { PORTALS, progressionStageAt } from "../src/scene/shipLayout.ts";
import type { Obstacle } from "../src/scene/navigation.ts";
test("movement follows the camera and diagonal speed is normalized", () => {
  const f = movePlayer(SPAWN, 0, 1, 0.1, false, []),
    d = movePlayer(SPAWN, 1, 1, 0.1, false, []);
  assert.ok(f.z < SPAWN.z);
  assert.ok(Math.abs(Math.hypot(d.x - SPAWN.x, d.z - SPAWN.z) - 0.35) < 1e-8);
  assert.ok(
    movePlayer({ ...SPAWN, yaw: -Math.PI / 2 }, 0, 1, 0.1, false, []).x >
      SPAWN.x,
  );
});
test("thin walls stop sprinting without preventing sliding", () => {
  const wall: Obstacle[] = [{ x: -10, z: 20, width: 4, depth: 0.1 }];
  let p = { ...SPAWN };
  for (let i = 0; i < 30; i++) p = movePlayer(p, 0, 1, 0.1, true, wall);
  assert.ok(p.z >= 20.35);
  const slide = movePlayer(p, 1, 1, 0.1, true, wall);
  assert.ok(slide.x > p.x);
  assert.ok(slide.z >= 20.35);
  assert.ok(movePlayer(SPAWN, 0, 1, 25, true, wall).z >= 20.35);
});
test("authored chamber links remain traversable and the hull stays sealed", () => {
  for (const p of PORTALS) assert.equal(canWalk(p.x, p.z, []), true, p.system);
  for (const site of Object.values(SITES))
    assert.equal(canWalk(site.x, site.z + 2, []), true);
  for (const [x, z] of [
    [45, 0],
    [0, 26],
    [0, 10],
    [-16, 20],
    [16, 6],
  ])
    assert.equal(canWalk(x, z, []), false);
  for (let z = -8; z <= 24; z += 0.1) assert.equal(canWalk(-10, z, []), true);
  for (let x = -10; x <= 10; x += 0.1) assert.equal(canWalk(x, -8, []), true);
  for (let z = -8; z <= 34; z += 0.1) assert.equal(canWalk(10, z, []), true);
});
test("using a bench requires proximity, facing it and a clear approach", () => {
  const p = { x: -10, z: 21.5, yaw: 0, pitch: 0 };
  assert.equal(focusedSite(SPAWN, []), null);
  assert.equal(focusedSite(p, []), "wake");
  assert.equal(focusedSite({ ...p, yaw: Math.PI }, []), null);
  assert.equal(focusedSite({ ...p, pitch: 1 }, []), null);
  assert.equal(
    focusedSite(p, [{ x: -10, z: 20.4, width: 4, depth: 0.3 }]),
    null,
  );
});
test("player saves reject corrupt data and positions outside the hull or inside furniture", () => {
  const p = { x: -8, z: 20, yaw: 2, pitch: 0.1 };
  assert.deepEqual(restorePlayer(JSON.stringify(p), []), p);
  for (const raw of [
    "invalid",
    "null",
    JSON.stringify({ ...p, x: 500 }),
    JSON.stringify({ ...p, x: null }),
  ])
    assert.deepEqual(restorePlayer(raw, []), SPAWN);
  assert.deepEqual(
    restorePlayer(JSON.stringify(p), [{ x: -8, z: 20, radius: 1 }]),
    SPAWN,
  );
});

test("saved corridor positions respect both sides of each gate", () => {
  assert.equal(progressionStageAt(-10, 14), 0);
  assert.equal(progressionStageAt(-10, 12), 1);
  assert.equal(progressionStageAt(-1, -8), 2);
  assert.equal(progressionStageAt(1, -8), 3);
  assert.equal(progressionStageAt(10, -2), 3);
  assert.equal(progressionStageAt(10, 0), 4);
  assert.equal(progressionStageAt(10, 31), 6);
});
