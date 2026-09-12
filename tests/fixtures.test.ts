import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  lampShadeGeometry,
  curvedTowerPlaque,
  towerRadius,
} from "../src/scene/fixtures.ts";
import { buildBoat } from "../src/scene/boat.ts";
import {
  terrainHeight,
  harborDeckHeight,
  groundHeight,
} from "../src/scene/navigation.ts";
import { HARBOR } from "../src/scene/islandLayout.ts";

test("the lamp shade is visible from inside its open bottom", () => {
  const shade = new THREE.Mesh(
    lampShadeGeometry(),
    new THREE.MeshBasicMaterial(),
  );
  shade.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(
    new THREE.Vector3(0.16, -0.2, 0),
    new THREE.Vector3(0, 1, 0),
  );
  assert.ok(ray.intersectObject(shade).length > 0);
});

test("the lighthouse plaque follows the tapered masonry with a solid edge", () => {
  const geometry = curvedTowerPlaque(2.4, 0.52, 3.35);
  const p = geometry.attributes.position;
  const clearances = Array.from(
    { length: p.count },
    (_, i) =>
      p.getZ(i) -
      Math.sqrt(towerRadius(3.35 + p.getY(i)) ** 2 - p.getX(i) ** 2),
  );
  assert.ok(Math.max(...clearances) < 0.038);
  assert.ok(Math.min(...clearances) > -0.018);
  assert.ok(Math.min(...clearances) < 0);
});

test("the boat has an inward-facing dry hull and seats contained by its outline", () => {
  const boat = buildBoat(
    new THREE.MeshBasicMaterial(),
    new THREE.MeshBasicMaterial(),
  );
  boat.position.set(0, 0, 0);
  boat.rotation.set(0, 0, 0);
  boat.updateMatrixWorld(true);
  const hull = boat.getObjectByName("closed boat hull")!;
  for (const [x, z] of [
    [0.6, 0.8],
    [-0.6, -0.8],
    [0, 2.2],
  ]) {
    const hits = new THREE.Raycaster(
      new THREE.Vector3(x, 1, z),
      new THREE.Vector3(0, -1, 0),
    ).intersectObject(hull);
    assert.ok(hits.length > 0);
    assert.ok(hits[0].point.y > -0.3);
    assert.equal(hits[0].face!.materialIndex, 1);
  }
  for (const seat of boat.children.filter((o) => o.name === "boat seat")) {
    const b = new THREE.Box3().setFromObject(seat);
    for (const x of [b.min.x, b.max.x])
      for (const z of [b.min.z, b.max.z])
        assert.ok((x / 1.2) ** 2 + (z / 3.1) ** 2 < 1);
  }
});

test("the jetty and boarding ramp stay above the terrain with continuous walking height", () => {
  for (let x = HARBOR.approach; x <= HARBOR.end; x += 0.25)
    for (
      let z = HARBOR.z - HARBOR.width / 2;
      z <= HARBOR.z + HARBOR.width / 2;
      z += 0.25
    ) {
      assert.ok(harborDeckHeight(x) - terrainHeight(x, z) > 0.15);
      assert.ok(Math.abs(groundHeight(x, z) - harborDeckHeight(x)) < 1e-9);
    }
  assert.ok(
    Math.abs(harborDeckHeight(HARBOR.start - 0.155) - HARBOR.floor) < 1e-9,
  );
});
