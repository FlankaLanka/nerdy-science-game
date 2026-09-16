import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { shipArt } from "./shipArt";

export const TANDEM_WHEEL_RADIUS = 0.34;

/** One coherent rig: wheel/axle, suspended carriage, head gimbal and two-link arm. */
export function buildTandemModel(scene: THREE.Scene) {
  const root = new THREE.Group();
  root.name = "Tandem / commissioning partner";
  root.userData.dynamic = true;
  scene.add(root);
  const art = shipArt(root);
  const material = (color: string, metalness: number, roughness: number) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const ivory = material("#dfdfd4", 0.08, 0.4),
    blue = material("#426474", 0.25, 0.48),
    rubber = material("#20282b", 0, 0.9),
    gasket = material("#16272e", 0.1, 0.77),
    alloy = material("#869b9e", 0.7, 0.3),
    graphite = material("#34464e", 0.55, 0.43),
    copper = material("#aa8057", 0.65, 0.34),
    glass = material("#101f25", 0.42, 0.19);
  const eye = new THREE.MeshStandardMaterial({
    color: "#e9ac50",
    emissive: "#f0aa3e",
    emissiveIntensity: 0.85,
    roughness: 0.28,
    metalness: 0.2,
  });
  const opticalCore = new THREE.MeshStandardMaterial({
    color: "#ffe3b0",
    emissive: "#ffd28a",
    emissiveIntensity: 0.45,
    roughness: 0.3,
  });
  const mint = new THREE.MeshStandardMaterial({
    color: "#a4d7c9",
    emissive: "#71bda8",
    emissiveIntensity: 0.3,
    roughness: 0.4,
  });
  const geometry = new Map<string, THREE.BufferGeometry>();
  function rounded(w: number, h: number, d: number, r: number) {
    const key = `box:${w}:${h}:${d}:${r}`;
    if (!geometry.has(key))
      geometry.set(
        key,
        new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 3, h / 3, d / 3)),
      );
    return geometry.get(key)!;
  }
  function box(
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    m: THREE.Material,
    r = 0.02,
  ) {
    return art.mesh(rounded(w, h, d, r), m, x, y, z, parent);
  }
  // Extruded silhouettes preserve rounded panel corners even when the plate is thin.
  function panel(
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    r: number,
    x: number,
    y: number,
    z: number,
    m: THREE.Material,
    corners: "all" | "top" | "bottom" = "all",
  ) {
    const key = `panel:${w}:${h}:${d}:${r}:${corners}`;
    if (!geometry.has(key)) {
      const s = new THREE.Shape(),
        a = w / 2,
        b = h / 2,
        c = Math.min(r, a, b),
        top = corners === "bottom" ? 0 : c,
        bottom = corners === "top" ? 0 : c;
      s.moveTo(-a + bottom, -b);
      s.lineTo(a - bottom, -b);
      s.quadraticCurveTo(a, -b, a, -b + bottom);
      s.lineTo(a, b - top);
      s.quadraticCurveTo(a, b, a - top, b);
      s.lineTo(-a + top, b);
      s.quadraticCurveTo(-a, b, -a, b - top);
      s.lineTo(-a, -b + bottom);
      s.quadraticCurveTo(-a, -b, -a + bottom, -b);
      const g = new THREE.ExtrudeGeometry(s, {
        depth: d,
        steps: 1,
        bevelEnabled: false,
        curveSegments: 8,
      });
      g.translate(0, 0, -d / 2);
      geometry.set(key, g);
    }
    return art.mesh(geometry.get(key)!, m, x, y, z, parent);
  }
  function disk(
    parent: THREE.Object3D,
    r: number,
    d: number,
    x: number,
    y: number,
    z: number,
    m: THREE.Material,
    axis: "x" | "z" = "z",
    segments = 24,
  ) {
    const key = `disk:${r}:${d}:${axis}:${segments}`;
    if (!geometry.has(key)) {
      const g = new THREE.CylinderGeometry(r, r, d, segments);
      axis === "x" ? g.rotateZ(Math.PI / 2) : g.rotateX(Math.PI / 2);
      geometry.set(key, g);
    }
    return art.mesh(geometry.get(key)!, m, x, y, z, parent);
  }
  function fastener(parent: THREE.Object3D, x: number, y: number, z: number) {
    disk(parent, 0.011, 0.005, x, y, z, alloy, "z", 12);
    box(parent, 0.012, 0.0025, 0.002, x, y, z + 0.0035, gasket, 0.0006);
  }
  function tube(
    parent: THREE.Object3D,
    points: number[][],
    radius: number,
    m: THREE.Material,
  ) {
    return art.mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(
          points.map(
            (p) => new THREE.Vector3(...(p as [number, number, number])),
          ),
        ),
        24,
        radius,
        8,
        false,
      ),
      m,
      0,
      0,
      0,
      parent,
    );
  }

  const wheel = new THREE.Group();
  wheel.name = "Tandem drive wheel";
  wheel.position.y = TANDEM_WHEEL_RADIUS;
  root.add(wheel);
  const profile = [
    [0.14, -0.125],
    [0.245, -0.125],
    [0.295, -0.112],
    [0.324, -0.09],
    [0.337, -0.06],
    [0.34, -0.042],
    [0.335, -0.037],
    [0.335, -0.031],
    [0.34, -0.026],
    [0.34, 0.026],
    [0.335, 0.031],
    [0.335, 0.037],
    [0.34, 0.042],
    [0.337, 0.06],
    [0.324, 0.09],
    [0.295, 0.112],
    [0.245, 0.125],
    [0.14, 0.125],
    [0.14, -0.125],
  ].map(([r, a]) => new THREE.Vector2(r, a));
  const tire = new THREE.LatheGeometry(profile, 64);
  tire.rotateZ(Math.PI / 2);
  art.mesh(tire, rubber, 0, 0, 0, wheel);
  for (const side of [-1, 1]) {
    disk(wheel, 0.245, 0.014, side * 0.127, 0, 0, graphite, "x", 40);
    disk(wheel, 0.215, 0.008, side * 0.138, 0, 0, blue, "x", 40);
    disk(wheel, 0.104, 0.016, side * 0.15, 0, 0, alloy, "x");
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      disk(
        wheel,
        0.009,
        0.004,
        side * 0.145,
        Math.cos(a) * 0.187,
        Math.sin(a) * 0.187,
        copper,
        "x",
        10,
      );
    }
    // Fixed bearing caps and fork sit outside the rotating hub.
    disk(root, 0.085, 0.13, side * 0.175, 0.34, 0, graphite, "x");
    disk(root, 0.056, 0.02, side * 0.287, 0.34, 0, copper, "x");
  }
  box(root, 0.47, 0.105, 0.2, 0, 0.755, -0.03, graphite, 0.03);
  for (const side of [-1, 1]) {
    const fork = box(
      root,
      0.115,
      0.46,
      0.175,
      side * 0.218,
      0.555,
      -0.035,
      ivory,
      0.045,
    );
    fork.rotation.x = -0.17;
    box(root, 0.025, 0.24, 0.06, side * 0.28, 0.565, -0.028, graphite, 0.01);
  }
  // A common suspension pivot keeps the torso, neck and shoulder mechanically attached.
  const body = new THREE.Group();
  body.name = "Tandem suspended carriage";
  body.position.y = 0.76;
  root.add(body);
  disk(body, 0.07, 0.3, 0, 0.02, 0, alloy, "x");
  box(body, 0.58, 0.49, 0.36, 0, 0.15, -0.01, graphite, 0.08);
  box(body, 0.63, 0.54, 0.25, 0, 0.15, 0.045, ivory, 0.085);
  box(body, 0.6, 0.51, 0.1, 0, 0.15, -0.137, ivory, 0.03);
  panel(body, 0.535, 0.444, 0.009, 0.078, 0, 0.15, 0.174, gasket);
  panel(body, 0.514, 0.179, 0.012, 0.071, 0, 0.2715, 0.184, blue, "top");
  panel(body, 0.514, 0.239, 0.012, 0.071, 0, 0.0585, 0.184, blue, "bottom");
  panel(body, 0.031, 0.1, 0.004, 0.015, -0.191, 0.27, 0.193, gasket);
  panel(body, 0.013, 0.077, 0.004, 0.0065, -0.191, 0.27, 0.196, mint);
  for (const x of [-0.185, -0.156])
    panel(body, 0.009, 0.069, 0.003, 0.004, x, 0.08, 0.193, gasket);
  for (const x of [-0.274, 0.274])
    for (const y of [-0.055, 0.355]) fastener(body, x, y, 0.166);
  art.label(
    "TANDEM",
    "",
    0.055,
    0.285,
    0.193,
    0.22,
    0.034,
    "#c4d4d1",
    0,
    false,
    body,
    "center",
  );
  // A quiet rear service face gives the model a finished back as well as a front.
  const rear = panel(
    body,
    0.39,
    0.265,
    0.009,
    0.045,
    0,
    0.15,
    -0.191,
    graphite,
  );
  rear.rotation.y = Math.PI;
  for (const y of [0.1, 0.135, 0.17])
    box(body, 0.26, 0.012, 0.006, 0, y, -0.199, gasket, 0.003);
  for (const x of [-0.1, 0, 0.1])
    disk(body, 0.017, 0.007, x, 0.052, -0.2, copper, "z", 12);

  // Continuous S-shaped cast neck, with a protected loom and a visible head bearing.
  const neckShape = new THREE.Shape();
  neckShape.moveTo(0.05, 0.405);
  neckShape.bezierCurveTo(0.035, 0.47, -0.13, 0.49, -0.14, 0.56);
  neckShape.lineTo(-0.14, 0.65);
  neckShape.quadraticCurveTo(-0.14, 0.675, -0.105, 0.685);
  neckShape.lineTo(-0.035, 0.685);
  neckShape.lineTo(-0.035, 0.62);
  neckShape.quadraticCurveTo(-0.08, 0.59, -0.045, 0.56);
  neckShape.bezierCurveTo(0.04, 0.515, 0.155, 0.48, 0.155, 0.405);
  neckShape.closePath();
  const neckGeometry = new THREE.ExtrudeGeometry(neckShape, {
    depth: 0.073,
    bevelEnabled: true,
    bevelSize: 0.012,
    bevelThickness: 0.012,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 10,
  });
  neckGeometry.translate(0, 0, -0.06);
  art.mesh(neckGeometry, graphite, 0, 0, 0, body);
  tube(
    body,
    [
      [0.06, 0.414, -0.1],
      [-0.035, 0.49, -0.11],
      [-0.14, 0.535, -0.1],
      [-0.135, 0.61, -0.09],
      [-0.05, 0.645, -0.065],
    ],
    0.014,
    gasket,
  );
  disk(body, 0.065, 0.145, -0.04, 0.665, -0.025, graphite, "x");
  for (const side of [-1, 1])
    disk(body, 0.042, 0.014, -0.04 + side * 0.081, 0.665, -0.025, copper, "x");
  const head = new THREE.Group();
  head.name = "Tandem optical head";
  head.position.set(-0.04, 0.665, -0.025);
  body.add(head);
  box(head, 0.545, 0.245, 0.285, 0.04, 0.075, 0.025, ivory, 0.077);
  panel(head, 0.47, 0.187, 0.008, 0.056, 0.04, 0.075, 0.17, gasket);
  panel(head, 0.449, 0.169, 0.009, 0.052, 0.04, 0.075, 0.179, glass);
  panel(head, 0.078, 0.146, 0.005, 0.036, 0.185, 0.075, 0.186, copper);
  panel(head, 0.062, 0.132, 0.005, 0.029, 0.185, 0.075, 0.19, gasket);
  panel(head, 0.033, 0.111, 0.004, 0.0165, 0.185, 0.075, 0.194, eye);
  panel(head, 0.01, 0.09, 0.002, 0.005, 0.185, 0.075, 0.197, opticalCore);
  for (const x of [-0.115, -0.096])
    panel(head, 0.006, 0.033, 0.003, 0.003, x, 0.075, 0.186, graphite);

  box(head, 0.29, 0.009, 0.004, 0.04, 0.015, -0.12, gasket, 0.002);

  const arm = new THREE.Group();
  arm.name = "Tandem shoulder";
  arm.position.set(0.36, 0.31, 0);
  body.add(arm);
  // Shoulder bellows close the gap between the body and the articulated socket.
  disk(body, 0.076, 0.092, 0.319, 0.31, 0, gasket, "x");
  const joint = (parent: THREE.Object3D, r: number) => {
    disk(parent, r, 0.095, 0, 0, 0, graphite);
    for (const side of [-1, 1])
      disk(parent, r * 0.75, 0.012, 0, 0, side * 0.054, copper);
    disk(parent, r * 0.38, 0.007, 0, 0, 0.064, alloy);
  };
  joint(arm, 0.063);
  box(arm, 0.076, 0.235, 0.066, 0, -0.125, 0, graphite, 0.023);
  box(arm, 0.114, 0.17, 0.084, 0, -0.125, 0, ivory, 0.021);
  const elbow = new THREE.Group();
  elbow.name = "Tandem elbow";
  elbow.position.y = -0.25;
  arm.add(elbow);
  joint(elbow, 0.052);
  box(elbow, 0.069, 0.21, 0.057, 0, -0.11, 0, graphite, 0.016);
  box(elbow, 0.094, 0.15, 0.077, 0, -0.115, 0, ivory, 0.023);
  const pointerBase = new THREE.Object3D();
  pointerBase.name = "Tandem pointer base";
  pointerBase.position.y = -0.22;
  elbow.add(pointerBase);
  box(elbow, 0.071, 0.047, 0.067, 0, -0.217, 0, graphite, 0.014);
  art.rod(
    new THREE.Vector3(0, -0.236, 0),
    new THREE.Vector3(0, -0.286, 0),
    0.013,
    alloy,
    elbow,
  );
  art.rod(
    new THREE.Vector3(0, -0.282, 0),
    new THREE.Vector3(0, -0.39, 0),
    0.009,
    graphite,
    elbow,
  );
  const pointerTip = new THREE.Object3D();
  pointerTip.name = "Tandem pointer tip";
  pointerTip.position.y = -0.41;
  elbow.add(pointerTip);
  box(elbow, 0.028, 0.034, 0.028, 0, -0.401, 0, copper, 0.009);
  art.mesh(new THREE.SphereGeometry(0.017, 16, 10), eye, 0, -0.419, 0, elbow);

  // Merge only within rigid links; joints, wheel rotation and optical tracking stay independent.
  const discarded = new Set<THREE.BufferGeometry>();
  for (const link of [root, wheel, body, head, arm, elbow]) {
    const groups = new Map<THREE.Material, THREE.Mesh[]>();
    for (const child of link.children)
      if (child instanceof THREE.Mesh && !Array.isArray(child.material)) {
        const list = groups.get(child.material) ?? [];
        list.push(child);
        groups.set(child.material, list);
      }
    for (const [m, meshes] of groups) {
      if (meshes.length < 2) continue;
      const copies = meshes.map((mesh) => {
        mesh.updateMatrix();
        return (
          mesh.geometry.index
            ? mesh.geometry.toNonIndexed()
            : mesh.geometry.clone()
        ).applyMatrix4(mesh.matrix);
      });
      const combined = mergeGeometries(copies, false);
      copies.forEach((g) => g.dispose());
      if (!combined) continue;
      for (const mesh of meshes) {
        link.remove(mesh);
        discarded.add(mesh.geometry);
      }
      const merged = art.mesh(combined, m, 0, 0, 0, link);
      merged.name = "Tandem rigid surface";
    }
  }
  const retained = new Set<THREE.BufferGeometry>();
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) retained.add(o.geometry);
  });
  for (const g of discarded) if (!retained.has(g)) g.dispose();
  root.visible = false;
  return { root, body, head, wheel, arm, elbow, eye };
}
