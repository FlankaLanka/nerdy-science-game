import * as THREE from "three";
import { EARTH } from "./space";

/** A real orbit around Earth: the planet occludes the relay on the far side. */
export function buildTitleSatellite(scene: THREE.Scene) {
  const rig = new THREE.Group();
  rig.name = "Title / maintenance relay";
  scene.add(rig);
  const center = new THREE.Vector3(EARTH.x, EARTH.y, EARTH.z);
  const towardCamera = new THREE.Vector3(133, -10, 22).normalize();
  const across = new THREE.Vector3()
    .crossVectors(new THREE.Vector3(0, 1, 0), towardCamera)
    .normalize();
  const north = new THREE.Vector3()
    .crossVectors(towardCamera, across)
    .normalize();
  const depth = towardCamera
    .clone()
    .multiplyScalar(Math.cos(0.21))
    .addScaledVector(north, -Math.sin(0.21));
  const body = new THREE.Group();
  body.scale.setScalar(1.4);
  body.rotation.set(0.12, -0.12, -0.2);
  rig.add(body);
  const alloy = new THREE.MeshStandardMaterial({
    color: "#becac4",
    metalness: 0.65,
    roughness: 0.4,
  });
  const foil = new THREE.MeshStandardMaterial({
    color: "#a99b72",
    metalness: 0.7,
    roughness: 0.6,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: "#1d343e",
    metalness: 0.7,
    roughness: 0.4,
  });
  const cell = new THREE.MeshStandardMaterial({
    color: "#234157",
    metalness: 0.55,
    roughness: 0.32,
  });
  const cube = new THREE.BoxGeometry(1, 1, 1);
  function box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    material = alloy,
  ) {
    const m = new THREE.Mesh(cube, material);
    m.position.set(x, y, z);
    m.scale.set(w, h, d);
    body.add(m);
    return m;
  }
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 1.7, 16),
    alloy,
  );
  body.add(core);
  box(0, 0, 0, 0.71, 1.25, 0.71, foil);
  box(0, -0.8, 0.05, 0.92, 0.14, 0.92, dark);
  box(0, 0.75, 0, 0.95, 0.12, 0.9);
  box(0, 0.2, 0.4, 0.38, 0.5, 0.06, dark);
  for (const y of [-0.4, -0.1, 0.2]) box(0.22, y, 0.44, 0.16, 0.055, 0.02);
  box(0, -0.9, 0, 0.14, 0.36, 0.14, dark);
  box(0, 0.15, 0, 6.5, 0.075, 0.1);
  const panels = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.55, 0.29, 0.025),
    cell,
    32,
  );
  const transform = new THREE.Matrix4();
  let index = 0;
  for (const side of [-1, 1]) {
    box(side * 2.03, 0.15, 0, 2.48, 1.46, 0.07, dark);
    for (const y of [-0.59, 0.89]) box(side * 2.03, y, 0.035, 2.5, 0.025, 0.07);
    for (const x of [0.8, 3.27]) box(side * x, 0.15, 0.035, 0.035, 1.5, 0.07);
    for (let x = 0; x < 4; x++)
      for (let y = 0; y < 4; y++) {
        transform.makeTranslation(
          side * (1.11 + x * 0.61),
          -0.34 + y * 0.33,
          0.055,
        );
        panels.setMatrixAt(index++, transform);
      }
  }
  body.add(panels);
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 20, 10, 0, Math.PI * 2, 0, 0.52),
    alloy,
  );
  dish.rotation.x = Math.PI / 2 + 0.35;
  dish.position.set(0, 1.02, 0.1);
  body.add(dish);
  box(0, 1.32, 0.23, 0.035, 0.6, 0.035);
  box(
    0.36,
    -0.12,
    0.43,
    0.06,
    0.08,
    0.03,
    new THREE.MeshStandardMaterial({
      color: "#c6dfc0",
      emissive: "#badfa8",
      emissiveIntensity: 0.8,
    }),
  );
  return {
    update(time: number, visible: boolean) {
      rig.visible = visible;
      if (!visible) return;
      // Starting orbit: 57 seconds, just above the limb, inclined toward the viewer.
      const phase = 1.88 + time * 0.11,
        radius = EARTH.radius + 8;
      rig.position
        .copy(center)
        .addScaledVector(across, Math.cos(phase) * radius)
        .addScaledVector(depth, Math.sin(phase) * radius);
      rig.lookAt(center);
      rig.rotateY(Math.PI);
    },
  };
}
