import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { buildWorkshop } from "../src/scene/workshop.ts";
import { WORKSHOP as W } from "../src/scene/workshopLayout.ts";
import {
  canWalk,
  groundHeight,
  movePlayer,
  terrainHeight,
  workshopFloorHeight,
} from "../src/scene/navigation.ts";
import type { Player } from "../src/scene/navigation.ts";

function house() {
  const material = new THREE.MeshBasicMaterial();
  const model = buildWorkshop(workshopFloorHeight(), {
    wood: material,
    stone: material,
    plaster: material,
    roof: material,
    iron: material,
  });
  model.root.updateMatrixWorld(true);
  return model;
}

test("both gables close the space above the walls from inside and outside", () => {
  const { root } = house(),
    floor = workshopFloorHeight();
  for (const side of [-1, 1]) {
    const gable = root.getObjectByName(
      side > 0 ? "front gable" : "rear gable",
    )!;
    for (const x of [-4, -3, -1, 0, 1, 3, 4]) {
      const y =
        floor +
        W.wallHeight +
        W.roofRise * (1 - Math.abs(x) / (W.width / 2)) * 0.65;
      const inside = new THREE.Raycaster(
        new THREE.Vector3(W.x + x, y, W.z),
        new THREE.Vector3(0, 0, side),
      );
      const outside = new THREE.Raycaster(
        new THREE.Vector3(W.x + x, y, W.z + side * 6),
        new THREE.Vector3(0, 0, -side),
      );
      assert.ok(
        inside.intersectObject(gable).length,
        `inside gable ${side} at ${x}`,
      );
      assert.ok(
        outside.intersectObject(gable).length,
        `outside gable ${side} at ${x}`,
      );
    }
  }
});

test("roof panels have a continuous underside including their ridge joint", () => {
  const { root } = house(),
    floor = workshopFloorHeight();
  const panels = [
    root.getObjectByName("roof -1")!,
    root.getObjectByName("roof 1")!,
    root.getObjectByName("chimney")!,
  ];
  for (const x of [-4.4, -3.35, -3, -2.65, -1, -0.02, 0, 0.02, 1, 3, 4.4])
    for (const z of [-3.5, -2, -1.5, 0, 2, 3.5]) {
      const ray = new THREE.Raycaster(
        new THREE.Vector3(W.x + x, floor + 1.68, W.z + z),
        new THREE.Vector3(0, 1, 0),
      );
      const hit = ray.intersectObjects(panels)[0];
      assert.ok(hit, `roof gap at ${x}, ${z}`);
      assert.match(
        hit.object.name,
        /^roof /,
        `chimney protrudes into ceiling at ${x}, ${z}`,
      );
    }
});

test("the slab reaches every wall and camera height follows the floor and porch", () => {
  const { root } = house();
  const surfaces = [
    root.getObjectByName("workshop floor")!,
    root.getObjectByName("porch floor")!,
  ];
  for (const x of [-4.6, 0, 4.6])
    for (const z of [-3.6, 0, 3.4, 5.8]) {
      const px = W.x + x,
        pz = W.z + z;
      const hit = new THREE.Raycaster(
        new THREE.Vector3(px, 20, pz),
        new THREE.Vector3(0, -1, 0),
      ).intersectObjects(surfaces)[0];
      assert.ok(hit, `missing floor at ${x}, ${z}`);
      assert.ok(Math.abs(groundHeight(px, pz) - hit.point.y) < 1e-6);
      const base = new THREE.Box3().setFromObject(hit.object).min.y;
      assert.ok(
        base < terrainHeight(px, pz),
        `foundation floats above terrain at ${x}, ${z}`,
      );
    }
});

test("the hillside stays below the workshop slab and its surrounding terrain cells", () => {
  const floor = workshopFloorHeight();
  for (let x = W.x - W.width / 2 - 0.9; x <= W.x + W.width / 2 + 0.9; x += 0.25)
    for (
      let z = W.z - W.depth / 2 - 0.75;
      z <= W.z + W.depth / 2 + W.porchDepth + 0.45;
      z += 0.25
    ) {
      assert.ok(
        terrainHeight(x, z) < floor,
        `terrain protrudes through floor at ${x}, ${z}`,
      );
    }
});

test("the doorway and glazed windows are real openings, with matching walking collision", () => {
  const { root, obstacles } = house(),
    floor = workshopFloorHeight();
  const front = root.getObjectByName("front wall with openings")!;
  for (const x of [-2.85, 0, 2.85]) {
    const ray = new THREE.Raycaster(
      new THREE.Vector3(W.x + x, floor + 1.8, 5),
      new THREE.Vector3(0, 0, -1),
    );
    assert.equal(ray.intersectObject(front).length, 0);
  }
  assert.equal(canWalk(W.x, W.z + W.depth / 2, obstacles), true);
  assert.equal(canWalk(W.x + 3, W.z + W.depth / 2, obstacles), false);
  let player: Player = { x: W.x, z: 4, yaw: 0, pitch: 0 };
  for (let i = 0; i < 12; i++)
    player = movePlayer(player, 0, 1, 0.1, false, obstacles);
  assert.ok(player.z < 1, "the player can enter through the doorway");
});
