import * as THREE from "three";
import { DECK, insideDeck } from "./shipLayout";
import { STATION_DECK, STATION_FURNITURE, FUTURE_LABS, FUTURE_LAB_STATUS } from "./stationLayout";
import { shipArt, surface } from "./shipArt";
import type { Obstacle } from "./navigation";

export type StationLight = {
  x: number; y: number; z: number;
  system: "branch";
  material: THREE.MeshStandardMaterial;
  alwaysOn: boolean;
  intensity: number;
  reach: number;
};

/** Public habitat: pressure shell, common spaces and dormant research bays. */
export function buildMainStation(parent: THREE.Group) {
  const root = new THREE.Group();
  root.name = "Asterion / main station";
  parent.add(root);
  const { box, bevel, mesh, rod, label: rawLabel } = shipArt(root);
  const label = (...args: Parameters<typeof rawLabel>) => {
    args[11] = "center";
    return rawLabel(...args);
  };
  const material = (color: string, metalness = 0.2, roughness = 0.65) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const ceramic = material("#dddcd3", 0.08, 0.75);
  const structure = material("#667b86", 0.5, 0.48);
  const graphite = material("#293d49", 0.2, 0.72);
  const alloy = material("#b3c0c3", 0.65, 0.42);
  const bronze = material("#bc9160", 0.4, 0.55);
  const textile = material("#567773", 0, 0.96);
  const floor = material("#a8b3b5", 0.12, 0.74);
  floor.map = surface("deck");
  floor.map.wrapS = floor.map.wrapT = THREE.RepeatWrapping;
  const light = new THREE.MeshStandardMaterial({
    color: "#e2f0ee", emissive: "#d9e8e7", emissiveIntensity: 1.3,
    roughness: 0.6,
  });
  const warm = new THREE.MeshStandardMaterial({
    color: "#edd2a7", emissive: "#edd2a7", emissiveIntensity: 0.8,
    roughness: 0.7,
  });
  const glass = new THREE.MeshBasicMaterial({
    color: "#a7c6ce", transparent: true, opacity: 0.025,
    depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true,
    toneMapped: false,
  });
  const lights: StationLight[] = [];
  const obstacles: Obstacle[] = STATION_FURNITURE.map((f) => ({ ...f }));
  const fixture = (x: number, y: number, z: number, intensity = 70, reach = 25) => {
    lights.push({ x, y, z, system: "branch", material: light, alwaysOn: true, intensity, reach });
  };
  const groupAt = (x: number, z: number, rotation = 0) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotation;
    root.add(g);
    return g;
  };
  function wall(x: number, z: number, rotation: number, height: number, window: boolean) {
    const g = groupAt(x, z, rotation);
    const reserved = x === 40 && FUTURE_LABS.some((lab) => Math.abs(z - lab.z) <= 2);
    if (window) {
      g.name = "Station observation bay";
      const sill = 1.02, head = 4.9;
      box(0, sill / 2, -0.118, 2, sill, 0.26, graphite, g);
      box(0, (head + height) / 2, -0.118, 2, height - head, 0.26, ceramic, g);
      for (const y of [sill, head])
        bevel(0, y, 0.1, 1.98, 0.16, 0.38, structure, 0.025, g);
      for (const side of [-1, 1])
        bevel(side * 0.92, (sill + head) / 2, 0.08, 0.13, head - sill - 0.19, 0.32, alloy, 0.02, g);
      const pane = mesh(new THREE.PlaneGeometry(1.68, head - sill - 0.22), glass, 0, (head + sill) / 2, -0.025, g);
      pane.name = "station viewport";
      pane.castShadow = pane.receiveShadow = false;
      bevel(0, 0.53, 0.055, 1.82, 0.73, 0.12, ceramic, 0.025, g);
    } else {
      box(0, height / 2, -0.118, 2, height, 0.26, graphite, g);
      if (!reserved) {
        bevel(0, 2.15, 0.035, 1.82, 3.55, 0.07, ceramic, 0.035, g);
        box(0, height - 0.7, 0.025, 1.83, 1.08, 0.05, structure, g);
        for (const y of [height - 1.02, height - 0.83, height - 0.64, height - 0.45])
          box(0, y, 0.057, 1.54, 0.035, 0.012, graphite, g);
      }
    }
    // Short modules leave reveals at their joins and at perpendicular corners.
    box(0, 0.19, 0.075, 1.66, 0.28, 0.15, structure, g);
    box(0, 0.36, 0.065, 1.66, 0.025, 0.04, warm, g);
  }
  function boundary(
    room: (typeof STATION_DECK)[number], length: number,
    point: (t: number) => [number, number], rotation: number,
  ) {
    const height = room.name === "Station commons" ? 6.2 : room.height;
    for (let t = 1; t < length; t += 2) {
      const [x, z] = point(t);
      const ox = x - Math.sin(rotation) * 0.15;
      const oz = z - Math.cos(rotation) * 0.15;
      if (insideDeck(ox, oz)) {
        const neighbor = DECK.find((r) => Math.abs(ox - r.x) <= r.width / 2 && Math.abs(oz - r.z) <= r.depth / 2)!;
        if (neighbor.height < height) {
          const g = groupAt(x, z, rotation);
          box(0, (height + neighbor.height) / 2, 0.13, 2, height - neighbor.height, 0.26, ceramic, g);
        }
        continue;
      }
      const viewport = x === -20 ||
        (room.name === "Docking gallery" && (((x === -2 || x === 22) && z < 91) || (z === 93 && Math.abs(x - 10) > 2 && Math.abs(x - 10) < 10)));
      wall(x, z, rotation, height, viewport);
    }
  }
  for (const room of STATION_DECK) {
    const x0 = room.x - room.width / 2, x1 = room.x + room.width / 2;
    const z0 = room.z - room.depth / 2, z1 = room.z + room.depth / 2;
    const deck = new THREE.PlaneGeometry(room.width, room.depth);
    const uv = deck.attributes.uv;
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, uv.getX(i) * room.width / 3, uv.getY(i) * room.depth / 3);
    mesh(deck, floor, room.x, -0.015, room.z).rotation.x = -Math.PI / 2;
    boundary(room, room.width, t => [x0 + t, z0], 0);
    boundary(room, room.width, t => [x0 + t, z1], Math.PI);
    boundary(room, room.depth, t => [x0, z0 + t], Math.PI / 2);
    boundary(room, room.depth, t => [x1, z0 + t], -Math.PI / 2);
    if (room.name === "Station commons") continue;
    box(room.x, room.height + 0.09, room.z, room.width, 0.18, room.depth, ceramic);
    for (let z = z0 + 2; z < z1; z += 6) {
      box(room.x, room.height - 0.2, z, room.width - 0.4, 0.25, 0.22, structure);
      box(room.x, room.height - 0.35, z, room.width - 1.4, 0.04, 0.25, light);
      fixture(room.x, Math.min(4.5, room.height - 0.6), z, 65, 23);
    }
  }

  // A continuous octagonal pressure shell; ribs use one extruded silhouette.
  const profile = [[-18, 6.2], [-12, 11.2], [12, 11.2], [18, 6.2]];
  for (let i = 1; i < profile.length; i++) {
    if (i === 2) continue;
    const [ax, ay] = profile[i - 1], [bx, by] = profile[i];
    const roof = box(10 + (ax + bx) / 2, (ay + by) / 2 + 0.1, 60,
      Math.hypot(bx - ax, by - ay), 0.18, 42, ceramic);
    roof.rotation.z = Math.atan2(by - ay, bx - ax);
  }
  // A protected zenith light well breaks the broad ceiling into pressure bays.
  for (const x of [3, 17]) box(x, 11.3, 60, 10, 0.18, 42, ceramic);
  for (const x of [8.05, 11.95]) box(x, 11, 60, 0.18, 0.2, 41.6, structure);
  for (const z of [44.4, 52, 60, 68, 75.6])
    box(10, 11, z, 3.68, 0.2, 0.14, structure);
  const skylight = mesh(new THREE.PlaneGeometry(3.76, 41.6), glass, 10, 11.15, 60);
  skylight.rotation.x = Math.PI / 2;
  skylight.name = "Station zenith glazing";
  skylight.castShadow = skylight.receiveShadow = false;
  const arch = new THREE.Shape([
    [-17.9, 5.65], [-11.9, 10.65], [11.9, 10.65], [17.9, 5.65],
    [17.9, 6.07], [12.05, 11.04], [-12.05, 11.04], [-17.9, 6.07],
  ].map(([x, y]) => new THREE.Vector2(x, y)));
  const rib = new THREE.ExtrudeGeometry(arch, { depth: 0.36, bevelEnabled: false });
  const end = new THREE.Shape([
    [-18, 6.2], [-12, 11.2], [12, 11.2], [18, 6.2],
  ].map(([x, y]) => new THREE.Vector2(x, y)));
  const endGeometry = new THREE.ExtrudeGeometry(end, { depth: 0.18, bevelEnabled: false });
  mesh(endGeometry, ceramic, 10, 0, 39.04);
  mesh(endGeometry, ceramic, 10, 0, 80.78);
  for (const z of [40.8, 48, 56, 64, 72, 79.2]) {
    mesh(rib, structure, 10, 0, z - 0.18);
    for (const side of [-1, 1]) {
      const x = 10 + side * 17.72;
      bevel(x, 2.78, z, 0.35, 5.56, 0.38, structure, 0.04);
      bevel(x, 0.35, z, 0.52, 0.7, 0.6, graphite, 0.045);
      obstacles.push({ x, z, width: 0.52, depth: 0.6 });
      box(10 + side * 11.7, 10.35, z, 0.16, 0.06, 1.1, light);
    }
  }
  for (const x of [-1, 21]) {
    // Suspended service spines with paired, downward-facing luminaires.
    box(x, 7.8, 60, 0.34, 0.44, 39.5, graphite);
    for (const z of [43, 51, 59, 67, 77]) {
      rod(new THREE.Vector3(x, 8.04, z), new THREE.Vector3(x, 10.5, z), 0.025, alloy);
      bevel(x, 7.55, z, 1.5, 0.12, 3, ceramic, 0.035);
      box(x, 7.476, z, 1.26, 0.018, 2.72, light);
      fixture(x, 5, z, 115, 29);
    }
  }
  label("ASTERION", "", 10, 8.65, 80.76, 10, 1.45, "#486271", Math.PI, false);
  label("COMMONS", "", 10, 7.4, 80.75, 3.6, 0.36, "#718b94", Math.PI, false);
  label("MAIN STATION", "", 10, 4.68, 34.8, 3.2, 0.34, "#354f60", Math.PI, false);
  label("CIRCUITS  /  01", "", 10, 3.25, 39.27, 3.35, 0.28, "#516e79", 0, false);

  // A narrow metal inlay carries the arrival route around the two habitat gardens.
  for (const x of [6.3, 13.7])
    box(x, 0.002, 60, 0.035, 0.009, 39.6, bronze);
  const leafGeometry = new THREE.SphereGeometry(1, 10, 6);
  const leaves = material("#52745a", 0, 0.94);
  const soil = material("#303d36", 0, 1);
  for (const f of STATION_FURNITURE) {
    if (f.kind === "garden") {
      bevel(f.x, 0.39, f.z, f.width, 0.78, f.depth, ceramic, 0.13);
      box(f.x, 0.795, f.z, f.width - 0.24, 0.03, f.depth - 0.24, soil);
      for (const side of [-1, 1])
        box(f.x + side * 1.51, 0.18, f.z, 0.025, 0.025, f.depth - 0.4, warm);
      for (const dz of [-2.4, -0.8, 0.8, 2.4]) for (const dx of [-0.65, 0.65]) {
        for (let i = 0; i < 5; i++) {
          const angle = i * Math.PI * 0.4 + dz;
          const leaf = mesh(leafGeometry, leaves,
            f.x + dx + Math.cos(angle) * 0.17, 1.12, f.z + dz + Math.sin(angle) * 0.17);
          leaf.scale.set(0.13, 0.43, 0.045);
          leaf.rotation.set(Math.cos(angle) * 0.55, angle, Math.sin(angle) * 0.6);
        }
      }
    } else if (f.kind === "seat") {
      bevel(f.x, 0.28, f.z, 1.05, 0.5, 3.9, structure, 0.1);
      bevel(f.x - 0.05, 0.57, f.z, 0.9, 0.16, 3.75, textile, 0.075);
      bevel(f.x + 0.4, 0.84, f.z, 0.16, 0.66, 3.76, ceramic, 0.065);
      for (const dz of [-1.88, 1.88]) bevel(f.x, 0.73, f.z + dz, 0.96, 0.08, 0.1, alloy, 0.03);
    } else if (f.kind === "galley") {
      bevel(f.x, 0.53, f.z, 5.9, 1.06, 2.1, ceramic, 0.09);
      bevel(f.x, 1.105, f.z, 6, 0.08, 2.2, graphite, 0.03);
      for (const dx of [-2, 0, 2]) {
        box(f.x + dx, 0.51, f.z + 1.057, 1.75, 0.84, 0.025, structure);
        box(f.x + dx, 0.86, f.z + 1.08, 0.5, 0.035, 0.04, alloy);
      }
      bevel(f.x - 1.8, 1.64, f.z - 0.45, 1.1, 0.98, 0.72, structure, 0.04);
      box(f.x - 1.8, 1.72, f.z - 0.081, 0.6, 0.5, 0.012, graphite);
      label("GALLEY", "", 23, 2.8, 39.14, 2.1, 0.3, "#46616e", 0, false);
    } else {
      for (const dx of [-0.77, 0.77]) for (const dz of [-0.77, 0.77]) {
        bevel(f.x + dx, 0.65, f.z + dz, 1.38, 1.3, 1.38, graphite, 0.09);
        box(f.x + dx, 0.67, f.z + dz + 0.697, 1.1, 0.87, 0.018, bronze);
        for (const offset of [-0.37, 0.37])
          box(f.x + dx + offset, 0.67, f.z + dz + 0.714, 0.035, 1.08, 0.02, alloy);
      }
    }
  }

  function dormantHatch(x: number, z: number, rotation: number, title: string, caption: string) {
    const g = groupAt(x, z, rotation);
    g.name = `Closed bay / ${title}`;
    const turned = Math.abs(Math.sin(rotation)) > 0.5;
    obstacles.push({
      x: x + Math.sin(rotation) * 0.15,
      z: z + Math.cos(rotation) * 0.15,
      width: turned ? 0.4 : 3.9,
      depth: turned ? 3.9 : 0.4,
    });
    bevel(0, 1.75, 0.04, 3.9, 3.5, 0.15, structure, 0.16, g);
    bevel(0, 1.62, 0.14, 3.35, 3.12, 0.09, graphite, 0.14, g);
    for (const side of [-1, 1]) {
      bevel(side * 0.8, 1.63, 0.205, 1.54, 2.95, 0.07, ceramic, 0.08, g);
      box(side * 0.18, 1.5, 0.252, 0.07, 0.5, 0.018, structure, g);
    }
    bevel(0, 3.97, 0.13, 5.15, 0.89, 0.09, graphite, 0.025, g);
    label(title, "", 0, 4.1, 0.185, 4.8, 0.38, "#d4e2df", 0, false, g);
    label(caption, "", 0, 3.72, 0.185, 2.7, 0.16, "#d5b985", 0, false, g);
  }
  for (const lab of FUTURE_LABS)
    dormantHatch(lab.x - 0.16, lab.z, -Math.PI / 2, lab.name, FUTURE_LAB_STATUS.toUpperCase());
  dormantHatch(10, 92.82, Math.PI, "BERTH 02", "TRANSFER VEHICLE DOCKED");
  label("EARTH GALLERY", "", -19.7, 5.45, 61, 4.4, 0.37, "#486271", Math.PI / 2, false);
  label("RESEARCH", "", 39.72, 5.3, 60, 4.8, 0.44, "#a1babd", -Math.PI / 2, false);

  // Life-support racks are part of the architecture, without interactive screens.
  for (const x of [-5.5, -3.5, -1.5, 0.5]) {
    bevel(x, 1.35, 40, 1.65, 2.7, 0.75, structure, 0.06);
    box(x, 1.35, 40.385, 1.39, 2.38, 0.02, graphite);
    for (const y of [0.6, 0.82, 1.04, 1.26, 1.48, 1.7, 1.92])
      box(x, y, 40.406, 1.1, 0.035, 0.014, alloy);
    box(x + 0.54, 2.26, 40.41, 0.055, 0.055, 0.022, warm);
    obstacles.push({ x, z: 40, width: 1.65, depth: 0.75 });
  }
  label("ENVIRONMENTAL SYSTEMS", "", -2.5, 3.35, 39.14, 5.4, 0.28, "#526d76", 0, false);

  // Docked transport and radiator booms give the gallery a foreground exterior.
  const hull = new THREE.CylinderGeometry(2.15, 2.15, 8.5, 24);
  mesh(hull, ceramic, 10, 3.4, 104.5).rotation.x = Math.PI / 2;
  const collar = new THREE.TorusGeometry(2.16, 0.13, 8, 32);
  for (const z of [100.5, 104.5, 108.5]) mesh(collar, structure, 10, 3.4, z);
  mesh(new THREE.CylinderGeometry(1.06, 1.06, 7, 16), graphite, 10, 3.4, 96.5).rotation.x = Math.PI / 2;
  mesh(new THREE.SphereGeometry(2.14, 24, 12), ceramic, 10, 3.4, 108.55).scale.set(1, 1, 0.48);
  for (const side of [-1, 1]) {
    box(10 + side * 6.8, 2, 105, 8.8, 0.12, 0.3, alloy);
    box(10 + side * 9.1, 2.06, 105, 5.4, 0.1, 7, graphite);
    for (let i = 0; i < 5; i++)
      box(10 + side * 9.1, 2.123, 102.35 + i * 1.32, 5.1, 0.024, 1.2, structure);
  }
  // A nearby radiator is seen below the Earth windows, leaving the horizon clear.
  box(-29, -2.2, 61, 17.5, 0.2, 0.35, alloy);
  for (const z of [53, 61, 69]) {
    box(-34, -2, z, 7, 0.15, 6.6, ceramic);
    for (const x of [-36, -34, -32]) box(x, -1.914, z, 0.06, 0.016, 6.3, graphite);
  }
  return { root, obstacles, lights };
}
