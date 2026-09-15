import * as THREE from "three";
import { CHAMBERS, FORMULAS } from "../chambers";
import type { ChamberId } from "../chambers";
import { simulate } from "../circuitKit";
import type { Circuit } from "../circuitKit";
import { buildKit } from "./kitArt";
import { DECK, FURNITURE, PORTALS, insideDeck, windowAt } from "./shipLayout";
import { shipArt, surface } from "./shipArt";
import type { Obstacle, Player } from "./navigation";
import { buildSpace } from "./space";
import { BENCH_HEIGHT, KIT_SCALE } from "./benchView";
import type { BenchInteraction } from "./benchView";
import { buildPowerLink } from "./powerLink";
/** A fixed modular kit, placed against a connected deck plan. No procedural room generation. */
export function buildSpaceship(scene: THREE.Scene) {
  const root = new THREE.Group();
  root.name = "Asterion / research station";
  scene.add(root);
  const { box, bevel, rod, mesh, label, batch } = shipArt(root);
  const obstacles: Obstacle[] = FURNITURE.map((f) => ({ ...f }));
  const mat = (color: string, metalness = 0.35, roughness = 0.65) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const ivory = mat("#f3f0e6", 0.05, 0.72),
    frame = mat("#9badb7", 0.25, 0.48),
    charcoal = mat("#526e80", 0.18, 0.7),
    rubber = mat("#344957", 0.03, 0.9),
    steel = mat("#c4d3da", 0.55, 0.36),
    copper = mat("#dea074", 0.35, 0.5),
    ochre = mat("#eba772", 0.08, 0.7),
    ceiling = mat("#edf1ef", 0.02, 0.85);
  ivory.map = surface("panel");
  const floor = mat("#dde2e1", 0.08, 0.68);
  floor.map = surface("deck");
  floor.map.wrapS = floor.map.wrapT = THREE.RepeatWrapping;
  const emission = (color: string, power = 1) =>
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: power,
      roughness: 0.4,
    });
  const trims = new Map<string, THREE.Material>();
  const fixtures: {
    x: number;
    y: number;
    z: number;
    system: ChamberId;
    material: THREE.MeshStandardMaterial;
  }[] = [];
  const glass = new THREE.MeshBasicMaterial({
    color: "#9baeb2",
    transparent: true,
    opacity: 0.035,
    depthWrite: false,
    side: THREE.DoubleSide,
    forceSinglePass: true,
    toneMapped: false,
  });
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
    // At outside corners, perpendicular trim must end before the other wall's
    // trim begins. Overlapping their horizontal faces causes depth flicker.
    const corner = (side: number) => {
      const along = side * (w / 2 + 0.01);
      return !insideDeck(
        x + Math.cos(rotation) * along + Math.sin(rotation) * 0.5,
        z - Math.sin(rotation) * along + Math.cos(rotation) * 0.5,
      );
    };
    const leftCorner = corner(-1);
    const rightCorner = corner(1);
    const trimSpan = (width: number, front: number) => {
      const inset = (w - width) / 2;
      const left = leftCorner ? Math.max(inset, front + 0.015) : inset;
      const right = rightCorner ? Math.max(inset, front + 0.015) : inset;
      return { x: (left - right) / 2, width: w - left - right };
    };
    const trimBox = (
      y: number,
      z: number,
      width: number,
      height: number,
      depth: number,
      material: THREE.Material,
    ) => {
      const span = trimSpan(width, z + depth / 2);
      return box(span.x, y, z, span.width, height, depth, material, g);
    };
    const trimBevel = (
      y: number,
      z: number,
      width: number,
      height: number,
      depth: number,
      material: THREE.Material,
      radius: number,
    ) => {
      const span = trimSpan(width, z + depth / 2);
      return bevel(span.x, y, z, span.width, height, depth, material, radius, g);
    };
    const window = windowAt(x, z, rotation);
    if (window) {
      const { sill, head } = window;
      g.name = `window / ${window.id}`;
      // Build around the opening; no hidden full wall remains behind its glass.
      box(0, sill / 2, 0, w, sill, 0.3, charcoal, g);
      box(0, (head + h) / 2, 0, w, h - head, 0.3, charcoal, g);
      bevel(
        0,
        sill / 2,
        0.2,
        w - 0.2,
        Math.max(0.2, sill - 0.16),
        0.16,
        ivory,
        0.04,
        g,
      );
      for (const side of [-1, 1])
        bevel(
          side * (w / 2 - 0.09),
          (sill + head) / 2,
          0.17,
          0.14,
          head - sill - 0.19,
          0.5,
          steel,
          0.025,
          g,
        );
      for (const y of [sill, head]) {
        bevel(0, y, 0.21, w - 0.04, 0.17, 0.58, frame, 0.025, g);
        box(
          0,
          y + (y === sill ? 0.105 : -0.105),
          0.24,
          w - 0.3,
          0.025,
          0.2,
          rubber,
          g,
        );
      }
      const pane = mesh(
        new THREE.PlaneGeometry(w - 0.31, head - sill - 0.23),
        glass,
        0,
        (sill + head) / 2,
        -0.035,
        g,
      );
      pane.castShadow = pane.receiveShadow = false;
      pane.name = "pressure glass";
      return;
    }
    box(0, h / 2, 0, w, h, 0.3, charcoal, g);
    trimBevel(1.85, 0.19, w - 0.14, 2.25, 0.18, ivory, 0.07);
    trimBevel(0.42, 0.25, w - 0.1, 0.66, 0.25, frame, 0.04);
    trimBox(1.05, 0.33, w - 0.14, 0.06, 0.06, ochre);
    trimBox(3.02, 0.25, w - 0.12, 0.16, 0.23, frame);
    for (const side of [-1, 1]) {
      // End faces sit inside the shell boundary, including at exposed doorway reveals.
      box(side * (w / 2 - 0.085), h / 2, 0.25, 0.11, h - 0.04, 0.35, steel, g);
      for (const y of [0.83, 2.88]) bolt(side * (w / 2 - 0.22), y, 0.304, g);
    }
    for (let y = 3.28; y < h - 0.18; y += 0.24)
      trimBox(y, 0.18, w - 0.24, 0.085, 0.15, frame);
    trimBox(0.96, 0.25, w - 0.14, 0.035, 0.2, rubber);
    trimBox(2.55, 0.302, w - 0.6, 0.024, 0.012, charcoal);
    let trim = trims.get(color);
    if (!trim) {
      trim = mat(color, 0.35, 0.7);
      trims.set(color, trim);
    }
    trimBox(1.14, 0.303, w - 0.14, 0.025, 0.015, trim);
  }
  function edge(
    length: number,
    point: (t: number) => [number, number],
    outside: (t: number) => [number, number],
    rotation: number,
    h: number,
    color: string,
  ) {
    for (let t = 0; t < length; ) {
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
            // Keep the header entirely on the tall-room side. Its underside
            // must not cover the adjacent corridor ceiling at the same height.
            top.position.x += Math.sin(rotation) * 0.15;
            top.position.z += Math.cos(rotation) * 0.15;
          }
        }
      t += width;
    }
  }
  // Reserve the header and leaf travel volume before placing ceiling services.
  const clearsPortal = (x: number, z: number, w: number, d: number) =>
    PORTALS.every((p) => {
      const turned = Math.abs(Math.sin(p.rotation)) > 0.5;
      return (
        Math.abs(p.x - x) > (w + (turned ? 1.3 : 3.9)) / 2 ||
        Math.abs(p.z - z) > (d + (turned ? 3.9 : 1.3)) / 2
      );
    });
  for (const room of DECK) {
    // The visible ceiling diffusers and local illumination share this room's circuit.
    const lamp = emission("#fff0d9", 0.035);
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
      ceiling,
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
      if (clearsPortal(room.x + dx, room.z, 0.14, room.depth))
        tube(
          [room.x + dx, room.height - 0.55, z0],
          [room.x + dx, room.height - 0.55, z1],
          0.07,
          dx > 0 ? copper : steel,
        );
    for (let z = z0 + 1; z < z1; z += 3) {
      if (!clearsPortal(room.x, z, room.width, 0.45)) continue;
      box(room.x, room.height - 0.2, z, room.width, 0.3, 0.3, frame);
      box(
        room.x,
        room.height - 0.38,
        z,
        Math.max(1, room.width - 0.8),
        0.08,
        0.45,
        lamp,
      );
      for (const dx of [-0.5, 0.5])
        box(room.x + dx, room.height - 0.52, z, 0.22, 0.25, 0.14, charcoal);
    }
    const lx = room.x + (room.width > 8 ? room.width * 0.22 : 0),
      lz = room.z;
    if (clearsPortal(lx, lz, 1.45, 0.52)) {
      bevel(lx, room.height - 0.32, lz, 1.45, 0.22, 0.52, ivory, 0.04);
      box(lx, room.height - 0.445, lz, 1.2, 0.02, 0.32, lamp);
    }
    // Corridors also have powered ceiling strips, even when a portal occupies
    // the central fixture position.
    fixtures.push({
      x: lx,
      y: room.height - 0.75,
      z: lz,
      system: room.system,
      material: lamp,
    });
    if (room.width > 6) {
      // Structural haunches soften the rectangular silhouette at ceiling junctions.
      for (const side of [-1, 1]) {
        for (let z = z0; z < z1; z += 2) {
          const length = Math.min(2, z1 - z);
          const window = windowAt(
            room.x + (side * room.width) / 2,
            z + length / 2,
            (-side * Math.PI) / 2,
          );
          if (window && window.head > room.height - 1) continue;
          const o = box(
            room.x + side * (room.width / 2 - 0.35),
            room.height - 0.45,
            z + length / 2,
            0.65,
            0.8,
            length,
            frame,
          );
          o.rotation.z = side * 0.24;
        }
      }
    }
  }
  const doors: {
    portal: (typeof PORTALS)[number];
    leaves: THREE.Group[];
    colliders: Obstacle[];
    opening: number;
  }[] = [];
  for (const p of PORTALS) {
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    g.rotation.y = p.rotation;
    root.add(g);
    g.name = `Door frame ${p.name}`;
    const turned = Math.abs(Math.sin(p.rotation)) > 0.5;
    for (const side of [-1, 1]) {
      obstacles.push({
        x: p.x + side * 1.76 * Math.cos(p.rotation),
        z: p.z - side * 1.76 * Math.sin(p.rotation),
        width: turned ? 0.7 : 0.28,
        depth: turned ? 0.28 : 0.7,
      });
      bevel(side * 1.76, 1.4, 0, 0.28, 2.8, 0.7, steel, 0.045, g);
    }
    bevel(0, 2.99, 0, 3.8, 0.38, 0.7, frame, 0.045, g);
    box(0, 3.29, 0, 3.8, 0.22, 0.4, charcoal, g);
    label(p.name, "", -1.13, 3.01, 0.385, 0.52, 0.15, "#234959", 0, false, g);
    box(0, 0.012, 0, 3.24, 0.024, 0.7, rubber, g);
    const door = dynamic(p.x, 0, p.z);
    door.rotation.y = p.rotation;
    door.name = `Door ${p.system}`;
    const leaves: THREE.Group[] = [],
      colliders: Obstacle[] = [];
    for (const side of [-1, 1]) {
      const leaf = new THREE.Group();
      leaf.position.x = side * 2.6;
      door.add(leaf);
      leaves.push(leaf);
      bevel(0, 1.4, 0, 1.58, 2.72, 0.22, ivory, 0.045, leaf);
      // One recessed seal closes the center light leak without overlapping
      // the visible faces of the two moving panels.
      if (side === -1)
        box(0.79, 1.4, -0.14, 0.14, 2.72, 0.03, rubber, leaf);
      box(0, 0.43, 0.165, 1.42, 0.44, 0.07, frame, leaf);
      box(side * 0.57, 1.3, 0.15, 0.15, 0.5, 0.06, charcoal, leaf);
      for (const y of [1, 2.2])
        box(0, y, 0.15, 1.35, 0.035, 0.016, frame, leaf);
      const collider = {
        x: p.x + side * 2.6 * Math.cos(p.rotation),
        z: p.z - side * 2.6 * Math.sin(p.rotation),
        width: turned ? 0.3 : 1.58,
        depth: turned ? 1.58 : 0.3,
      };
      colliders.push(collider);
      obstacles.push(collider);
    }
    doors.push({ portal: p, leaves, colliders, opening: 1 });
  }
  const benches = CHAMBERS.map((c) => {
    // Large chamber numbers make the experiments feel like a considered test suite.
    const sign = new THREE.Group();
    sign.position.set(c.x + 4.8, 2.05, c.z - 4.61);
    root.add(sign);
    bevel(0, 0, 0, 1.18, 1.62, 0.06, ivory, 0.035, sign);
    box(-0.51, 0, 0.036, 0.045, 1.46, 0.012, ochre, sign);
    label(c.number, "", 0, 0.2, 0.04, 0.93, 0.83, "#2f708a", 0, false, sign);
    label("CIRCUIT LAB", "", 0, -0.5, 0.04, 0.93, 0.12, "#526b7a", 0, false, sign);
    bevel(c.bench.x, 0.47, c.bench.z, 2.9, 0.94, 1.5, ivory, 0.09);
    box(c.bench.x, 0.66, c.bench.z + 0.758, 2.55, 0.12, 0.018, charcoal);
    label(c.number, "", c.bench.x - 0.99, 0.38, c.bench.z + 0.764,
      0.35, 0.25, "#28728b", 0, false);
    for (const dx of [-1.2, 1.2])
      box(c.bench.x + dx, 0.6, c.bench.z + 0.77, 0.075, 0.7, 0.055, steel);
    const kit = buildKit();
    kit.root.position.set(c.bench.x, BENCH_HEIGHT, c.bench.z);
    kit.root.scale.setScalar(KIT_SCALE);
    root.add(kit.root);
    kit.sync(c.initial, simulate(c.initial));
    // The few wall posters appear only where a new equation becomes useful.
    if (c.formula) {
      const g = new THREE.Group();
      g.position.set(c.x + 5.5, 0, c.z + 3.85);
      g.rotation.y = -Math.PI / 2;
      root.add(g);
      bevel(0, 1.95, 0, 1.64, 1.14, 0.1, frame, 0.03, g);
      label(
        FORMULAS[c.formula].equation,
        FORMULAS[c.formula].note,
        0,
        1.95,
        0.065,
        1.55,
        1.05,
        "#276980",
        0,
        true,
        g,
      );
    }
    // A low strip under the sill carries the restoration response without signage.
    const rail = emission(c.color, 0.15);
    for (const side of [-1, 1])
      box(c.x + side * 5.52, 0.25, c.z, 0.025, 0.035, 7, rail);
    return { kit, rail, previous: c.initial };
  });
  const powerLinks = CHAMBERS.map((chamber) => {
    const gate = PORTALS.find(p => p.system === chamber.id)!;
    const link = buildPowerLink(chamber, gate);
    root.add(link.root);
    return link;
  });
  const space = buildSpace(scene, () => {
    root.userData.textureRevision = (root.userData.textureRevision ?? 0) + 1;
  });
  const pools = Array.from({ length: 4 }, () => {
    const light = new THREE.PointLight("#dedfcd", 0, 14, 2);
    root.add(light);
    return light;
  });
  batch();
  let initialized = false,
    previous = new Set<ChamberId>(),
    textureRevision = -1;
  return {
    root,
    obstacles,
    pickBench: (index: number, raycaster: THREE.Raycaster) => benches[index]?.kit.pick(raycaster) ?? null,
    dispose() {
      benches.forEach((b) => b.kit.dispose());
    },
    update(
      dt: number,
      time: number,
      player: Player,
      completed: ChamberId[],
      reduced: boolean,
      playing: boolean,
      circuits?: Circuit[],
      preview = false,
      activeBench: number | null = null,
      interaction: BenchInteraction | null = null,
    ) {
      const events: ("door" | "power")[] = [];
      root.userData.shadowsDirty = !initialized;
      const online = new Set(completed);
      if (initialized && completed.some((id) => !previous.has(id)))
        events.push("power");
      for (const door of doors) {
        const p = door.portal,
          dx = player.x - p.x,
          dz = player.z - p.z;
        const across = dx * Math.cos(p.rotation) - dz * Math.sin(p.rotation),
          normal = dx * Math.sin(p.rotation) + dz * Math.cos(p.rotation);
        const inAperture = Math.abs(normal) < 0.6 && Math.abs(across) < 1.8;
        const target =
          (online.has(p.system) || (!initialized && inAperture)) &&
          Math.hypot(dx, dz) < 5
            ? 1
            : 0;
        const old = door.opening;
        door.opening = reduced
          ? target
          : THREE.MathUtils.damp(old, target, 8, dt);
        if (inAperture && old > 0.15)
          door.opening = Math.max(old, door.opening);
        if (Math.abs(old - door.opening) > 0.001)
          root.userData.shadowsDirty = true;
        if (initialized && playing && old < 0.02 && door.opening > 0.02)
          events.push("door");
        door.leaves.forEach((leaf, i) => {
          const x = (i ? 1 : -1) * (0.8 + door.opening * 1.8);
          leaf.position.x = x;
          door.colliders[i].x = p.x + x * Math.cos(p.rotation);
          door.colliders[i].z = p.z - x * Math.sin(p.rotation);
        });
      }
      benches.forEach((b, i) => {
        const circuit = (i === activeBench ? interaction?.circuit : null) ?? circuits?.[i] ?? CHAMBERS[i].initial;
        if (circuit !== b.previous) {
          b.kit.sync(circuit, simulate(circuit));
          b.previous = circuit;
          root.userData.shadowsDirty = true;
        }
        const animatePower = !preview && (playing || activeBench !== null);
        b.kit.interact(i === activeBench ? interaction : null, time, reduced, animatePower);
        b.rail.emissiveIntensity = online.has(CHAMBERS[i].id) ? 1.6 : 0.08;
        powerLinks[i].update(online.has(CHAMBERS[i].id), time, reduced, animatePower);
      });
      for (const f of fixtures)
        f.material.emissiveIntensity = THREE.MathUtils.damp(
          f.material.emissiveIntensity,
          online.has(f.system) ? 1.6 : 0.035,
          2,
          dt,
        );
      const nearest = [...fixtures]
        .sort(
          (a, b) =>
            Math.hypot(a.x - player.x, a.z - player.z) -
            Math.hypot(b.x - player.x, b.z - player.z),
        )
        .slice(0, 4);
      nearest.forEach((f, i) => {
        pools[i].position.set(f.x, f.y, f.z);
        pools[i].color.set(online.has(f.system) ? "#fff0d9" : "#b3d3ef");
        pools[i].intensity = online.has(f.system) ? 32 : 3.5;
      });
      space.update(time, reduced, preview);
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
