import * as THREE from "three";
import type { Chamber } from "../chambers.ts";
import type { PORTALS } from "./shipLayout.ts";
import { shipArt } from "./shipArt";
import { buildCable, roundedCablePath } from "./cable";

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
  const entry = atGate(1.45, 0.057, 0.48);
  const path: Point[] = [
    [x + 0.88, 0.26, z + 0.84],
    [x + 0.88, 0.057, z + 0.98],
    [x + 1.85, 0.057, z + 0.98],
  ];
  if (Math.abs(Math.sin(gate.rotation)) > 0.5) {
    path.push([x + 1.85, 0.057, entry[2]]);
  } else {
    const clearZ = z + Math.sign(gate.z - z) * 1.35;
    path.push([x + 1.85, 0.057, clearZ], [entry[0], 0.057, clearZ]);
  }
  path.push(entry, atGate(1.7, 0.057, 0.48), atGate(1.7, 2.99, 0.48),
    atGate(0, 2.99, 0.48), atGate(0, INDICATOR_HEIGHT + 0.34, 0.48));
  return path;
}

export function powerLinkCurve(chamber: Chamber, gate: Gate) {
  return roundedCablePath(powerLinkPath(chamber, gate).map(p => new THREE.Vector3(...p)));
}

/** The station relay displays live circuit power; it is not an editable kit lead. */
export function buildPowerLink(chamber: Chamber, gate: Gate) {
  const root = new THREE.Group();
  root.name = `Power link ${chamber.id}`;
  root.userData.powered = false;
  const { box, rod } = shipArt(root);
  const casing = new THREE.MeshStandardMaterial({ color: "#314653", roughness: 0.65, metalness: 0.25 });
  const bezel = new THREE.MeshStandardMaterial({ color: "#c3d0d6", roughness: 0.55, metalness: 0.35 });
  const face = new THREE.MeshBasicMaterial({ color: "#15232d", toneMapped: false });
  const signal = new THREE.MeshBasicMaterial({ color: STANDBY, toneMapped: false });
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

  const curve = powerLinkCurve(chamber, gate);
  const cable = buildCable(curve, {
    radius: 0.036, color: "#35454c", signal: POWERED, standby: STANDBY,
    spacing: 1.65, pulseWidth: 0.18,
  });
  cable.root.name = "Power conduit";
  cable.jacket.name = "Current toward door";
  root.add(cable.root);
  const mounts = new THREE.Group();
  mounts.position.set(gate.x, 0, gate.z);
  mounts.rotation.y = gate.rotation;
  root.add(mounts);
  const clipGeometry = new THREE.TorusGeometry(0.041, 0.008, 8, 24);
  for (const y of [0.65, 1.85, 2.65]) {
    box(1.7, y, 0.4, 0.12, 0.09, 0.09, casing, mounts);
    const clip = new THREE.Mesh(clipGeometry, bezel);
    clip.position.set(1.7, y, 0.48);
    clip.rotation.x = Math.PI / 2;
    clip.castShadow = clip.receiveShadow = true;
    mounts.add(clip);
  }
  let powered = false;
  return {
    root,
    flow: cable.uniforms,
    update(restored: boolean, time: number, reduced: boolean, animate: boolean) {
      if (restored !== powered) {
        powered = restored;
        root.userData.powered = restored;
        signal.color.set(restored ? POWERED : STANDBY);
        checks.forEach(check => { check.visible = restored; });
        waiting.forEach(pending => { pending.visible = !restored; });
      }
      cable.update(restored, time, reduced, animate, 1.6);
    },
  };
}
