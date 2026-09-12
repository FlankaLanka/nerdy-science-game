import * as THREE from "three";

/** Closed hull section: painted outer skin, wooden inner skin, and a joined rim. */
export function buildBoat(wood: THREE.Material, paint: THREE.Material) {
  const root = new THREE.Group();
  root.name = "Harbor rowing boat";
  root.position.set(30, -0.3, 20.5);
  root.rotation.y = Math.PI / 2;
  const profile: THREE.Vector2[] = [];
  const steps = 12,
    segments = 48;
  for (let i = 0; i <= steps; i++) {
    const a = ((i / steps) * Math.PI) / 2;
    profile.push(new THREE.Vector2(Math.sin(a), 0.28 - 0.82 * Math.cos(a)));
  }
  for (let i = steps; i >= 0; i--) {
    const a = ((i / steps) * Math.PI) / 2;
    profile.push(
      new THREE.Vector2(0.9 * Math.sin(a), 0.28 - 0.48 * Math.cos(a)),
    );
  }
  const geometry = new THREE.LatheGeometry(profile, segments);
  const strip = (profile.length - 1) * 6;
  for (let i = 0; i < segments; i++) {
    geometry.addGroup(i * strip, steps * 6, 0);
    geometry.addGroup(i * strip + steps * 6, strip - steps * 6, 1);
  }
  const hull = new THREE.Mesh(geometry, [paint, wood]);
  hull.name = "closed boat hull";
  hull.scale.set(1.2, 1, 3.1);
  root.add(hull);
  for (const z of [-1.35, 0, 1.35]) {
    const insideRadius = 0.9 * Math.sqrt(1 - ((0.15 - 0.28) / 0.48) ** 2);
    const halfWidth =
      1.2 * Math.sqrt(insideRadius ** 2 - ((Math.abs(z) + 0.18) / 3.1) ** 2);
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(halfWidth * 2, 0.1, 0.36),
      wood,
    );
    seat.name = "boat seat";
    seat.position.set(0, 0.2, z);
    root.add(seat);
  }
  for (const x of [-0.22, 0, 0.22]) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 3), wood);
    plank.name = "boat floorboard";
    plank.position.set(x, -0.08, 0);
    root.add(plank);
  }
  const a = new THREE.Vector3(-0.85, 0.34, -2),
    b = new THREE.Vector3(0.85, 0.34, 2);
  const direction = b.clone().sub(a);
  const oar = new THREE.Group();
  oar.position.copy(a).add(b).multiplyScalar(0.5);
  oar.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize(),
  );
  oar.add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, direction.length(), 10),
      wood,
    ),
  );
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.65, 0.055), wood);
  blade.position.y = direction.length() / 2 - 0.22;
  oar.add(blade);
  root.add(oar);
  root.traverse((object) => {
    if (object instanceof THREE.Mesh)
      object.castShadow = object.receiveShadow = true;
  });
  return root;
}
