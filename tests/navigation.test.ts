import assert from "node:assert/strict";
import test from "node:test";
import {
  canWalk,
  focusedSite,
  groundHeight,
  movePlayer,
  restorePlayer,
  SPAWN,
  terrainHeight,
} from "../src/scene/navigation.ts";
import type { Obstacle } from "../src/scene/navigation.ts";

test("first-person movement follows camera heading and normalizes diagonal speed", () => {
  const forward = movePlayer(SPAWN, 0, 1, 0.1, false, []);
  const diagonal = movePlayer(SPAWN, 1, 1, 0.1, false, []);
  assert.ok(forward.z < SPAWN.z);
  assert.ok(
    Math.abs(Math.hypot(diagonal.x - SPAWN.x, diagonal.z - SPAWN.z) - 0.35) <
      1e-8,
  );
  const east = movePlayer(
    { ...SPAWN, yaw: -Math.PI / 2 },
    0,
    1,
    0.1,
    false,
    [],
  );
  assert.ok(east.x > SPAWN.x);
  assert.ok(Math.abs(east.z - SPAWN.z) < 1e-8);
});

test("walls block walking and sprinting, allow sliding, and cannot be tunnelled through", () => {
  const wall: Obstacle[] = [{ x: -3, z: 14.8, width: 4, depth: 0.1 }];
  let p = { ...SPAWN };
  for (let i = 0; i < 20; i++) p = movePlayer(p, 0, 1, 0.1, true, wall);
  assert.ok(p.z >= 15.15);
  const slide = movePlayer(p, 1, 1, 0.1, true, wall);
  assert.ok(slide.x > p.x);
  assert.ok(slide.z >= 15.15);
  const lagged = movePlayer(SPAWN, 0, 1, 25, true, wall);
  assert.ok(lagged.z >= 15.15);
});

test("water is out of bounds while the jetty remains walkable above it", () => {
  assert.equal(canWalk(45, 0, []), false);
  assert.equal(canWalk(0, 36, []), false);
  assert.equal(canWalk(32, 14, []), true);
  assert.ok(groundHeight(32, 14) > terrainHeight(32, 14));
  assert.equal(canWalk(32, 18, []), false);
});

test("a repair requires proximity, looking at the cabinet, and an unobstructed approach", () => {
  const p = { x: -3, z: 5.7, yaw: 0, pitch: 0 };
  assert.equal(focusedSite(SPAWN, []), null);
  assert.equal(focusedSite(p, []), "workshop");
  assert.equal(focusedSite({ ...p, yaw: Math.PI }, []), null);
  assert.equal(focusedSite({ ...p, pitch: 1 }, []), null);
  assert.equal(focusedSite(p, [{ x: -3, z: 4.6, width: 4, depth: 0.3 }]), null);
  assert.equal(
    focusedSite({ ...p, z: 2.04, yaw: Math.PI }, [
      { x: -3, z: 2.5, width: 3, depth: 0.3 },
      { x: -3, z: 3.2, width: 1.05, depth: 0.6 },
    ]),
    null,
  );
});

test("player saves resume safely and reject sea, obstacles, and malformed values", () => {
  const p = { x: 2, z: 10, yaw: 2, pitch: 0.1 };
  assert.deepEqual(restorePlayer(JSON.stringify(p), []), p);
  for (const raw of [
    "invalid",
    "null",
    '{"x":null,"z":0,"yaw":0,"pitch":0}',
    JSON.stringify({ ...p, x: 500 }),
  ])
    assert.deepEqual(restorePlayer(raw, []), SPAWN);
  assert.deepEqual(
    restorePlayer(JSON.stringify(p), [{ x: 2, z: 10, radius: 1 }]),
    SPAWN,
  );
});
