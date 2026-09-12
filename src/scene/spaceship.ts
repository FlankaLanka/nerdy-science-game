import * as THREE from "three";
import { ACTIVITIES, available } from "../activities";
import type { ActivityId } from "../activities";
import { DECK, FURNITURE } from "./shipLayout";
import { shipArt, surface } from "./shipArt";
import type { Obstacle, Player } from "./navigation";
import { buildSpace } from "./space";
/** A fixed modular kit, placed against a connected deck plan. No procedural room generation. */
export function buildSpaceship(scene: THREE.Scene) {
  const root = new THREE.Group();
  root.name = "Asterion / maintenance station";
  scene.add(root);
  const { box, bevel, rod, mesh, label, floorLabel, batch } = shipArt(root);
  const obstacles: Obstacle[] = FURNITURE.map((f) => ({ ...f }));
  const mat = (color: string, metalness = 0.35, roughness = 0.65) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const ivory = mat("#979c90", 0.18, 0.76),
    frame = mat("#46504c", 0.65, 0.42),
    charcoal = mat("#202724", 0.45, 0.68),
    rubber = mat("#0e1412", 0.03, 0.96),
    steel = mat("#73827b", 0.8, 0.32),
    copper = mat("#89613d", 0.75, 0.42),
    ochre = mat("#b28e4d", 0.2, 0.7),
    green = mat("#647b69", 0.25, 0.7);
  ivory.map = surface("panel");
  const floor = mat("#777d73", 0.7, 0.8);
  const loader = new THREE.TextureLoader();
  const maps = ["deck-color", "deck-normal", "deck-roughness"].map((name) => {
    const t = loader.load(`/materials/${name}.jpg`, () => {
      root.userData.textureRevision = (root.userData.textureRevision ?? 0) + 1;
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  });
  maps[0].colorSpace = THREE.SRGBColorSpace;
  floor.map = maps[0];
  floor.normalMap = maps[1];
  floor.normalScale.set(0.45, 0.45);
  floor.roughnessMap = maps[2];
  const emission = (color: string, power = 1) =>
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: power,
      roughness: 0.4,
    });
  const trims = new Map<string, THREE.Material>();
  const amber = emission("#edb56a", 1.4),
    screen = emission("#8aa992", 0.7);
  const fixtures: {
    x: number;
    y: number;
    z: number;
    system: ActivityId;
    color: THREE.Color;
    material: THREE.MeshStandardMaterial;
  }[] = [];
  const signs: { id: ActivityId; paint: (text: string) => void }[] = [];
  const fans: { g: THREE.Group; id: ActivityId }[] = [];
  const dynamic = (x: number, y: number, z: number) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.userData.dynamic = true;
    root.add(g);
    return g;
  };
  function bolt(
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = root,
  ) {
    const o = mesh(
      new THREE.CylinderGeometry(0.036, 0.036, 0.023, 6),
      steel,
      x,
      y,
      z,
      parent,
    );
    o.rotation.x = Math.PI / 2;
    return o;
  }
  function tube(
    a: number[],
    b: number[],
    r = 0.055,
    m: THREE.Material = copper,
    parent: THREE.Object3D = root,
  ) {
    return rod(
      new THREE.Vector3(...(a as [number, number, number])),
      new THREE.Vector3(...(b as [number, number, number])),
      r,
      m,
      parent,
    );
  }
  function wallModule(
    x: number,
    z: number,
    rotation: number,
    h: number,
    color: string,
    w = 2,
  ) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotation;
    root.add(g);
    box(0, h / 2, 0, w, h, 0.3, charcoal, g);
    bevel(0, 1.85, 0.19, w - 0.14, 2.25, 0.18, ivory, 0.07, g);
    bevel(0, 0.42, 0.25, w - 0.1, 0.66, 0.25, frame, 0.04, g);
    box(0, 1.05, 0.33, w - 0.14, 0.06, 0.06, ochre, g);
    box(0, 3.02, 0.25, w - 0.12, 0.16, 0.23, frame, g);
    for (const side of [-1, 1]) {
      box(side * (w / 2 - 0.055), h / 2, 0.25, 0.11, h, 0.35, steel, g);
      for (const y of [0.83, 2.88]) bolt(side * (w / 2 - 0.22), y, 0.304, g);
    }
    for (let y = 3.28; y < h - 0.18; y += 0.24)
      box(0, y, 0.18, w - 0.24, 0.085, 0.15, frame, g);
    box(0, 0.96, 0.25, w - 0.14, 0.035, 0.2, rubber, g);
    box(0, 2.55, 0.302, w - 0.6, 0.024, 0.012, charcoal, g);
    let trim = trims.get(color);
    if (!trim) {
      trim = mat(color, 0.35, 0.7);
      trims.set(color, trim);
    }
    box(0, 1.14, 0.303, w - 0.14, 0.025, 0.015, trim, g);
  }
  function edge(
    length: number,
    point: (t: number) => [number, number],
    outside: (t: number) => [number, number],
    rotation: number,
    h: number,
    color: string,
  ) {
    for (let t = 0; t < length;) {
      const width = Math.min(2, length - t),
        samples = Array.from({ length: width }, (_, i) => t + i + 0.5);
      const heights = samples.map((v) => {
        const [x, z] = outside(v);
        return Math.max(
          0,
          ...DECK.filter(
            (r) =>
              Math.abs(x - r.x) <= r.width / 2 &&
              Math.abs(z - r.z) <= r.depth / 2,
          ).map((r) => r.height),
        );
      });
      if (heights.every((v) => v === 0)) {
        const [x, z] = point(t + width / 2);
        wallModule(x, z, rotation, h, color, width);
      } else
        for (let i = 0; i < samples.length; i++) {
          const [x, z] = point(samples[i]);
          if (!heights[i]) wallModule(x, z, rotation, h, color, 1);
          else if (heights[i] < h) {
            const top = box(
              x,
              (heights[i] + h) / 2,
              z,
              1,
              h - heights[i],
              0.3,
              charcoal,
            );
            top.rotation.y = rotation;
          }
        }
      t += width;
    }
  }
  for (const room of DECK) {
    const x0 = room.x - room.width / 2,
      x1 = room.x + room.width / 2,
      z0 = room.z - room.depth / 2,
      z1 = room.z + room.depth / 2;
    const floorGeometry = new THREE.PlaneGeometry(room.width, room.depth);
    const uv = floorGeometry.attributes.uv;
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, (uv.getX(i) * room.width) / 2, (uv.getY(i) * room.depth) / 2);
    const f = mesh(floorGeometry, floor, room.x, -0.015, room.z);
    f.rotation.x = -Math.PI / 2;
    box(
      room.x,
      room.height + 0.1,
      room.z,
      room.width,
      0.2,
      room.depth,
      charcoal,
    );
    edge(
      room.width,
      (t) => [x0 + t, z0],
      (t) => [x0 + t, z0 - 0.1],
      0,
      room.height,
      room.color,
    );
    edge(
      room.width,
      (t) => [x0 + t, z1],
      (t) => [x0 + t, z1 + 0.1],
      Math.PI,
      room.height,
      room.color,
    );
    edge(
      room.depth,
      (t) => [x0, z0 + t],
      (t) => [x0 - 0.1, z0 + t],
      Math.PI / 2,
      room.height,
      room.color,
    );
    edge(
      room.depth,
      (t) => [x1, z0 + t],
      (t) => [x1 + 0.1, z0 + t],
      -Math.PI / 2,
      room.height,
      room.color,
    );
    for (const dx of [-0.5, 0.5])
      tube(
        [room.x + dx, room.height - 0.55, z0],
        [room.x + dx, room.height - 0.55, z1],
        0.07,
        dx > 0 ? copper : steel,
      );
    for (let z = z0 + 1; z < z1; z += 3) {
      box(room.x, room.height - 0.2, z, room.width, 0.3, 0.3, frame);
      box(
        room.x,
        room.height - 0.38,
        z,
        Math.max(1, room.width - 0.8),
        0.08,
        0.45,
        rubber,
      );
      for (const dx of [-0.5, 0.5])
        box(room.x + dx, room.height - 0.52, z, 0.22, 0.25, 0.14, charcoal);
    }
    const lamp = emission(room.color, 1);
    const lx = room.x + (room.width > 8 ? room.width * 0.22 : 0),
      lz = room.z;
    bevel(lx, room.height - 0.32, lz, 1.45, 0.22, 0.52, rubber, 0.04);
    box(lx, room.height - 0.445, lz, 1.2, 0.02, 0.32, lamp);
    fixtures.push({
      x: lx,
      y: room.height - 0.75,
      z: lz,
      system: room.system,
      color: new THREE.Color(room.color),
      material: lamp,
    });
    if (room.width > 6) {
      floorLabel(
        room.name.toUpperCase(),
        "MAINTENANCE / " + activityCode(room.system),
        room.x,
        room.z + room.depth / 2 - 1.4,
        4,
        0.65,
        room.color,
      );
      label(
        room.name.toUpperCase(),
        "ASTERION · TECHNICAL OPERATIONS",
        room.x,
        3.1,
        z0 + 0.38,
        Math.min(4.6, room.width - 2),
        0.52,
        room.color,
      );
      for (const dx of [-1.8, 1.8])
        tube(
          [room.x + dx, 3.38, z0 + 0.3],
          [room.x + dx, room.height, z0 + 0.3],
          0.025,
          steel,
        );
      // Structural haunches soften the rectangular silhouette at ceiling junctions.
      for (const side of [-1, 1]) {
        const o = box(
          room.x + side * (room.width / 2 - 0.35),
          room.height - 0.45,
          room.z,
          0.65,
          0.8,
          room.depth,
          frame,
        );
        o.rotation.z = side * 0.24;
      }
    }
  }
  function portal(
    x: number,
    z: number,
    rotation: number,
    name: string,
    sub: string,
  ) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotation;
    root.add(g);
    for (const side of [-1, 1]) {
      const turned = Math.abs(Math.sin(rotation)) > 0.5;
      obstacles.push({
        x: x + side * 1.85 * Math.cos(rotation),
        z: z - side * 1.85 * Math.sin(rotation),
        width: turned ? 0.75 : 0.34,
        depth: turned ? 0.34 : 0.75,
      });
      bevel(side * 1.85, 1.45, 0, 0.34, 2.9, 0.75, steel, 0.09, g);
      box(side * 1.61, 1.4, 0.12, 0.075, 2.5, 0.55, rubber, g);
      box(side * 1.7, 0.8, 0.41, 0.055, 1, 0.025, amber, g);
    }
    bevel(0, 3.02, 0, 4, 0.5, 0.8, frame, 0.08, g);
    label(name, sub, 0, 3.05, 0.43, 3.15, 0.32, "#c7d6bf", 0, true, g);
    box(0, 0.02, 0, 3.4, 0.04, 0.75, rubber, g);
  }
  portal(0, 13, 0, "STATION HUB", "AUXILIARY POWER REQUIRED");
  portal(-8, 10, Math.PI / 2, "MATERIALS", "SENSOR CALIBRATION");
  portal(8, 10, -Math.PI / 2, "DISTRIBUTION", "INTERLOCK CIRCUITS");
  portal(0, -11, 0, "COMMAND", "COMMUNICATIONS ARRAY");
  portal(-14, 2.8, 0, "LIFE SUPPORT", "WEST SERVICE GALLERY");
  portal(14, 2.8, 0, "RESERVE VAULT", "EAST SERVICE GALLERY");
  const door = dynamic(0, 0, 13);
  const leaves: THREE.Group[] = [];
  const doorColliders: Obstacle[] = [];
  for (const side of [-1, 1]) {
    const leaf = new THREE.Group();
    door.add(leaf);
    leaf.position.x = side * 2.6;
    leaves.push(leaf);
    bevel(0, 1.45, 0, 1.65, 2.9, 0.22, ivory, 0.06, leaf);
    box(0, 0.48, 0.14, 1.5, 0.45, 0.08, frame, leaf);
    box(side * 0.57, 1.3, 0.15, 0.15, 0.5, 0.06, charcoal, leaf);
    for (const y of [1, 1.2, 2.2])
      box(0, y, 0.135, 1.35, 0.035, 0.01, frame, leaf);
    const obstacle: Obstacle = {
      x: side * 2.6,
      z: 13,
      width: 1.65,
      depth: 0.3,
    };
    doorColliders.push(obstacle);
    obstacles.push(obstacle);
  }
  const hatch = label(
    "POWER ISOLATED",
    "REPAIR ENGINEERING AUXILIARY",
    0,
    2.36,
    13.2,
    2.35,
    0.42,
    "#e4bb7f",
  );
  signs.push({ id: "workshop", paint: (t) => hatch.paint(t) });
  // One readable, physical instrument cabinet at each repair site.
  for (const a of ACTIVITIES) {
    const g = new THREE.Group();
    g.position.set(a.x, 0, a.z);
    root.add(g);
    obstacles.push({ x: a.x, z: a.z, width: 1.65, depth: 0.9 });
    bevel(0, 0.58, 0, 1.65, 1.16, 0.85, charcoal, 0.1, g);
    bevel(0, 1.36, -0.12, 1.72, 0.76, 0.62, ivory, 0.07, g);
    bevel(0, 1.43, 0.225, 1.16, 0.5, 0.08, rubber, 0.04, g);
    const readout = label(
      a.code,
      "LOCAL DIAGNOSTICS",
      0,
      1.44,
      0.277,
      1.03,
      0.36,
      a.color,
      0,
      true,
      g,
    );
    signs.push({ id: a.id, paint: readout.paint });
    box(0, 1.05, 0.39, 1.5, 0.09, 0.4, steel, g);
    for (let i = 0; i < 7; i++)
      bevel(
        -0.53 + i * 0.13,
        1.105,
        0.4,
        0.09,
        0.05,
        0.13,
        i === 6 ? ochre : charcoal,
        0.01,
        g,
      );
    for (const x of [-0.71, 0.71])
      for (const y of [0.19, 0.91]) bolt(x, y, 0.438, g);
    for (let j = 0; j < 5; j++)
      box(0, 0.34 + j * 0.075, 0.436, 0.95, 0.023, 0.025, steel, g);
    for (const x of [-0.68, 0.68])
      box(x, 1.8, -0.14, 0.04, 0.48, 0.045, steel, g);
    label(
      a.system.toUpperCase(),
      "PRESS E · SERVICE EQUIPMENT",
      0,
      1.92,
      -0.06,
      2,
      0.36,
      a.color,
      0,
      true,
      g,
    );
    floorLabel(a.code, "SERVICE CLEARANCE", a.x, a.z + 1.1, 1.5, 0.4, a.color);
    tube(
      [a.x - 0.62, 0.28, a.z - 0.2],
      [a.x - 0.62, 0.12, a.z - 1.3],
      0.035,
      rubber,
    );
  }
  // Hub: a heat-exchanger tower, with walkable sightline breaks and pipe manifolds.
  const hx = -1.5,
    hz = 4.5;
  bevel(hx, 0.25, hz, 3.25, 0.5, 3.25, frame, 0.12);
  mesh(new THREE.CylinderGeometry(1.2, 1.3, 3.7, 32), steel, hx, 2.3, hz);
  for (let y = 0.7; y < 4.3; y += 0.27) {
    const tor = mesh(
      new THREE.TorusGeometry(1.27, 0.06, 5, 36),
      copper,
      hx,
      y,
      hz,
    );
    tor.rotation.x = Math.PI / 2;
  }
  for (const side of [-1, 1]) {
    tube([hx + side * 1.6, 0.4, hz], [hx + side * 1.6, 4.5, hz], 0.13, frame);
    tube([hx + side * 1.6, 4.5, hz], [hx + side * 1.6, 4.5, -1.5], 0.13, frame);
  }
  label(
    "THERMAL EXCHANGE",
    "CENTRAL SERVICES / 07",
    hx,
    2.1,
    hz + 1.34,
    1.5,
    0.42,
    "#d6c5a4",
  );
  function rack(x: number, z: number, rotation = 0) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotation;
    root.add(g);
    bevel(0, 1.45, 0, 1.25, 2.9, 0.7, frame, 0.04, g);
    for (let i = 0; i < 6; i++) {
      bevel(0, 0.3 + i * 0.43, 0.38, 1.08, 0.35, 0.16, charcoal, 0.025, g);
      for (let j = 0; j < 5; j++)
        box(
          -0.3 + j * 0.13,
          0.3 + i * 0.43,
          0.47,
          0.04,
          0.025,
          0.016,
          j % 2 ? screen : amber,
          g,
        );
      box(0.38, 0.3 + i * 0.43, 0.48, 0.06, 0.24, 0.035, steel, g);
    }
  }
  for (const z of [10, 12, 14]) rack(18.3, z, -Math.PI / 2);
  for (const z of [-3, -5, -7]) rack(17.6, z, -Math.PI / 2);
  // Materials: work surfaces, specimens, oscilloscope, storage cabinets.
  bevel(-17.3, 0.89, 11, 1.25, 0.16, 5, steel, 0.04);
  for (const z of [9, 13]) {
    box(-17.3, 0.43, z, 1.1, 0.86, 0.12, frame);
    bevel(-17.2, 1.3, z, 0.8, 0.6, 0.6, ivory, 0.04);
    label("SAMPLE", "ρ · L · A", -17.2, 1.34, z + 0.31, 0.63, 0.3, "#b8d3b1");
  }
  for (let i = 0; i < 6; i++)
    tube(
      [-17.7, 1.03, 10 + i * 0.18],
      [-16.9, 1.03, 10 + i * 0.18],
      0.015,
      i % 2 ? copper : steel,
    );
  // Engineering: reserve cells, oxygen cylinders, tool lockers.
  for (const z of [20, 21.5, 23]) {
    mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.8, 20), green, 3.6, 1.12, z);
    for (const y of [0.38, 1.58]) {
      const t = mesh(
        new THREE.TorusGeometry(0.56, 0.04, 5, 24),
        steel,
        3.6,
        y,
        z,
      );
      t.rotation.x = Math.PI / 2;
    }
    box(3.6, 2.1, z, 0.25, 0.25, 0.2, steel);
  }
  for (const x of [-4.6, -3.2, -1.8]) {
    bevel(x, 1.2, 25.4, 1.2, 2.4, 0.75, ivory, 0.06);
    box(x + 0.38, 1.2, 24.98, 0.05, 0.3, 0.09, steel);
    label(
      "AST / 07",
      "CREW EQUIPMENT",
      x,
      1.8,
      24.99,
      0.8,
      0.25,
      "#b9bca7",
      Math.PI,
    );
  }
  function fan(x: number, z: number) {
    const g = dynamic(x, 2, z);
    bevel(0, 0, 0, 1.65, 1.65, 0.45, frame, 0.08, g);
    const rotor = new THREE.Group();
    g.add(rotor);
    for (let i = 0; i < 5; i++) {
      const blade = bevel(0, 0.43, 0.28, 0.32, 0.75, 0.06, steel, 0.04, rotor);
      blade.rotation.z = (i * Math.PI * 2) / 5;
      blade.position.set(
        -Math.sin((i * Math.PI * 2) / 5) * 0.4,
        Math.cos((i * Math.PI * 2) / 5) * 0.4,
        0.28,
      );
    }
    for (let i = -3; i <= 3; i++)
      box(i * 0.2, 0, 0.39, 0.025, 1.5, 0.05, charcoal, g);
    fans.push({ g: rotor, id: "power" });
  }
  for (const z of [-2.2, -5, -7.8]) {
    fan(-17.55, z);
    bevel(-17.8, 0.6, z, 1.2, 1.2, 1.8, green, 0.08);
  }
  // Command: two angled navigation desks, inset monitors and an observation aperture.
  for (const side of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(side * 5.9, 0, -18);
    g.rotation.y = -side * 0.28;
    root.add(g);
    bevel(0, 0.9, 0, 1.5, 0.6, 2.8, frame, 0.1, g);
    for (const z of [-0.75, 0.65]) {
      bevel(0, 1.45, z, 1.25, 0.72, 0.3, ivory, 0.07, g);
      label(
        "NAV / ASTERION",
        "PASSIVE TELEMETRY",
        0,
        1.47,
        z + 0.17,
        1,
        0.44,
        "#9cb7a6",
        0,
        true,
        g,
      );
    }
  }
  // Window glass is an inset luminous deep-space screen; original exterior remains behind the hull.
  const space = buildSpace(scene);
  const glass = new THREE.MeshBasicMaterial({
    color: "#284b58",
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  mesh(new THREE.PlaneGeometry(8.6, 2.1), glass, 0, 2.35, -22.73);
  for (const x of [-4.5, 0, 4.5]) box(x, 2.35, -22.64, 0.12, 2.35, 0.18, steel);
  box(0, 3.52, -22.65, 9.2, 0.18, 0.3, frame);
  box(0, 1.18, -22.65, 9.2, 0.18, 0.3, frame);
  // Replace the opaque forward wall panels in the observation opening with the exterior view.
  const remove: THREE.Object3D[] = [];
  root.children.forEach((g) => {
    if (
      g.position.z === -23 &&
      Math.abs(g.position.x) < 4.1 &&
      g instanceof THREE.Group
    )
      remove.push(g);
  });
  remove.forEach((g) => g.removeFromParent());
  box(0, 0.57, -23, 9, 1.14, 0.3, charcoal);
  box(0, 4.25, -23, 9, 1.5, 0.3, charcoal);
  label(
    "OBSERVATION / NO CONTACT",
    "RESTORE COMMUNICATIONS TO REQUEST ASSISTANCE",
    0,
    3.92,
    -22.76,
    5.8,
    0.43,
    "#bbc6b5",
  );
  const pools = Array.from({ length: 4 }, () => {
    const l = new THREE.PointLight("#e1d9c2", 0, 14, 2);
    root.add(l);
    return l;
  });
  batch();
  let initialized = false,
    opening = 1,
    previous = new Set<ActivityId>(),
    textureRevision = -1;
  return {
    root,
    obstacles,
    update(
      dt: number,
      time: number,
      player: Player,
      completed: ActivityId[],
      reduced: boolean,
      playing: boolean,
    ) {
      const events: ("door" | "power")[] = [];
      root.userData.shadowsDirty = !initialized;
      const online = new Set(completed);
      if (initialized && playing && completed.some((id) => !previous.has(id)))
        events.push("power");
      if (completed.join() !== [...previous].join() || !initialized) {
        for (const s of signs)
          s.paint(
            online.has(s.id)
              ? "ONLINE / " + activityCode(s.id)
              : available(s.id, completed)
                ? "SERVICE / " + activityCode(s.id)
                : "INSPECT / " + activityCode(s.id),
          );
      }
      const authorized =
        online.has("workshop") ||
        player.z < 13 ||
        (!initialized && Math.abs(player.z - 13) < 0.65);
      const target = authorized && Math.abs(player.z - 13) < 5 ? 1 : 0;
      const old = opening;
      opening = reduced ? target : THREE.MathUtils.damp(opening, target, 8, dt);
      if (
        Math.abs(player.z - 13) < 0.6 &&
        Math.abs(player.x) < 1.8 &&
        old > 0.15
      )
        opening = Math.max(opening, old);
      if (Math.abs(old - opening) > 0.001) root.userData.shadowsDirty = true;
      if (initialized && playing && old < 0.02 && opening > 0.02)
        events.push("door");
      for (let i = 0; i < 2; i++) {
        const x = (i ? 1 : -1) * (0.835 + opening * 1.8);
        leaves[i].position.x = x;
        doorColliders[i].x = x;
      }
      fixtures.forEach((f) => {
        const powered = online.has(f.system);
        f.material.emissiveIntensity = THREE.MathUtils.damp(
          f.material.emissiveIntensity,
          powered ? 2.3 : 0.35,
          2,
          dt,
        );
      });
      const nearest = [...fixtures]
        .sort(
          (a, b) =>
            Math.hypot(a.x - player.x, a.z - player.z) -
            Math.hypot(b.x - player.x, b.z - player.z),
        )
        .slice(0, 4);
      nearest.forEach((f, i) => {
        pools[i].position.set(f.x, f.y, f.z);
        pools[i].color.copy(
          online.has(f.system)
            ? new THREE.Color("#e4e6d6")
            : new THREE.Color("#d39b5e"),
        );
        pools[i].intensity = online.has(f.system) ? 32 : 13;
      });
      if (playing && !reduced)
        for (const f of fans) if (online.has(f.id)) f.g.rotation.z += dt * 1.6;
      if (!reduced) space.rotation.y = time * 0.0007;
      if (root.userData.textureRevision !== textureRevision) {
        textureRevision = root.userData.textureRevision;
        root.userData.shadowsDirty = true;
      }
      previous = online;
      initialized = true;
      return events;
    },
  };
}
const activityCode = (id: ActivityId) =>
  ACTIVITIES.find((a) => a.id === id)!.code;
