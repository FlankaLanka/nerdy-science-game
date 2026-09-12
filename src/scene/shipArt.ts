import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { rounded, rng } from "./art";

/** Code-authored industrial surfaces: deterministic grain, seams and fasteners. */
export function surface(kind: "deck" | "panel") {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const c = canvas.getContext("2d")!;
  c.fillStyle = kind === "deck" ? "#778187" : "#d1d0c9";
  c.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 12000; i++) {
    c.fillStyle = `rgba(${i % 2 ? "255,255,255" : "0,0,0"},${rng(i + 30) * 0.06})`;
    c.fillRect(
      rng(i + 17) * 512,
      rng(i + 73) * 512,
      kind === "deck" ? 8 : 2,
      1,
    );
  }
  if (kind === "deck") {
    for (let x = 16; x < 512; x += 32)
      for (let y = 16; y < 512; y += 32) {
        c.strokeStyle = "#414a50";
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(x - 6, y + 6);
        c.lineTo(x + 6, y - 6);
        c.stroke();
        c.strokeStyle = "#939ca0";
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(x - 6, y + 7);
        c.lineTo(x + 6, y - 5);
        c.stroke();
      }
  }
  c.strokeStyle = "rgba(0,0,0,.36)";
  c.lineWidth = 5;
  c.strokeRect(3, 3, 506, 506);
  for (const x of [18, 494])
    for (const y of [18, 494]) {
      c.fillStyle = "#434b50";
      c.beginPath();
      c.arc(x, y, 4, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#949b9c";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(x - 2, y);
      c.lineTo(x + 2, y);
      c.stroke();
    }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function shipArt(root: THREE.Group) {
  const cube = new THREE.BoxGeometry(1, 1, 1);
  function mesh(
    g: THREE.BufferGeometry,
    m: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = root,
  ) {
    const object = new THREE.Mesh(g, m);
    object.position.set(x, y, z);
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
    parent: THREE.Object3D = root,
  ) {
    const object = mesh(cube, m, x, y, z, parent);
    object.scale.set(w, h, d);
    return object;
  }
  const bevels = new Map<string, THREE.BufferGeometry>();
  function bevel(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
    radius = 0.05,
    parent: THREE.Object3D = root,
  ) {
    const key = `${w}:${h}:${d}:${radius}`;
    let geometry = bevels.get(key);
    if (!geometry) {
      geometry = rounded(w, h, d, radius);
      bevels.set(key, geometry);
    }
    return mesh(geometry, m, x, y, z, parent);
  }
  function rod(
    a: THREE.Vector3,
    b: THREE.Vector3,
    radius: number,
    m: THREE.Material,
    parent: THREE.Object3D = root,
  ) {
    const delta = b.clone().sub(a);
    const object = mesh(
      new THREE.CylinderGeometry(radius, radius, delta.length(), 10),
      m,
      0,
      0,
      0,
      parent,
    );
    object.position.copy(a).add(b).multiplyScalar(0.5);
    object.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      delta.normalize(),
    );
    return object;
  }
  function label(
    text: string,
    sub: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    color = "#c4d4d9",
    rotation = 0,
    background = true,
    parent: THREE.Object3D = root,
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = Math.round((1024 * h) / w);
    const c = canvas.getContext("2d")!;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      toneMapped: false,
      depthWrite: false,
    });
    const object = mesh(
      new THREE.PlaneGeometry(w, h),
      material,
      x,
      y,
      z,
      parent,
    );
    object.rotation.y = rotation;
    object.castShadow = false;
    function paint(title: string, caption = sub, tint = color) {
      const ch = canvas.height;
      c.clearRect(0, 0, 1024, ch);
      if (background) {
        c.fillStyle = "#091216";
        c.fillRect(0, 0, 1024, ch);
        c.fillStyle = tint;
        c.fillRect(0, 0, 5, ch);
        c.fillStyle = "#26353b";
        c.fillRect(24, ch - 15, 970, 1);
      }
      c.fillStyle = tint;
      c.font = `600 ${Math.min(115, ch * (caption ? 0.33 : 0.62))}px "Space Grotesk"`;
      c.fillText(title, 28, ch * (caption ? 0.49 : 0.73), 968);
      if (caption) {
        c.fillStyle = background ? "#a8b9bc" : tint;
        c.font = `400 ${Math.min(38, ch * 0.15)}px "IBM Plex Mono"`;
        c.fillText(caption, 30, ch * 0.79, 960);
      }
      texture.needsUpdate = true;
    }
    paint(text);
    return { object, paint };
  }
  function floorLabel(
    text: string,
    sub: string,
    x: number,
    z: number,
    w: number,
    h: number,
    color: string,
  ) {
    const p = label(text, sub, x, 0.026, z, w, h, color, 0, false);
    p.object.rotation.x = -Math.PI / 2;
    return p;
  }
  /** Bake only immutable pieces, grouped by material. Doors, screens and machinery
   * carry dynamic flags, so visible animation and physical colliders stay together. */
  function batch() {
    root.updateMatrixWorld(true);
    const groups = new Map<string, THREE.Mesh[]>();
    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh) || Array.isArray(obj.material)) return;
      let current: THREE.Object3D | null = obj;
      while (current && current !== root) {
        if (current.userData.dynamic) return;
        current = current.parent;
      }
      if (obj.material.transparent) return;
      const point = obj.getWorldPosition(new THREE.Vector3());
      const key = `${obj.material.uuid}:${Math.floor(point.x / 12)}:${Math.floor(point.z / 12)}`;
      groups.set(key, [...(groups.get(key) ?? []), obj]);
    });
    const removed = new Set<THREE.BufferGeometry>();
    for (const objects of groups.values()) {
      const material = objects[0].material as THREE.Material;
      if (objects.length < 2) continue;
      const copies = objects.map((obj) => {
        const g = obj.geometry.clone().applyMatrix4(obj.matrixWorld);
        if (g.index) {
          const plain = g.toNonIndexed();
          g.dispose();
          return plain;
        }
        return g;
      });
      const merged = mergeGeometries(copies, false);
      copies.forEach((g) => g.dispose());
      if (!merged) continue;
      const combined = mesh(merged, material, 0, 0, 0);
      combined.name = `static / ${objects.length} fixtures`;
      objects.forEach((obj) => {
        removed.add(obj.geometry);
        obj.removeFromParent();
      });
    }
    const retained = new Set<THREE.BufferGeometry>();
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) retained.add(obj.geometry);
    });
    removed.forEach((g) => {
      if (!retained.has(g)) g.dispose();
    });
  }
  return { mesh, box, bevel, rod, label, floorLabel, batch };
}
