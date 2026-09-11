import * as THREE from "three";
import type { Obstacle } from "./navigation.ts";
import { WORKSHOP as W } from "./workshopLayout.ts";

type Materials = Record<
  "wood" | "stone" | "plaster" | "roof" | "iron",
  THREE.Material
>;

/** A closed architectural shell. Openings, trim and collision use the same dimensions. */
export function buildWorkshop(floorY: number, materials: Materials) {
  const root = new THREE.Group();
  root.name = "Keeper’s workshop";
  root.position.set(W.x, floorY, W.z);
  const obstacles: Obstacle[] = [];
  const half = W.width / 2;
  const front = W.depth / 2;
  const eave = W.wallHeight;
  const ridge = eave + W.roofRise;
  const pitch = Math.atan2(W.roofRise, half);

  function mesh(
    name: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material | THREE.Material[],
    x: number,
    y: number,
    z: number,
  ) {
    if (material === materials.plaster) {
      // Continuous coordinates keep the gables, wall panels and corners at one scale.
      const positions = geometry.getAttribute("position");
      const normals = geometry.getAttribute("normal");
      const uv = geometry.getAttribute("uv");
      for (let i = 0; i < positions.count; i++) {
        const horizontal =
          Math.abs(normals.getX(i)) > 0.5
            ? positions.getZ(i) + z
            : positions.getX(i) + x;
        uv.setXY(i, horizontal / 4, (positions.getY(i) + y) / 4);
      }
    }
    const object = new THREE.Mesh(geometry, material);
    object.name = name;
    object.position.set(x, y, z);
    object.castShadow = object.receiveShadow = true;
    root.add(object);
    return object;
  }
  function box(
    name: string,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    material: THREE.Material | THREE.Material[],
    solid = false,
  ) {
    const object = mesh(
      name,
      new THREE.BoxGeometry(width, height, depth),
      material,
      x,
      y,
      z,
    );
    if (solid) obstacles.push({ x: W.x + x, z: W.z + z, width, depth });
    return object;
  }

  box(
    "workshop floor",
    0,
    -0.3,
    0,
    W.width + 0.6,
    0.6,
    W.depth + 0.6,
    materials.stone,
  );
  box(
    "porch floor",
    0,
    -0.3,
    front + (W.porchDepth + 0.3) / 2,
    W.width + 0.9,
    0.6,
    W.porchDepth - 0.3,
    materials.stone,
  );

  for (const side of [-1, 1]) {
    box(
      `side wall ${side}`,
      side * half,
      eave / 2,
      0,
      W.wall,
      eave,
      W.depth + W.wall,
      materials.plaster,
      true,
    );
  }
  box(
    "rear wall",
    0,
    eave / 2,
    -front,
    W.width - W.wall,
    eave,
    W.wall,
    materials.plaster,
    true,
  );

  const wall = new THREE.Shape();
  wall.moveTo(-half + W.wall / 2, 0);
  wall.lineTo(-W.doorWidth / 2, 0);
  wall.lineTo(-W.doorWidth / 2, W.doorHeight);
  wall.lineTo(W.doorWidth / 2, W.doorHeight);
  wall.lineTo(W.doorWidth / 2, 0);
  wall.lineTo(half - W.wall / 2, 0);
  wall.lineTo(half - W.wall / 2, eave);
  wall.lineTo(-half + W.wall / 2, eave);
  wall.closePath();
  const windowWidth = 1.3,
    windowHeight = 1.18,
    sill = 1.32;
  const glazing = new THREE.MeshStandardMaterial({
    color: "#a6c3ba",
    roughness: 0.22,
    metalness: 0.1,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  for (const x of [-2.85, 2.85]) {
    const opening = new THREE.Path();
    opening.moveTo(x - windowWidth / 2, sill);
    opening.lineTo(x - windowWidth / 2, sill + windowHeight);
    opening.lineTo(x + windowWidth / 2, sill + windowHeight);
    opening.lineTo(x + windowWidth / 2, sill);
    opening.closePath();
    wall.holes.push(opening);
    const cy = sill + windowHeight / 2;
    for (const dx of [-1, 1])
      box(
        "window jamb",
        x + dx * (windowWidth / 2 + 0.04),
        cy,
        front,
        0.1,
        windowHeight + 0.2,
        0.42,
        materials.wood,
      );
    for (const dy of [-1, 1])
      box(
        "window sill and head",
        x,
        cy + dy * (windowHeight / 2 + 0.04),
        front,
        windowWidth + 0.18,
        0.1,
        0.48,
        materials.wood,
      );
    box(
      "window mullion",
      x,
      cy,
      front,
      0.05,
      windowHeight,
      0.12,
      materials.wood,
    );
    box(
      "window transom",
      x,
      cy,
      front,
      windowWidth,
      0.05,
      0.12,
      materials.wood,
    );
    const pane = mesh(
      "window glass",
      new THREE.PlaneGeometry(windowWidth, windowHeight),
      glazing,
      x,
      cy,
      front,
    );
    pane.castShadow = false;
  }
  mesh(
    "front wall with openings",
    new THREE.ExtrudeGeometry(wall, { depth: W.wall, bevelEnabled: false }),
    materials.plaster,
    0,
    0,
    front - W.wall / 2,
  );
  const wing = (W.width - W.doorWidth) / 2;
  for (const side of [-1, 1]) {
    obstacles.push({
      x: W.x + side * (W.doorWidth / 2 + wing / 2),
      z: W.z + front,
      width: wing,
      depth: W.wall,
    });
    box(
      "door jamb",
      side * (W.doorWidth / 2 + 0.06),
      W.doorHeight / 2,
      front,
      0.14,
      W.doorHeight,
      0.46,
      materials.wood,
    );
  }
  box(
    "door lintel",
    0,
    W.doorHeight + 0.08,
    front,
    W.doorWidth + 0.26,
    0.16,
    0.46,
    materials.wood,
  );
  box(
    "door threshold",
    0,
    -0.015,
    front,
    W.doorWidth,
    0.06,
    0.46,
    materials.wood,
  );

  // Solid extruded gables close both triangular gaps below the roof.
  const gable = new THREE.Shape();
  gable.moveTo(-half - W.wall / 2, 0);
  gable.lineTo(half + W.wall / 2, 0);
  gable.lineTo(0, W.roofRise + 0.05);
  gable.closePath();
  for (const z of [-front, front])
    mesh(
      z > 0 ? "front gable" : "rear gable",
      new THREE.ExtrudeGeometry(gable, { depth: W.wall, bevelEnabled: false }),
      materials.plaster,
      0,
      eave,
      z - W.wall / 2,
    );

  const reach = half + W.roofOverhang;
  const roofDepth = W.depth + 2 * W.roofOverhang;
  const slope = Math.tan(pitch);
  for (const side of [-1, 1]) {
    const cx = (side * (reach - 0.06)) / 2;
    const cy =
      ridge - Math.abs(cx) * slope + W.roofThickness / (2 * Math.cos(pitch));
    const length = (reach + 0.06) / Math.cos(pitch);
    const panel = box(
      `roof ${side}`,
      cx,
      cy,
      0,
      length,
      W.roofThickness,
      roofDepth,
      [
        materials.iron,
        materials.iron,
        materials.roof,
        materials.wood,
        materials.iron,
        materials.iron,
      ],
    );
    panel.rotation.z = -side * pitch;
    // Seams lie on the roof surface; they share its exact pitch and length.
    for (let z = -roofDepth / 2 + 0.16; z < roofDepth / 2; z += 0.5) {
      const seam = box(
        "standing seam",
        cx,
        cy + (W.roofThickness / 2 + 0.012) / Math.cos(pitch),
        z,
        length,
        0.024,
        0.035,
        materials.iron,
      );
      seam.rotation.z = -side * pitch;
    }
    for (const z of [-front + 0.35, 0, front - 0.35]) {
      const rafter = box(
        "interior rafter",
        (side * half) / 2,
        ridge - (half / 2) * slope - 0.1 / Math.cos(pitch),
        z,
        half / Math.cos(pitch),
        0.2,
        0.16,
        materials.wood,
      );
      rafter.rotation.z = -side * pitch;
    }
    const fascia = box(
      "eave fascia",
      side * reach,
      ridge - reach * slope,
      0,
      0.12,
      0.25,
      roofDepth,
      materials.wood,
    );
    fascia.rotation.z = -side * pitch;
  }
  const cap = mesh(
    "ridge cap",
    new THREE.CylinderGeometry(0.14, 0.14, roofDepth + 0.05, 12),
    materials.iron,
    0,
    ridge + 0.13,
    0,
  );
  cap.rotation.x = Math.PI / 2;
  for (const z of [-front + 0.35, 0, front - 0.35])
    box(
      "ceiling tie beam",
      0,
      eave - 0.1,
      z,
      W.width,
      0.2,
      0.18,
      materials.wood,
    );

  const chimneyX = -3,
    chimneyZ = -1.5;
  const chimneyBottom = ridge - Math.abs(chimneyX) * slope - 0.08;
  const chimney = box(
    "chimney",
    chimneyX,
    chimneyBottom + 0.8,
    chimneyZ,
    0.72,
    1.6,
    0.72,
    materials.stone,
  );
  // Seat the base within the pitched roof instead of leaving a flat stone
  // corner hanging through the wooden ceiling.
  const chimneyVertices = chimney.geometry.getAttribute("position");
  for (let i = 0; i < chimneyVertices.count; i++) {
    if (chimneyVertices.getY(i) >= 0) continue;
    const x = chimneyX + chimneyVertices.getX(i);
    chimneyVertices.setY(
      i,
      ridge - Math.abs(x) * slope + 0.03 - chimney.position.y,
    );
  }
  chimney.geometry.computeVertexNormals();
  box(
    "chimney crown",
    chimneyX,
    chimneyBottom + 1.65,
    chimneyZ,
    0.94,
    0.14,
    0.94,
    materials.stone,
  );
  const flashing = box(
    "chimney flashing",
    chimneyX,
    ridge - Math.abs(chimneyX) * slope + 0.22,
    chimneyZ,
    1.08,
    0.08,
    1.1,
    materials.iron,
  );
  flashing.rotation.z = pitch;

  const porchRoofDepth = W.porchDepth + 0.3;
  const porchZ = front + W.porchDepth / 2;
  const porchPitch = Math.atan2(0.2, porchRoofDepth);
  const porchY = eave - 0.23;
  const canopy = box(
    "porch roof",
    0,
    porchY,
    porchZ,
    W.width + 0.9,
    0.14,
    porchRoofDepth,
    [
      materials.iron,
      materials.iron,
      materials.roof,
      materials.wood,
      materials.wood,
      materials.wood,
    ],
  );
  canopy.rotation.x = porchPitch;
  const postZ = front + W.porchDepth - 0.16;
  const beamTop =
    porchY -
    (postZ - porchZ) * Math.tan(porchPitch) -
    0.07 / Math.cos(porchPitch);
  box(
    "porch header",
    0,
    beamTop - 0.09,
    postZ,
    W.width + 0.9,
    0.18,
    0.18,
    materials.wood,
  );
  for (const x of [-half - 0.12, half + 0.12])
    box(
      "porch post",
      x,
      (beamTop - 0.18) / 2,
      postZ,
      0.18,
      beamTop - 0.18,
      0.18,
      materials.wood,
      true,
    );
  box(
    "interior pendant cable",
    0,
    (eave - 0.2 + 3.03) / 2,
    0,
    0.025,
    eave - 0.2 - 3.03,
    0.025,
    materials.iron,
  );
  box(
    "porch pendant mount",
    0,
    porchY - 0.15,
    porchZ,
    0.025,
    0.2,
    0.025,
    materials.iron,
  );

  const benchX = -2.8,
    benchZ = -0.6,
    benchHeight = 0.94;
  box(
    "workbench top",
    benchX,
    benchHeight + 0.08,
    benchZ,
    2.7,
    0.16,
    1.1,
    materials.wood,
  );
  for (const x of [benchX - 1.18, benchX + 1.18])
    for (const z of [benchZ - 0.42, benchZ + 0.42])
      box(
        "workbench leg",
        x,
        benchHeight / 2,
        z,
        0.1,
        benchHeight,
        0.1,
        materials.iron,
      );
  obstacles.push({ x: W.x + benchX, z: W.z + benchZ, width: 2.7, depth: 1.1 });
  for (let i = 0; i < 4; i++) {
    const x = -3.7 + i * 0.77,
      z = -front + 0.65;
    box("storage crate", x, 0.39, z, 0.7, 0.78, 0.85, materials.wood, true);
    for (const dz of [-0.43, 0.43])
      box("crate strap", x, 0.39, z + dz, 0.72, 0.085, 0.025, materials.iron);
  }
  return {
    root,
    obstacles,
    signY: floorY + eave + 0.4,
    interiorLampY: floorY + 2.85,
    porchLampY: floorY + porchY - 0.42,
    porchLampZ: W.z + porchZ,
  };
}
