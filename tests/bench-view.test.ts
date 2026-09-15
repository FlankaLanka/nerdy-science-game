import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  BENCH_HEIGHT,
  KIT_SCALE,
  benchFraming,
  benchWorldPoint,
} from "../src/scene/benchView.ts";

for (const [width, height] of [
  [1280, 720],
  [390, 844],
  [844, 390],
  [1920, 1080],
]) {
  test(`overhead projection and pointer rays agree at ${width} × ${height}`, () => {
    const framing = benchFraming(width, height);
    const bench = { x: -10, z: 19 };
    const camera = new THREE.PerspectiveCamera(
      framing.fov,
      width / height,
      0.08,
      650,
    );
    camera.position.set(bench.x, BENCH_HEIGHT + framing.distance, bench.z);
    camera.rotation.set(-Math.PI / 2, 0, 0);
    camera.setViewOffset(
      width,
      height,
      framing.offsetX,
      framing.offsetY,
      width,
      height,
    );
    camera.updateMatrixWorld();
    assert.ok(
      camera.position.y < 3.2,
      "stay below the room ceiling, including on phones",
    );
    assert.ok(framing.left >= 0 && framing.top >= 0);
    assert.ok(framing.left + framing.width <= width);
    assert.ok(framing.top + framing.height <= height - (height <= 480 && width > 640 ? 20 : 170));
    if (width >= 1280) assert.ok(framing.width > width * 0.59, "the bench dominates the activity view");
    for (const point of [
      { x: 0, y: 0 },
      { x: 900, y: 500 },
      { x: 250, y: 189 },
    ]) {
      const world = benchWorldPoint(bench, point);
      const projected = world.clone().project(camera);
      const x = ((projected.x + 1) * width) / 2;
      const y = ((1 - projected.y) * height) / 2;
      assert.ok(
        Math.abs(x - (framing.left + (point.x / 900) * framing.width)) < 1e-8,
      );
      assert.ok(
        Math.abs(y - (framing.top + (point.y / 500) * framing.height)) < 1e-8,
      );
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(projected.x, projected.y), camera);
      const hit = ray.ray.intersectPlane(
        new THREE.Plane(new THREE.Vector3(0, 1, 0), -BENCH_HEIGHT),
        new THREE.Vector3(),
      )!;
      assert.ok(Math.abs((hit.x - bench.x) / KIT_SCALE + 450 - point.x) < 1e-8);
      assert.ok(Math.abs((hit.z - bench.z) / KIT_SCALE + 250 - point.y) < 1e-8);
    }
  });
}
