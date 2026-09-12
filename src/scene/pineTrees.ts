import * as THREE from "three";
import { rng } from "./art.ts";
import { TREE_SPOTS } from "./islandLayout.ts";
import { terrainHeight } from "./navigation.ts";
import type { Obstacle } from "./navigation.ts";

/** Clip the shoot to its atlas island; a rectangular crop also samples opaque bark. */
function shootGeometry() {
  const outline = [
    [96, 35],
    [167, 35],
    [230, 83],
    [228, 283],
    [159, 438],
    [124, 438],
    [42, 298],
    [29, 90],
  ];
  const shape = new THREE.Shape(
    outline.map(
      ([x, y]) => new THREE.Vector2((x - 134) / 200, (438 - y) / 403),
    ),
  );
  const geometry = new THREE.ShapeGeometry(shape);
  const p = geometry.attributes.position,
    uv = geometry.attributes.uv;
  for (let i = 0; i < p.count; i++)
    uv.setXY(
      i,
      (p.getX(i) * 200 + 134) / 1024,
      1 - (438 - p.getY(i) * 403) / 1024,
    );
  return geometry;
}

/** Overlapping whorls and paired needle sprays give the crown volume from every side. */
export function buildPineTrees(
  wood: THREE.Material,
  manager?: THREE.LoadingManager,
) {
  const root = new THREE.Group();
  root.name = "Island pines";
  const obstacles: Obstacle[] = [];
  const loader = new THREE.TextureLoader(manager);
  const map = loader.load("/art/pine-color.webp");
  map.colorSpace = THREE.SRGBColorSpace;
  const alphaMap = loader.load("/art/pine-alpha.webp");
  map.anisotropy = alphaMap.anisotropy = 4;
  const foliage = new THREE.MeshStandardMaterial({
    map,
    alphaMap,
    alphaTest: 0.3,
    side: THREE.DoubleSide,
    color: "#9bb596",
    roughness: 0.95,
  });
  const layers = 9,
    branchesPerLayer = 6,
    spraysPerBranch = 16;
  const branchCount = TREE_SPOTS.length * layers * branchesPerLayer;
  const branches = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.65, 1, 1, 6),
    wood,
    branchCount,
  );
  branches.name = "Pine branches";
  const needles = new THREE.InstancedMesh(
    shootGeometry(),
    foliage,
    (branchCount * spraysPerBranch + TREE_SPOTS.length * 3) * 2,
  );
  needles.name = "Pine needle clusters";
  const dummy = new THREE.Object3D(),
    up = new THREE.Vector3(0, 1, 0);
  const roll = new THREE.Quaternion(),
    baseRotation = new THREE.Quaternion();
  const tint = new THREE.Color();
  let branchIndex = 0,
    leafIndex = 0;

  function spray(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    length: number,
    seed: number,
  ) {
    dummy.position.copy(position);
    dummy.scale.set(length * 0.88, length, 1);
    baseRotation.setFromUnitVectors(up, direction.normalize());
    const rotation = rng(seed + 53) * Math.PI;
    const brightness = 0.83 + rng(seed + 71) * 0.17;
    tint.setRGB(brightness * 0.96, brightness, brightness * 0.92);
    for (let face = 0; face < 2; face++) {
      roll.setFromAxisAngle(up, rotation + (face * Math.PI) / 2);
      dummy.quaternion.copy(baseRotation).multiply(roll);
      dummy.updateMatrix();
      needles.setMatrixAt(leafIndex, dummy.matrix);
      needles.setColorAt(leafIndex++, tint);
    }
  }

  TREE_SPOTS.forEach(([x, z], tree) => {
    const floor = terrainHeight(x, z),
      height = 6 + rng(tree + 80) * 5;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.26, height, 10),
      wood,
    );
    trunk.position.set(x, floor + height / 2, z);
    trunk.castShadow = trunk.receiveShadow = true;
    root.add(trunk);
    obstacles.push({ x, z, radius: 0.38 });
    for (let layer = 0; layer < layers; layer++) {
      const level = layer / (layers - 1);
      for (let branch = 0; branch < branchesPerLayer; branch++) {
        const seed = tree * 10000 + layer * 100 + branch;
        const angle =
          (branch / branchesPerLayer) * Math.PI * 2 +
          layer * 2.399 +
          tree +
          (rng(seed + 5) - 0.5) * 0.35;
        const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
        const tangent = new THREE.Vector3(-radial.z, 0, radial.x);
        const reach =
          height *
          0.29 *
          (1 - level * 0.91) ** 0.85 *
          (0.88 + rng(seed + 8) * 0.24);
        const start = new THREE.Vector3(
          x,
          floor +
            height * (0.26 + level * 0.68) +
            (rng(seed + 11) - 0.5) * 0.16,
          z,
        );
        const end = start.clone().addScaledVector(radial, reach);
        end.y += -0.13 + level * 0.3;
        const delta = end.clone().sub(start),
          radius = 0.035 * (1 - level * 0.65);
        dummy.position.copy(start).add(end).multiplyScalar(0.5);
        dummy.quaternion.setFromUnitVectors(up, delta.clone().normalize());
        dummy.scale.set(radius, delta.length(), radius);
        dummy.updateMatrix();
        branches.setMatrixAt(branchIndex++, dummy.matrix);
        for (let shoot = 0; shoot < spraysPerBranch; shoot++) {
          const along = 0.1 + ((shoot % 4) / 3) * 0.74;
          const side = (Math.floor(shoot / 4) - 1.5) / 1.5;
          const position = start
            .clone()
            .lerp(end, along)
            .addScaledVector(
              tangent,
              side * Math.sin(along * Math.PI) * reach * 0.28,
            );
          position.y += (rng(seed + shoot + 300) - 0.5) * 0.14;
          const direction = radial
            .clone()
            .multiplyScalar(0.45)
            .addScaledVector(tangent, side * 0.55);
          direction.y = 0.35 + level * 0.2 + rng(seed + shoot + 600) * 0.16;
          const length =
            (0.85 + rng(seed + shoot + 900) * 0.35) *
            (1 - level * 0.4) *
            (height / 8) ** 0.45;
          spray(position, direction, length, seed + shoot * 37);
        }
      }
    }
    for (let tip = 0; tip < 3; tip++) {
      const angle = (tip * Math.PI * 2) / 3 + tree;
      spray(
        new THREE.Vector3(x, floor + height * 0.9, z),
        new THREE.Vector3(Math.cos(angle) * 0.12, 1, Math.sin(angle) * 0.12),
        height * 0.12,
        tree * 1000 + tip,
      );
    }
  });
  for (const mesh of [branches, needles]) {
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    root.add(mesh);
  }
  return { root, obstacles };
}
