import assert from "node:assert/strict";
import test from "node:test";
import { spatialMix } from "../src/soundscape.ts";

test("machinery pans with the listener and falls silent across distant rooms", () => {
  const listener = { x: 0, z: 0, yaw: 0 };
  assert.equal(spatialMix({ x: 2, z: 0 }, listener).pan, .85);
  assert.equal(spatialMix({ x: -2, z: 0 }, listener).pan, -.85);
  assert.equal(spatialMix({ x: 0, z: -2 }, listener).pan, 0);
  assert.ok(spatialMix({ x: 2, z: 0 }, { ...listener, yaw: Math.PI }).pan < -.8);
  assert.ok(spatialMix({ x: 0, z: -2 }, { ...listener, yaw: Math.PI / 2 }).pan > .8);
  assert.equal(spatialMix(listener, listener).gain, 1);
  assert.equal(spatialMix({ x: 16, z: 0 }, listener).gain, 0);
  assert.ok(spatialMix({ x: 9, z: 0 }, listener).gain < .3);
});
