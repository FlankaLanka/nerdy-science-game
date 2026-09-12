import * as THREE from "three";
import { HARBOR_SIGN as S } from "./islandLayout.ts";

/** A solid board with its support entirely behind the painted front face. */
export function buildSignpost(
  wood: THREE.Material,
  face: THREE.Material,
  floor: number,
) {
  const root = new THREE.Group();
  root.name = "Harbor sign";
  root.position.set(S.x, floor, S.z);
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(S.width, S.height, S.depth),
    [wood, wood, wood, wood, face, wood],
  );
  board.name = "harbor sign board";
  board.position.y = S.centerHeight;
  const postTop = S.centerHeight + S.height / 2 - 0.04;
  const post = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, postTop + 0.2, 0.14),
    wood,
  );
  post.name = "harbor sign support";
  post.position.set(0, (postTop - 0.2) / 2, -S.depth / 2 - 0.07);
  for (const mesh of [board, post]) {
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
  }
  return root;
}
