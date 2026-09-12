import * as THREE from "three";
import { DECK, DOORWAYS, FURNITURE, SHIP_SITES } from "./shipLayout";
import {
  bulkheadAccess,
  SHIP_SYSTEMS,
  SHIP_TUNING,
  systemStatus,
} from "../shipSystems";
import { shipArt, surface } from "./shipArt";
import { buildSpace } from "./space";
import type { MissionId } from "../missions";
import type { Obstacle, Player } from "./navigation";

/** Authored maintenance bay, reactor hall and observatory. Starting art/timing values
 * are evaluated against the same-pose recovery review in docs/redesign.md. */
export function buildSpaceship(scene: THREE.Scene) {
  const root = new THREE.Group();
  root.name = "Asterion / recovery deck";
  scene.add(root);
  const { mesh, box, bevel, rod, label, floorLabel, batch } = shipArt(root);
  const obstacles: Obstacle[] = FURNITURE.map((item) => ({ ...item }));
  const material = (color: string, metalness = 0.35, roughness = 0.65) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const shell = material("#8b9696", 0.2);
  const hull = material("#39454c", 0.65),
    dark = material("#151f26", 0.5);
  const rim = material("#7c8b91", 0.78, 0.35),
    black = material("#080e13", 0.1);
  const copper = material("#a55d31", 0.8, 0.4),
    amberPaint = material("#d99950", 0.15);
  const plate = material("#50595b", 0.5);
  plate.map = surface("deck");
  const wall = material("#abb6b5", 0.2);
  wall.map = surface("panel");
  const glow = (color: string, intensity = 1) =>
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: intensity,
      roughness: 0.5,
    });
  const amber = glow("#ffae5f", 1.7),
    cyan = glow("#8fe5da", 1.4);
  const powered: {
    id: MissionId;
    material?: THREE.MeshStandardMaterial;
    color?: THREE.Color;
    light?: THREE.PointLight;
    online: number;
    offline: number;
    value: number;
  }[] = [];
  const powerCache = new Map<string, THREE.MeshStandardMaterial>();
  const liveGroup = (x = 0, y = 0, z = 0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.userData.dynamic = true;
    root.add(g);
    return g;
  };
  function powerMat(id: MissionId, color: string, online = 1.7, offline = 0) {
    const key = `${id}:${color}:${online}:${offline}`;
    const previous = powerCache.get(key);
    if (previous) return previous;
    const m = glow(color, offline);
    powered.push({
      id,
      material: m,
      color: new THREE.Color(color),
      online,
      offline,
      value: offline,
    });
    powerCache.set(key, m);
    return m;
  }
  function powerLight(
    id: MissionId,
    x: number,
    y: number,
    z: number,
    color: string,
    online: number,
    offline = 0,
    distance = 15,
  ) {
    const light = new THREE.PointLight(color, offline, distance, 2);
    light.position.set(x, y, z);
    root.add(light);
    powered.push({ id, light, online, offline, value: offline });
    return light;
  }
  function ring(
    x: number,
    y: number,
    z: number,
    r: number,
    thickness: number,
    m: THREE.Material,
    parent: THREE.Object3D = root,
  ) {
    const o = mesh(
      new THREE.TorusGeometry(r, thickness, 8, 64),
      m,
      x,
      y,
      z,
      parent,
    );
    o.rotation.x = Math.PI / 2;
    return o;
  }
  function hazard(
    x: number,
    y: number,
    z: number,
    w: number,
    parent: THREE.Object3D = root,
  ) {
    box(x, y, z, w, 0.16, 0.02, black, parent);
    for (let p = -w / 2 + 0.12; p < w / 2 - 0.05; p += 0.24) {
      const stripe = box(
        x + p,
        y,
        z + 0.012,
        0.09,
        0.16,
        0.008,
        amberPaint,
        parent,
      );
      stripe.rotation.z = -0.4;
    }
  }
  function pipe(points: number[][], radius: number, m: THREE.Material) {
    for (let i = 1; i < points.length; i++)
      rod(
        new THREE.Vector3(...(points[i - 1] as [number, number, number])),
        new THREE.Vector3(...(points[i] as [number, number, number])),
        radius,
        m,
      );
  }

  // A clear central aisle, chunky pressure ribs, inset hull cassettes and dark cable trenches.
  // Reserve fixtures stay warm; successful repairs bring the overhead work lights online.
  for (const room of DECK) {
    const passage = room.width === 6;
    const id: MissionId =
      room.id === "command" || room.id === "forward-passage"
        ? "beacon"
        : room.id === "relay"
          ? "harbor"
          : "workshop";
    const feed: MissionId =
      room.id === "command" || room.id === "forward-passage" ? "harbor" : id;
    const ceilingLight = powerMat(feed, "#e3efe9", 1.8, 0.04);
    const trunk = powerMat(feed, "#79ded3", 1.2, 0.01);
    box(0, -0.25, room.z, room.width, 0.5, room.depth, black);
    const front = room.z - room.depth / 2,
      back = room.z + room.depth / 2;
    for (let x = -room.width / 2 + 1; x < room.width / 2; x += 2)
      for (let z = front; z < back; z += 2) {
        const depth = Math.min(1.97, back - z);
        box(
          x,
          -0.045,
          z + depth / 2,
          1.97,
          0.08,
          depth,
          Math.abs(x) < 2 ? plate : hull,
        );
        if (Math.abs(x) > 2) {
          for (let k = 0; k < 5; k++)
            box(
              x - 0.65 + k * 0.3,
              0.001,
              z + depth / 2,
              0.035,
              0.005,
              depth * 0.72,
              black,
            );
        }
      }
    for (const side of [-1, 1]) {
      const x = (side * room.width) / 2;
      const window = room.id === "command" || (!passage && side === 1);
      box(x, 0.4, room.z, 0.45, 0.8, room.depth, dark);
      box(x - side * 0.12, 0.82, room.z, 0.12, 0.08, room.depth, rim);
      box(x, room.height - 0.4, room.z, 0.6, 0.8, room.depth, dark);
      if (!window)
        box(
          x + side * 0.12,
          room.height / 2,
          room.z,
          0.2,
          room.height,
          room.depth,
          hull,
        );
      const spacing = passage ? 2.4 : 3.4;
      for (let z = front + 0.23; z < back; z += spacing) {
        bevel(x - side * 0.28, 2.15, z, 0.55, 4.3, 0.38, shell, 0.07);
        const brace = bevel(
          x - side * 0.75,
          room.height - 0.86,
          z,
          1.9,
          0.44,
          0.42,
          shell,
          0.05,
        );
        brace.rotation.z = side * 0.64;
        box(x - side * 0.6, 1.25, z + 0.025, 0.07, 0.6, 0.14, dark);
        box(x - side * 0.65, 1.25, z + 0.025, 0.025, 0.3, 0.08, amber);
        if (z + spacing < back + 0.2 && !window) {
          bevel(
            x - side * 0.17,
            2.3,
            z + spacing / 2,
            0.16,
            2.9,
            spacing - 0.5,
            wall,
            0.035,
          );
          box(
            x - side * 0.3,
            2.15,
            z + spacing / 2,
            0.05,
            1.18,
            spacing - 0.9,
            dark,
          );
          for (let k = 0; k < 5; k++)
            box(
              x - side * 0.35,
              1.78 + k * 0.18,
              z + spacing / 2,
              0.025,
              0.045,
              spacing - 1.15,
              rim,
            );
          box(
            x - side * 0.33,
            3.2,
            z + spacing / 2,
            0.04,
            0.05,
            0.8,
            amberPaint,
          );
        }
        // Thin emergency markers can be read without flooding the whole hull with neon.
        box(side * 2.05, 0.015, z, 0.2, 0.02, 0.55, amberPaint);
      }
      // Recessed power conduit: a dark channel with a narrow energized center.
      box(side * 2.35, 0.008, room.z, 0.22, 0.025, room.depth, black);
      box(side * 2.35, 0.026, room.z, 0.035, 0.013, room.depth, trunk);
      pipe(
        [
          [x - side * 0.9, room.height - 0.7, front],
          [x - side * 0.9, room.height - 0.7, back],
        ],
        0.11,
        copper,
      );
      pipe(
        [
          [x - side * 1.2, room.height - 0.57, front],
          [x - side * 1.2, room.height - 0.57, back],
        ],
        0.07,
        rim,
      );
    }
    box(0, room.height + 0.06, room.z, room.width, 0.2, room.depth, black);
    for (let z = front + 0.25; z < back; z += 3.4) {
      box(0, room.height - 0.12, z, room.width - 1, 0.34, 0.4, hull);
      bevel(
        0,
        room.height - 0.35,
        z + 0.06,
        passage ? 3.6 : 5.8,
        0.22,
        0.9,
        dark,
        0.03,
      );
      box(
        0,
        room.height - 0.48,
        z + 0.06,
        passage ? 2.8 : 4.8,
        0.028,
        0.5,
        ceilingLight,
      );
      if (!passage) {
        box(0, room.height - 0.04, z + 1.7, 4.5, 0.09, 2.9, hull);
        for (const x of [-1.9, 1.9])
          box(x, room.height - 0.13, z + 1.7, 0.15, 0.13, 2.9, rim);
      }
    }
    if (!passage) {
      powerLight(feed, 0, 3.65, room.z + 3, "#d4e8df", 110, 3, 20);
      powerLight(feed, -3, 3.65, room.z - 3, "#c2e7e7", 85, 2, 19);
      powerLight(feed, 3.8, 2.5, room.z, "#f4b275", 5, 35, 16);
      powerLight(feed, -3.5, 2.85, room.z + 3, "#ffad65", 3, 33, 13);
    }
  }

  // Layered pressure portals. Functional doors are inside the connecting passages.
  for (const [z, width, height] of [
    [7, 16, 5.4],
    [4, 16, 5.4],
    [-10, 16, 5.4],
    [-14, 20, 6],
  ] as const) {
    const sideWidth = (width - 5.2) / 2;
    for (const side of [-1, 1]) {
      const x = side * (2.6 + sideWidth / 2);
      box(x, height / 2, z, sideWidth, height, 0.5, hull);
      bevel(x, 2.35, z + 0.28, sideWidth - 0.24, 3.9, 0.18, wall, 0.08);
      box(x, 0.45, z + 0.4, sideWidth - 0.22, 0.7, 0.09, dark);
      obstacles.push({ x, z, width: sideWidth, depth: 0.5 });
      bevel(side * 2.65, 1.9, z + 0.18, 0.32, 3.8, 0.6, dark, 0.04);
      box(side * 2.51, 1.8, z + 0.5, 0.04, 3.5, 0.025, amber);
      for (const y of [0.8, 2.9])
        bevel(side * 2.95, y, z + 0.36, 0.36, 0.26, 0.24, rim, 0.02);
    }
    box(0, (height + 3.6) / 2, z, 5.2, height - 3.6, 0.5, hull);
    bevel(0, 3.7, z + 0.13, 5.7, 0.25, 0.64, dark, 0.04);
  }
  box(0, 2.7, 24, 16, 5.4, 0.4, wall);
  label(
    "ASTERION",
    "RECOVERY DECK / RESEARCH DIVISION",
    0,
    3,
    23.76,
    7,
    1.6,
    "#283d48",
    Math.PI,
    false,
  );
  const relayPortal = label(
    "02  /  REACTOR ACCESS",
    "AUXILIARY FEED REQUIRED",
    0,
    4.42,
    7.32,
    4.9,
    0.7,
    "#f0c78e",
  );
  const commandPortal = label(
    "03  /  OBSERVATION",
    "COMMAND & LONG-RANGE COMMUNICATIONS",
    0,
    4.5,
    -9.66,
    4.8,
    0.75,
    "#c1e5e2",
  );
  floorLabel(
    "ENGINEERING",
    "01 / AUXILIARY SYSTEMS",
    0,
    17.5,
    3.2,
    1.25,
    "#b5b8ab",
  );
  floorLabel("POWER RELAY", "02 / DISTRIBUTION", 0, 0, 3.2, 1.2, "#c8a774");
  floorLabel("COMMAND", "03 / COMMUNICATIONS", 0, -18, 3.2, 1.2, "#b7d9d7");
  for (const z of [10, -6, -16])
    floorLabel("⌃", "FORWARD", 0, z, 0.85, 1.2, "#c5cbbd");

  const doors = DOORWAYS.map((z, index) => {
    const doorMat = glow("#efb477", 0.8);
    const leaves: { group: THREE.Group; obstacle: Obstacle; side: number }[] =
      [];
    for (const side of [-1, 1]) {
      const group = liveGroup(side * 3.85, 0, z);
      bevel(0, 1.8, 0, 2.5, 3.6, 0.28, shell, 0.08, group);
      bevel(0, 1.78, 0.16, 2.15, 2.84, 0.06, dark, 0.07, group);
      bevel(0, 1.8, 0.21, 1.88, 2.5, 0.04, hull, 0.05, group);
      for (const yy of [0.65, 2.95])
        box(0, yy, 0.26, 1.9, 0.06, 0.025, rim, group);
      box(-side * 1.13, 1.8, 0.21, 0.07, 2.75, 0.07, doorMat, group);
      hazard(0, 0.33, 0.19, 2.2, group);
      label(
        index === 0 ? "02" : "03",
        "PRESSURE BULKHEAD",
        0,
        1.8,
        0.26,
        1.5,
        0.72,
        "#a7b4b8",
        0,
        false,
        group,
      );
      const obstacle = { x: side * 3.85, z, width: 2.5, depth: 0.28 };
      obstacles.push(obstacle);
      leaves.push({ group, obstacle, side });
    }
    const screen = label(
      "SEALED",
      index === 0 ? "RESTORE AUXILIARY POWER" : "RESTORE DISTRIBUTION",
      0,
      3.25,
      z + 0.3,
      2.1,
      0.38,
      "#ffbc7d",
    );
    return {
      z,
      index,
      leaves,
      screen,
      material: doorMat,
      open: 1,
      target: 0,
      status: "",
      resumeRelease: false,
    };
  });

  // Service stations are open, bolted equipment cabinets connected to their machinery.
  const stations = Object.entries(SHIP_SITES).map(([key, site]) => {
    const id = key as MissionId;
    const x = site.x,
      z = site.z;
    const status = powerMat(id, "#93ecda", 1.5, 0.1);
    bevel(x, 0.1, z, 1.85, 0.2, 1.1, dark, 0.06);
    bevel(x, 0.73, z, 1.43, 1.18, 0.7, shell, 0.09);
    box(x, 0.7, z + 0.365, 1.12, 0.77, 0.05, dark);
    for (let k = 0; k < 7; k++)
      box(x, 0.42 + k * 0.085, z + 0.403, 0.91, 0.025, 0.018, rim);
    bevel(x, 1.57, z - 0.03, 1.94, 1.02, 0.49, dark, 0.09);
    bevel(x, 1.58, z + 0.215, 1.74, 0.83, 0.04, rim, 0.035);
    const display = label(
      SHIP_SYSTEMS[id].label.toUpperCase(),
      "SERVICE PORT / MANUAL REPAIR",
      x,
      1.64,
      z + 0.245,
      1.59,
      0.59,
      "#ffce96",
    );
    box(x, 1.21, z + 0.25, 1.66, 0.055, 0.022, status);
    bevel(x, 1.07, z + 0.35, 1.8, 0.1, 0.49, hull, 0.04);
    for (let k = 0; k < 10; k++)
      box(
        x - 0.7 + k * 0.15,
        1.132,
        z + 0.39,
        0.085,
        0.015,
        0.17,
        k === 9 ? amber : rim,
      );
    // Retracted cover, latch, external coolant hose and deck connection.
    for (const side of [-1, 1]) {
      bevel(x + side * 1.05, 1.62, z - 0.03, 0.18, 0.93, 0.35, shell, 0.03);
      box(x + side * 1.1, 1.55, z + 0.18, 0.035, 0.42, 0.05, amberPaint);
      rod(
        new THREE.Vector3(x + side * 0.67, 0.2, z),
        new THREE.Vector3(x + side * 0.67, 0.85, z),
        0.04,
        rim,
      );
    }
    hazard(x, 0.19, z + 0.57, 1.7);
    obstacles.push({ x, z, width: 2.2, depth: 0.9 });
    const halo = ring(x, 0.025, z, 1.42, 0.012, status);
    halo.castShadow = false;
    const spot = new THREE.PointLight("#e0af7b", 7, 5, 2);
    spot.position.set(x, 2.3, z + 0.8);
    root.add(spot);
    return { id, display, status: "" };
  });
  // Wall-mounted lettering gives the starting interaction a recognizable destination.
  label("01", "ENGINEERING", -4.2, 3.55, 7.35, 2.4, 1.4, "#334750", 0, false);
  label(
    "AUXILIARY POWER",
    "SERVICE CONSOLE  ↓",
    -4,
    2.7,
    10.72,
    2.9,
    0.56,
    "#ffca85",
  );

  // Maintenance bay: enclosed cryogenic racks, overhead hoist, equipment locker and freight.
  for (const [index, z] of [15.5, 20.5].entries()) {
    bevel(-6.9, 1.3, z, 1.25, 2.5, 3.4, shell, 0.14);
    bevel(-6.245, 1.45, z, 0.08, 1.9, 2.78, dark, 0.07);
    for (const dz of [-1.03, 1.03])
      bevel(-6.17, 1.4, z + dz, 0.08, 1.45, 0.12, rim, 0.015);
    box(
      -6.15,
      2.32,
      z,
      0.025,
      0.045,
      2.4,
      powerMat("workshop", "#91d9cb", 1.2, 0.02),
    );
    label(
      `CRYO / ${index + 1}`,
      "CREW SUPPORT · SEALED",
      -6.145,
      1.6,
      z,
      1.65,
      0.43,
      "#afc2c4",
      Math.PI / 2,
    );
    for (let k = 0; k < 5; k++)
      box(-6.15, 0.59 + k * 0.08, z, 0.04, 0.025, 1.95, rim);
  }
  for (const [x, y, z, size] of [
    [6.4, 0.65, 21.5, 1.3],
    [6.4, 1.68, 21.5, 0.78],
    [5.1, 0.38, 21.6, 0.76],
  ]) {
    bevel(x, y, z, size, size, size, hull, 0.08);
    for (const s of [-1, 1])
      box(
        x + s * size * 0.34,
        y,
        z + size / 2 + 0.01,
        size * 0.09,
        size * 0.85,
        0.05,
        amberPaint,
      );
    label(
      "CARGO",
      "AST / SECURED",
      x,
      y,
      z + size / 2 + 0.035,
      size * 0.54,
      size * 0.25,
      "#bdc9c6",
    );
  }
  box(4.6, 4.7, 16.5, 0.3, 0.3, 10, amberPaint);
  box(4.6, 4.46, 15, 1, 0.28, 0.6, dark);
  rod(
    new THREE.Vector3(4.6, 4.32, 15),
    new THREE.Vector3(4.6, 3.35, 15),
    0.018,
    rim,
  );
  ring(4.6, 3.25, 15, 0.13, 0.025, amberPaint).rotation.x = 0;

  // The engineering landmark is a physical emergency power bank, not an unrelated hologram.
  const auxGlow = powerMat("workshop", "#90f0d1", 2, 0.02);
  mesh(new THREE.CylinderGeometry(1.5, 1.65, 0.32, 48), dark, 4.6, 0.16, 13);
  ring(4.6, 0.34, 13, 1.43, 0.04, rim);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3,
      x = 4.6 + Math.cos(a) * 0.91,
      z = 13 + Math.sin(a) * 0.91;
    mesh(new THREE.CylinderGeometry(0.28, 0.28, 2.15, 20), shell, x, 1.47, z);
    for (const y of [0.48, 1.1, 1.8, 2.5])
      mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.11, 20), dark, x, y, z);
    mesh(
      new THREE.CylinderGeometry(0.294, 0.294, 0.1, 20),
      auxGlow,
      x,
      2.29,
      z,
    );
  }
  mesh(new THREE.CylinderGeometry(0.38, 0.38, 3.55, 24), dark, 4.6, 2.1, 13);
  mesh(new THREE.CylinderGeometry(1.23, 1.34, 0.19, 48), hull, 4.6, 2.7, 13);
  pipe(
    [
      [4.6, 2.78, 13],
      [4.6, 4.2, 13],
      [7, 4.2, 13],
      [7, 4.2, 7],
    ],
    0.15,
    copper,
  );
  const reserveSign = label(
    "RESERVE BANK",
    "ISOLATED / AUX–01",
    4.6,
    3.3,
    13.04,
    2.15,
    0.54,
    "#d9bb8d",
  );

  // Reactor: shielded copper coils, solid containment frame, cool energized core and rotor.
  const core = powerMat("harbor", "#a1f4e9", 3.3, 0.015);
  const reactorRotor = liveGroup(-4.7, 2.45, -3);
  mesh(new THREE.CylinderGeometry(1.48, 1.65, 0.3, 64), dark, -4.7, 0.15, -3);
  mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.42, 64), hull, -4.7, 0.48, -3);
  mesh(new THREE.CylinderGeometry(0.52, 0.52, 3.15, 32), core, -4.7, 2.4, -3);
  for (let i = 0; i < 9; i++) {
    const y = 0.93 + i * 0.37;
    ring(-4.7, y, -3, 0.82, 0.095, copper);
    ring(-4.7, y + 0.08, -3, 0.98, 0.022, rim);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const x = -4.7 + Math.cos(a) * 1.15,
      z = -3 + Math.sin(a) * 1.15;
    bevel(x, 2.35, z, 0.26, 3.7, 0.26, shell, 0.045);
    for (const y of [1.1, 3.6]) box(x, y, z, 0.36, 0.25, 0.36, dark);
  }
  mesh(new THREE.CylinderGeometry(1.4, 1.2, 0.35, 64), hull, -4.7, 4.3, -3);
  mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.7, 24), copper, -4.7, 4.77, -3);
  const reactorBand = ring(
    0,
    0,
    0,
    1.32,
    0.025,
    powerMat("harbor", "#8fe5da", 1.4, 0.02),
    reactorRotor,
  );
  reactorBand.rotation.z = 0.15;
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    box(
      Math.cos(a) * 1.32,
      0,
      Math.sin(a) * 1.32,
      0.14,
      0.28,
      0.14,
      rim,
      reactorRotor,
    );
  }
  powerLight("harbor", -4.7, 2.5, -3, "#76ede3", 65, 0, 13);
  reactorRotor.traverse((object) => {
    if (object instanceof THREE.Mesh) object.castShadow = false;
  });
  const reactorSign = label(
    "REACTOR 02",
    "CONTAINMENT / STANDBY",
    -4.7,
    4.75,
    -2.7,
    2.65,
    0.5,
    "#e6c196",
  );
  label(
    "HIGH VOLTAGE",
    "AUTHORIZED SERVICE PERSONNEL",
    -4.7,
    0.62,
    -1.55,
    1.7,
    0.37,
    "#dfb277",
  );
  for (const dz of [-1.35, 1.35])
    pipe(
      [
        [-4.7, 0.3, -3 + dz],
        [-7.1, 0.3, -3 + dz],
        [-7.1, 3.6, -3 + dz],
      ],
      0.13,
      copper,
    );
  // Starboard switchgear frames the relay console without occupying the approach path.
  for (const x of [3.4, 5.2, 7]) {
    bevel(x, 2.12, -8.7, 1.62, 3.9, 0.64, wall, 0.06);
    box(x, 2.1, -8.34, 1.4, 2.9, 0.1, dark);
    for (let k = 0; k < 5; k++) {
      bevel(x, 1 + k * 0.51, -8.23, 1.17, 0.38, 0.12, hull, 0.025);
      box(
        x - 0.42,
        1 + k * 0.51,
        -8.15,
        0.07,
        0.14,
        0.025,
        powerMat("harbor", "#7fdfb9", 0.8, 0.02),
      );
      box(x + 0.26, 1 + k * 0.51, -8.14, 0.3, 0.035, 0.03, rim);
    }
  }

  // Command is an observatory: deliberate low consoles, large glazing and a retracting
  // meteor shield. The player earns the full planetary view by restoring distribution.
  box(0, 0.52, -29, 20, 1.04, 0.4, dark);
  box(0, 5.6, -29, 20, 0.8, 0.6, shell);
  box(
    0,
    1.06,
    -28.78,
    19.8,
    0.055,
    0.1,
    powerMat("harbor", "#bde4df", 1.3, 0.03),
  );
  for (const x of [-10, -5, 0, 5, 10]) {
    bevel(x, 3.25, -29, 0.2, 4.5, 0.4, dark, 0.035);
    rod(
      new THREE.Vector3(x, 1.1, -28.95),
      new THREE.Vector3(x * 0.9, 5.25, -29),
      0.07,
      rim,
    );
  }
  const shield = liveGroup(0, 0, -29.3);
  for (let i = 0; i < 6; i++) {
    bevel(0, 1.4 + i * 0.71, 0, 19.6, 0.7, 0.2, hull, 0.05, shield);
    box(0, 1.13 + i * 0.71, 0.115, 19.4, 0.04, 0.04, rim, shield);
  }
  label(
    "OBSERVATION SHIELD",
    "DISTRIBUTION OFFLINE / MANUAL RECOVERY REQUIRED",
    0,
    3,
    0.13,
    7,
    1,
    "#d9b181",
    0,
    false,
    shield,
  );
  const navigationScreens: ReturnType<typeof label>[] = [];
  for (const x of [-7, 7]) {
    bevel(x, 0.55, -20, 2.6, 1.1, 1.3, shell, 0.12);
    bevel(x, 1.2, -20.15, 2.75, 0.24, 1.45, dark, 0.09);
    const display = label(
      "NAVIGATION",
      "NO DISTRIBUTION FEED",
      x,
      1.58,
      -20.28,
      2.3,
      0.67,
      "#dcb78e",
    );
    display.object.rotation.x = -0.15;
    navigationScreens.push(display);
    box(
      x,
      1.03,
      -19.28,
      2.3,
      0.045,
      0.03,
      powerMat("harbor", "#9edcd5", 1.5, 0.02),
    );
    for (let i = 0; i < 12; i++)
      box(x - 0.96 + i * 0.175, 1.337, -19.76, 0.11, 0.012, 0.22, rim);
  }
  // Forward antenna cabling leads directly from the repair station into the hull.
  for (const side of [-1, 1]) {
    pipe(
      [
        [side * 0.7, 0.12, -23],
        [side * 1.7, 0.12, -25],
        [side * 1.7, 0.12, -28.5],
      ],
      0.048,
      copper,
    );
    box(
      side * 1.7,
      0.05,
      -26.7,
      0.13,
      0.06,
      3.5,
      powerMat("beacon", "#88f5d3", 1.5, 0),
    );
  }
  const commsSign = label(
    "LONG-RANGE COMMS",
    "DUAL-CHANNEL / FAILOVER REQUIRED",
    0,
    2.68,
    -23.15,
    3.2,
    0.63,
    "#b3ded8",
  );

  const planet = buildSpace(scene);
  // Exterior equipment and the curved main hull give the window a credible foreground.
  for (const side of [-1, 1]) {
    bevel(side * 13, -1.7, -15, 5.8, 2.8, 66, hull, 0.4);
    for (const z of [-35, -19, -3, 15]) {
      rod(
        new THREE.Vector3(side * 8, -0.6, z),
        new THREE.Vector3(side * 17, -2.5, z),
        0.25,
        rim,
      );
      bevel(side * 17, -2.5, z, 1.5, 1.1, 9, hull, 0.1);
      box(side * 17, -1.93, z, 0.06, 0.03, 8, cyan);
    }
  }
  batch();
  let signature = "",
    initialized = false,
    shieldLevel = 0,
    shieldReleased = false,
    rotorAngle = 0;
  return {
    root,
    obstacles,
    update(
      dt: number,
      time: number,
      player: Player,
      completed: MissionId[],
      reduced: boolean,
      audible = false,
    ) {
      const events: ("door" | "power")[] = [];
      let shadowsDirty = !initialized;
      const key = completed.join();
      if (signature !== key || !initialized) {
        relayPortal.paint(
          "02  /  REACTOR ACCESS",
          completed.includes("workshop")
            ? "ACCESS RELEASED / DISTRIBUTION SERVICE"
            : "AUXILIARY FEED REQUIRED",
        );
        commandPortal.paint(
          "03  /  OBSERVATION",
          completed.includes("harbor")
            ? "ACCESS RELEASED / COMMAND & COMMUNICATIONS"
            : "DISTRIBUTION FEED REQUIRED",
        );
        reserveSign.paint(
          "RESERVE BANK",
          completed.includes("workshop")
            ? "SUPPLY ONLINE / AUX–01"
            : "ISOLATED / AUX–01",
        );
        reactorSign.paint(
          "REACTOR 02",
          completed.includes("harbor")
            ? "SYNCHRONIZED / PRIMARY BUS ONLINE"
            : "CONTAINMENT / STANDBY",
        );
        commsSign.paint(
          "LONG-RANGE COMMS",
          completed.includes("beacon")
            ? "REDUNDANCY VERIFIED / TRANSMITTER ONLINE"
            : "DUAL-CHANNEL / FAILOVER REQUIRED",
        );
        for (const station of stations) {
          const status = systemStatus(station.id, completed);
          station.display.paint(
            SHIP_SYSTEMS[station.id].label.toUpperCase(),
            status === "ONLINE"
              ? "COMMISSIONED / SYSTEM ONLINE"
              : status === "FAULT"
                ? "FAULT DETECTED / OPEN SERVICE PANEL"
                : "NO FEED / RESTORE UPSTREAM SYSTEM",
            status === "ONLINE"
              ? "#a1efd4"
              : status === "FAULT"
                ? "#ffcf92"
                : "#819498",
          );
        }
        for (const screen of navigationScreens)
          screen.paint(
            completed.includes("harbor") ? "ORBITAL TRACKING" : "NAVIGATION",
            completed.includes("harbor")
              ? "POSITION ACQUIRED / COMMS STANDBY"
              : "NO DISTRIBUTION FEED",
            completed.includes("harbor") ? "#b5e6df" : "#dcb78e",
          );
        if (
          initialized &&
          completed.length > signature.split(",").filter(Boolean).length
        )
          events.push("power");
        signature = key;
      }
      for (const door of doors) {
        if (!initialized)
          door.resumeRelease = Math.abs(player.z - door.z) <= 0.65;
        const access = bulkheadAccess(
          door.index,
          completed,
          player.z,
          door.z,
          door.resumeRelease,
        );
        const target =
          access &&
          Math.abs(player.z - door.z) < SHIP_TUNING.doorApproach &&
          Math.abs(player.x) < 4
            ? 1
            : 0;
        // Never close on a capsule already in the doorway; safe even after restoring old saves.
        const occupied =
          Math.abs(player.z - door.z) < 0.75 && Math.abs(player.x) < 2.8;
        const safeTarget =
          initialized && occupied && door.open > 0.1 ? 1 : target;
        if (!occupied) door.resumeRelease = false;
        if (
          safeTarget !== door.target &&
          initialized &&
          Math.abs(player.z - door.z) < 8
        )
          events.push("door");
        door.target = safeTarget;
        const oldOpen = door.open;
        door.open =
          reduced || !initialized
            ? safeTarget
            : THREE.MathUtils.damp(
                door.open,
                safeTarget,
                SHIP_TUNING.doorDamping,
                dt,
              );
        shadowsDirty ||= Math.abs(oldOpen - door.open) > 0.0001;
        for (const leaf of door.leaves) {
          leaf.group.position.x = leaf.side * (1.25 + door.open * 2.6);
          leaf.obstacle.x = leaf.group.position.x;
        }
        const text = access ? "ACCESS RELEASED" : "BULKHEAD SEALED";
        if (door.status !== text) {
          door.screen.paint(
            text,
            access
              ? "PROXIMITY RELEASE ACTIVE"
              : door.index === 0
                ? "RESTORE AUXILIARY POWER"
                : "RESTORE DISTRIBUTION",
            access ? "#9ee5cc" : "#ffbc7d",
          );
          door.material.color.set(access ? "#91e5cf" : "#e8a76a");
          door.material.emissive.copy(door.material.color);
          door.status = text;
        }
      }
      for (const p of powered) {
        const target = completed.includes(p.id) ? p.online : p.offline;
        p.value =
          reduced || !initialized
            ? target
            : THREE.MathUtils.damp(
                p.value,
                target,
                SHIP_TUNING.powerDamping,
                dt,
              );
        if (p.material) {
          p.material.emissiveIntensity = p.value;
          if (p.color)
            p.material.color
              .copy(p.color)
              .multiplyScalar(0.055 + Math.min(1, p.value / p.online) * 0.75);
        }
        if (p.light) p.light.intensity = p.value;
      }
      // Release the viewing shield at arrival so its reveal is actually witnessed.
      // A resumed player already on Command gets the settled pose without replaying it.
      if (!completed.includes("harbor")) shieldReleased = false;
      else if (player.z < -14 && !shieldReleased) {
        shieldReleased = true;
        if (initialized) events.push("door");
      }
      const shieldTarget = shieldReleased ? 1 : 0;
      const oldShield = shieldLevel;
      shieldLevel =
        reduced || !initialized
          ? shieldTarget
          : THREE.MathUtils.damp(
              shieldLevel,
              shieldTarget,
              SHIP_TUNING.shieldDamping,
              dt,
            );
      shadowsDirty ||= Math.abs(oldShield - shieldLevel) > 0.0001;
      shield.position.y = shieldLevel * 4.7;
      shield.visible = shieldLevel < 0.995;
      if (!reduced && completed.includes("harbor")) rotorAngle += dt * 0.55;
      reactorRotor.rotation.y = rotorAngle;
      planet.rotation.y = time * 0.0007;
      root.userData.shadowsDirty = shadowsDirty;
      initialized = true;
      return audible ? events : [];
    },
  };
}
