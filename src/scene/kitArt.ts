import * as THREE from "three";
import { rounded } from "./art";
import { endpoints, lampState } from "../circuitKit";
import type { Circuit, CircuitResult, Part } from "../circuitKit";
import type { BenchInteraction, BenchPoint } from "./benchView";

function cableCurve(a: BenchPoint, b: BenchPoint) {
  const sag = Math.min(42, Math.hypot(a.x - b.x, a.y - b.y) * 0.13);
  return new THREE.CubicBezierCurve3(
    new THREE.Vector3(a.x - 450, 11, a.y - 250),
    new THREE.Vector3(
      a.x + (b.x - a.x) / 3 - 450,
      13,
      a.y + (b.y - a.y) / 3 + sag - 250,
    ),
    new THREE.Vector3(
      a.x + (2 * (b.x - a.x)) / 3 - 450,
      13,
      a.y + (2 * (b.y - a.y)) / 3 + sag - 250,
    ),
    new THREE.Vector3(b.x - 450, 11, b.y - 250),
  );
}

/** One physical kit per room, also used during overhead editing. */
export function buildKit() {
  const root = new THREE.Group();
  root.userData.dynamic = true;
  const geometry = new Map<string, THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const material = (color: string, metalness = 0.3, roughness = 0.55) => {
    const m = new THREE.MeshStandardMaterial({ color, metalness, roughness });
    materials.add(m);
    return m;
  };
  const steel = material("#b1c5cd", 0.55, 0.34),
    brass = material("#b2955a", 0.78, 0.35),
    rubber = material("#111b1a", 0.1, 0.92),
    board = material("#547a92", 0.08, 0.8),
    ceramic = material("#f0eee3", 0.05, 0.73),
    battery = material("#dc9565", 0.25, 0.55),
    copper = material("#b18759", 0.7, 0.48);
  const cached = (key: string, make: () => THREE.BufferGeometry) => {
    if (!geometry.has(key)) geometry.set(key, make());
    return geometry.get(key)!;
  };
  const mesh = (
    g: THREE.BufferGeometry,
    m: THREE.Material,
    parent: THREE.Object3D,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true;
    parent.add(o);
    return o;
  };
  const box = (
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
    p: THREE.Object3D,
    x = 0,
    y = 0,
    z = 0,
    r = 3,
  ) =>
    mesh(
      cached(`b${w},${h},${d},${r}`, () => rounded(w, h, d, r)),
      m,
      p,
      x,
      y,
      z,
    );
  const cylinder = (
    r: number,
    h: number,
    m: THREE.Material,
    p: THREE.Object3D,
    x = 0,
    y = 0,
    z = 0,
  ) =>
    mesh(
      cached(`c${r},${h}`, () => new THREE.CylinderGeometry(r, r, h, 20)),
      m,
      p,
      x,
      y,
      z,
    );
  box(900, 18, 500, steel, root, 0, -19, 0, 14);
  box(875, 8, 475, board, root, 0, -6, 0, 9);
  for (const x of [-419, 419])
    for (const z of [-220, 220]) {
      cylinder(5, 2, brass, root, x, 0, z);
      box(6, 1, 1.2, rubber, root, x, 1.5, z, 0.1);
    }
  for (const z of [-229, 229]) box(740, 1, 2, rubber, root, 0, -1, z, 0.1);
  const components = new Map<
    string,
    {
      g: THREE.Group;
      glow?: THREE.MeshStandardMaterial;
      lever?: THREE.Group;
      owned?: THREE.Material[];
    }
  >();
  const wires = new THREE.Group();
  root.add(wires);
  const cableRecords = new Map<
    string,
    {
      mesh: THREE.Mesh<THREE.TubeGeometry, THREE.MeshStandardMaterial>;
      curve: THREE.CubicBezierCurve3;
      current: number;
      dots: THREE.Mesh[];
    }
  >();
  const flowMaterial = new THREE.MeshBasicMaterial({ color: "#f3dca1" });
  materials.add(flowMaterial);
  const selectionMaterial = new THREE.LineBasicMaterial({
    color: "#c9dcc0",
    transparent: true,
    opacity: 0.65,
  });
  materials.add(selectionMaterial);
  const selection = new THREE.LineLoop(
    cached("selection", () =>
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-65, 2, -40),
        new THREE.Vector3(65, 2, -40),
        new THREE.Vector3(65, 2, 40),
        new THREE.Vector3(-65, 2, 40),
      ]),
    ),
    selectionMaterial,
  );
  selection.visible = false;
  root.add(selection);
  let lead: THREE.Mesh | null = null;
  let leadKey = "";
  const leadMaterial = new THREE.MeshStandardMaterial({
    color: "#c9e2bc",
    emissive: "#8da779",
    emissiveIntensity: 0.5,
  });
  materials.add(leadMaterial);
  let previous: Circuit | null = null;
  function buildPart(part: Part) {
    const g = new THREE.Group();
    g.userData.kitId = part.id;
    root.add(g);
    for (const x of [-76, 76]) {
      const id = `${part.id}:${x < 0 ? "a" : "b"}`;
      cylinder(12, 5, steel, g, x, 4).userData.kitId = id;
      cylinder(8, 4, brass, g, x, 8).userData.kitId = id;
      cylinder(3.5, 1, rubber, g, x, 10.5).userData.kitId = id;
      box(27, 5, 7, brass, g, x > 0 ? 61 : -61, 8, 0, 1);
    }
    const record: {
      g: THREE.Group;
      glow?: THREE.MeshStandardMaterial;
      lever?: THREE.Group;
      owned?: THREE.Material[];
    } = { g };
    if (part.kind === "battery") {
      const body = cylinder(27, 105, battery, g, 0, 32);
      body.rotation.z = Math.PI / 2;
      const cap = cylinder(28, 12, steel, g, -50, 32);
      cap.rotation.z = Math.PI / 2;
      const nub = cylinder(13, 10, brass, g, -61, 32);
      nub.rotation.z = Math.PI / 2;
      const base = cylinder(28, 5, rubber, g, 52, 32);
      base.rotation.z = Math.PI / 2;
      box(4, 2, 17, ceramic, g, -29, 60, 0, 1);
      box(17, 2, 4, ceramic, g, -29, 60, 0, 1);
      box(14, 2, 4, ceramic, g, 29, 60, 0, 1);
      for (const x of [-36, 36]) box(10, 9, 68, rubber, g, x, 5, 0, 3);
    } else if (part.kind === "bulb") {
      box(114, 15, 68, ceramic, g, 0, 10, 0, 8);
      cylinder(26, 14, steel, g, 0, 25);
      for (const y of [22, 26, 30]) cylinder(27, 2, brass, g, 0, y);
      const glass = new THREE.MeshPhysicalMaterial({
        color: "#d4ded5",
        transparent: true,
        opacity: 0.15,
        roughness: 0.22,
        metalness: 0.05,
        depthWrite: false,
        forceSinglePass: true,
      });
      materials.add(glass);
      record.owned = [glass];
      const dome = mesh(
        cached("bulb-glass", () => new THREE.SphereGeometry(34, 24, 16)),
        glass,
        g,
        0,
        60,
      );
      dome.scale.y = 1.12;
      dome.castShadow = false;
      const filament = material("#6d5a31", 0.2, 0.55);
      filament.emissive.set("#ffd796");
      record.glow = filament;
      record.owned!.push(filament);
      const coil = mesh(
        cached("filament", () => new THREE.TorusGeometry(13, 1.5, 5, 24)),
        filament,
        g,
        0,
        65,
      );
      coil.rotation.x = Math.PI / 2;
      for (const x of [-10, 10]) box(1.5, 31, 1.5, steel, g, x, 46, 0, 0.2);
    } else if (part.kind === "resistor") {
      box(110, 8, 55, steel, g, 0, 8, 0, 3);
      box(88, 25, 39, ceramic, g, 0, 25, 0, 4);
      for (let i = 0; i < 9; i++)
        box(3, 5, 42, copper, g, -32 + i * 8, 41, 0, 1);
      for (const x of [-49, 49]) cylinder(4, 4, brass, g, x, 14, 20);
    } else {
      box(113, 14, 62, ceramic, g, 0, 12, 0, 6);
      for (const x of [-49, 49]) box(13, 16, 18, brass, g, x, 26, 0, 2);
      const lever = new THREE.Group();
      lever.position.set(-49, 30, 0);
      g.add(lever);
      record.lever = lever;
      box(98, 6, 10, steel, lever, 49, 0, 0, 2);
      box(33, 12, 24, rubber, lever, 67, 8, 0, 4);
      cylinder(7, 5, brass, g, -49, 37);
    }
    components.set(part.id, record);
    return record;
  }
  function clearWires() {
    cableRecords.clear();
    for (const o of [...wires.children]) {
      const w = o as THREE.Mesh;
      w.geometry.dispose();
      (w.material as THREE.Material).dispose();
      w.removeFromParent();
    }
  }
  function sync(circuit: Circuit, result: CircuitResult) {
    for (const [id, record] of components)
      if (!circuit.parts.some((p) => p.id === id)) {
        record.g.removeFromParent();
        record.owned?.forEach((m) => {
          m.dispose();
          materials.delete(m);
        });
        components.delete(id);
      }
    for (const part of circuit.parts) {
      const r = components.get(part.id) ?? buildPart(part);
      r.g.position.set(part.x - 450, 0, part.y - 250);
      r.g.rotation.y = -part.angle;
      if (r.lever) r.lever.rotation.z = part.closed ? 0 : 0.72;
      if (r.glow) {
        const light = lampState(part, result);
        r.glow.emissive.set(light.overloaded ? "#ff623d" : "#ffdda5");
        r.glow.emissiveIntensity = light.brightness * 4;
      }
    }
    if (previous !== circuit) {
      clearWires();
      const points = endpoints(circuit);
      for (const w of circuit.wires) {
        const a = points[w.a],
          b = points[w.b];
        if (!a || !b) continue;
        const curve = cableCurve(a, b);
        const m = new THREE.MeshStandardMaterial({
          color: "#ab7945",
          roughness: 0.75,
          metalness: 0.06,
          emissive: "#ae8f42",
          emissiveIntensity:
            Math.abs(result.wires[w.id] ?? 0) > 0.005 ? 0.18 : 0,
        });
        const wire = mesh(
          new THREE.TubeGeometry(curve, 24, 3.4, 7, false),
          m,
          wires,
        ) as THREE.Mesh<THREE.TubeGeometry, THREE.MeshStandardMaterial>;
        wire.userData.kitId = w.id;
        const current = result.wires[w.id] ?? 0;
        const dots =
          Math.abs(current) > 0.005
            ? Array.from({ length: 7 }, () => {
                const dot = new THREE.Mesh(
                  cached("flow-dot", () => new THREE.SphereGeometry(2.3, 6, 4)),
                  flowMaterial,
                );
                wire.add(dot);
                return dot;
              })
            : [];
        cableRecords.set(w.id, { mesh: wire, curve, current, dots });
      }
      previous = circuit;
    }
  }
  return {
    root,
    sync,
    interact(
      interaction: BenchInteraction | null,
      time: number,
      reduced: boolean,
    ) {
      const part = interaction?.circuit.parts.find(
        (p) => p.id === interaction.selected,
      );
      selection.visible = !!part;
      if (part) {
        selection.position.set(part.x - 450, 0, part.y - 250);
        selection.rotation.y = -part.angle;
      }
      for (const [id, wire] of cableRecords) {
        wire.mesh.material.color.set(
          interaction?.selected === id ? "#e6e3b3" : "#ab7945",
        );
        wire.dots.forEach((dot, i) => {
          const travel = reduced
            ? 0
            : time *
              Math.sign(wire.current) *
              Math.min(0.7, Math.abs(wire.current) * 0.3);
          dot.position.copy(
            wire.curve.getPoint((((i / 7 + travel) % 1) + 1) % 1),
          );
          dot.position.y += 3;
          dot.visible = !!interaction;
        });
      }
      const nextLead = interaction?.lead;
      const key = nextLead
        ? `${nextLead.a.x}:${nextLead.a.y}:${nextLead.b.x}:${nextLead.b.y}`
        : "";
      if (leadKey !== key) {
        lead?.geometry.dispose();
        lead?.removeFromParent();
        lead = nextLead
          ? new THREE.Mesh(
              new THREE.TubeGeometry(
                cableCurve(nextLead.a, nextLead.b),
                24,
                2.7,
                7,
                false,
              ),
              leadMaterial,
            )
          : null;
        if (lead) root.add(lead);
        leadKey = key;
      }
    },
    pick(raycaster: THREE.Raycaster): string | null {
      root.updateWorldMatrix(true, true);
      for (const hit of raycaster.intersectObject(root, true)) {
        for (
          let object: THREE.Object3D | null = hit.object;
          object && object !== root;
          object = object.parent
        )
          if (object.userData.kitId) return object.userData.kitId as string;
      }
      return null;
    },
    dispose() {
      root.removeFromParent();
      clearWires();
      lead?.geometry.dispose();
      geometry.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
