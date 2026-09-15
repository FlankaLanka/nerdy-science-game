import * as THREE from "three";
import type { Chamber } from "../chambers.ts";
import type { PORTALS } from "./shipLayout.ts";
import { shipArt } from "./shipArt";

type Gate = (typeof PORTALS)[number];
type Point = [number, number, number];
const STANDBY = "#c18b4c";
const POWERED = "#70dce6";
const INDICATOR_HEIGHT = 2.42;

/** Routes stay on the approach side of their gate and clear the work surface. */
export function powerLinkPath(chamber: Chamber, gate: Gate): Point[] {
  const { x, z } = chamber.bench;
  const atGate = (across: number, y: number, forward: number): Point => [
    gate.x + across * Math.cos(gate.rotation) + forward * Math.sin(gate.rotation),
    y,
    gate.z - across * Math.sin(gate.rotation) + forward * Math.cos(gate.rotation),
  ];
  const entry = atGate(1.3, 0.045, 0.48);
  const path: Point[] = [
    [x + 0.88, 0.26, z + 0.84],
    [x + 0.88, 0.045, z + 0.84],
    [x + 1.85, 0.045, z + 0.84],
  ];
  if (Math.abs(Math.sin(gate.rotation)) > 0.5) {
    path.push([x + 1.85, 0.045, entry[2]]);
  } else {
    const clearZ = z + Math.sign(gate.z - z) * 1.35;
    path.push([x + 1.85, 0.045, clearZ], [entry[0], 0.045, clearZ]);
  }
  path.push(entry, atGate(1.5, 0.045, 0.48), atGate(1.5, 2.99, 0.48),
    atGate(0, 2.99, 0.48), atGate(0, INDICATOR_HEIGHT + 0.34, 0.48));
  return path;
}

/** The station relay latches with the solved chamber; it is not an editable kit lead. */
export function buildPowerLink(chamber: Chamber, gate: Gate) {
  const root = new THREE.Group();
  root.name = `Power link ${chamber.id}`;
  root.userData.powered = false;
  const { box, rod, mesh } = shipArt(root);
  const casing = new THREE.MeshStandardMaterial({ color: "#314653", roughness: 0.65, metalness: 0.25 });
  const bezel = new THREE.MeshStandardMaterial({ color: "#c3d0d6", roughness: 0.55, metalness: 0.35 });
  const face = new THREE.MeshBasicMaterial({ color: "#15232d", toneMapped: false });
  const signal = new THREE.MeshBasicMaterial({ color: STANDBY, toneMapped: false });
  const spark = new THREE.MeshBasicMaterial({ color: "#edffff", toneMapped: false });
  const checks: THREE.Group[] = [];
  const waiting: THREE.Group[] = [];
  function indicator(position: Point, rotation: number, scale: number, name: string) {
    const panel = new THREE.Group();
    panel.name = name;
    panel.position.set(...position);
    panel.rotation.y = rotation;
    panel.scale.setScalar(scale);
    root.add(panel);
    box(0, 0, 0, 0.68, 0.68, 0.09, bezel, panel);
    box(0, 0, 0.052, 0.59, 0.59, 0.018, face, panel);
    const pending = new THREE.Group(), check = new THREE.Group();
    pending.name = "Unpowered indicator";
    check.name = "Powered checkmark";
    pending.userData.dynamic = check.userData.dynamic = true;
    panel.add(pending, check);
    for (const side of [-1, 1]) {
      box(0, side * 0.16, 0.074, 0.35, 0.03, 0.018, signal, pending);
      box(side * 0.16, 0, 0.074, 0.03, 0.29, 0.018, signal, pending);
    }
    const a = new THREE.Vector3(-0.18, 0.005, 0.085);
    const b = new THREE.Vector3(-0.045, -0.125, 0.085);
    const c = new THREE.Vector3(0.2, 0.155, 0.085);
    rod(a, b, 0.035, signal, check);
    rod(b, c, 0.035, signal, check);
    check.visible = false;
    checks.push(check);
    waiting.push(pending);
    return panel;
  }
  indicator([chamber.bench.x + 0.88, 0.48, chamber.bench.z + 0.8], 0, 0.62, "Bench power relay");
  for (const side of [1, -1]) {
    // Hang below the corridor lintels while retaining over two metres of clearance.
    const panel = indicator([
      gate.x + Math.sin(gate.rotation) * side * 0.44,
      INDICATOR_HEIGHT,
      gate.z + Math.cos(gate.rotation) * side * 0.44,
    ], gate.rotation + (side < 0 ? Math.PI : 0), 1, "Door power indicator");
    box(0, 0.455, 0, 0.09, 0.23, 0.06, casing, panel);
  }

  const points = powerLinkPath(chamber, gate).map(p => new THREE.Vector3(...p));
  const segments: { a: THREE.Vector3; delta: THREE.Vector3; length: number; start: number }[] = [];
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const delta = b.clone().sub(a), distance = delta.length();
    if (distance < 0.001) continue;
    segments.push({ a, delta, length: distance, start: length });
    // Trim straight sections before each bend. A rounded coupler owns the
    // corner surface, so perpendicular cylinder facets cannot share a plane.
    const inset = Math.min(0.035, distance / 3) / distance;
    rod(
      a.clone().addScaledVector(delta, i > 1 ? inset : 0),
      b.clone().addScaledVector(delta, i < points.length - 1 ? -inset : 0),
      0.035,
      casing,
    );
    length += distance;
  }
  const elbow = new THREE.SphereGeometry(0.055, 16, 12);
  for (const point of points.slice(1, -1))
    mesh(elbow, casing, point.x, point.y, point.z);
  const route = new THREE.Group();
  route.name = "Power conduit";
  route.userData.dynamic = true;
  root.add(route);
  const count = segments.reduce((n, segment) => n + Math.ceil(segment.length / 0.36), 0);
  const dashes = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.052, 0.052, 1, 8), signal, count);
  dashes.name = "Conduit lamps";
  const transform = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0);
  let index = 0;
  for (const segment of segments) {
    const slots = Math.ceil(segment.length / 0.36), spacing = segment.length / slots;
    transform.quaternion.setFromUnitVectors(up, segment.delta.clone().normalize());
    transform.scale.set(1, spacing * 0.62, 1);
    for (let j = 0; j < slots; j++) {
      transform.position.copy(segment.a).addScaledVector(segment.delta, (j + 0.5) / slots);
      transform.updateMatrix();
      dashes.setMatrixAt(index++, transform.matrix);
    }
  }
  dashes.instanceMatrix.needsUpdate = true;
  dashes.computeBoundingSphere();
  route.add(dashes);
  const pulses = new THREE.InstancedMesh(new THREE.SphereGeometry(0.071, 8, 6), spark, 3);
  pulses.name = "Current toward door";
  pulses.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  // Pulses move along the entire conduit, beyond their initial instance bounds.
  pulses.frustumCulled = false;
  pulses.visible = false;
  route.add(pulses);
  let powered = false;
  const pulsePosition = new THREE.Vector3(), matrix = new THREE.Matrix4();
  return {
    root,
    update(restored: boolean, time: number, reduced: boolean, animate: boolean) {
      if (restored !== powered) {
        powered = restored;
        root.userData.powered = restored;
        signal.color.set(restored ? POWERED : STANDBY);
        checks.forEach(check => { check.visible = restored; });
        waiting.forEach(pending => { pending.visible = !restored; });
      }
      pulses.visible = restored && !reduced && animate;
      if (!pulses.visible) return;
      for (let i = 0; i < pulses.count; i++) {
        const distance = (time * 2.6 + i * length / pulses.count) % length;
        const segment = segments.find(s => distance < s.start + s.length) ?? segments[segments.length - 1];
        pulsePosition.copy(segment.a).addScaledVector(segment.delta, (distance - segment.start) / segment.length);
        matrix.makeTranslation(pulsePosition.x, pulsePosition.y, pulsePosition.z);
        pulses.setMatrixAt(i, matrix);
      }
      pulses.instanceMatrix.needsUpdate = true;
    },
  };
}
