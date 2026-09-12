import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildSignpost } from "../src/scene/signpost.ts";
import { HARBOR_SIGN as S } from "../src/scene/islandLayout.ts";

test("the harbor support stays behind the solid sign board and cannot cut through its text", () => {
  const wood = new THREE.MeshBasicMaterial(),
    face = new THREE.MeshBasicMaterial();
  const root = buildSignpost(wood, face, 1);
  root.updateMatrixWorld(true);
  const board = root.getObjectByName("harbor sign board")!,
    post = root.getObjectByName("harbor sign support")!;
  const boardBounds = new THREE.Box3().setFromObject(board),
    postBounds = new THREE.Box3().setFromObject(post);
  assert.ok(postBounds.max.z <= boardBounds.min.z + 1e-6);
  for (const x of [-0.05, 0, 0.05]) {
    const hit = new THREE.Raycaster(
      new THREE.Vector3(S.x + x, 1 + S.centerHeight, S.z + 4),
      new THREE.Vector3(0, 0, -1),
    ).intersectObject(root)[0];
    assert.equal(hit.object.name, "harbor sign board");
    assert.equal(hit.face?.materialIndex, 4);
  }
});
