import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

export function rng(seed: number) {
  const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export function surface(
  name: string,
  repeat = 1,
  color = "#ffffff",
  metalness = 0,
) {
  const loader = new THREE.TextureLoader();
  const load = (suffix: string) => {
    const t = loader.load(`/art/${name}-${suffix}.webp`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.anisotropy = 4;
    if (suffix === "color") t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return new THREE.MeshStandardMaterial({
    color,
    map: load("color"),
    normalMap: load("normal"),
    roughnessMap: load("roughness"),
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughness: 0.9,
    metalness,
  });
}

export function rounded(w: number, h: number, d: number, radius = 0.06) {
  return new RoundedBoxGeometry(
    w,
    h,
    d,
    2,
    Math.min(radius, w / 3, h / 3, d / 3),
  );
}

/** Smooth rock with coherent ridges, instead of polygon noise at every vertex. */
export function rockGeometry(seed: number, detail = 3) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const ridge =
      Math.sin(x * 6 + y * 2 + seed) * Math.cos(z * 5 - y * 3) * 0.12;
    const fold = Math.sin(y * 12 + x * 3) * 0.055;
    const scale = 1 + ridge + fold + Math.sin(x * 2 + z * 3 + seed) * 0.14;
    p.setXYZ(i, x * scale, y * scale, z * scale);
  }
  p.needsUpdate = true;
  g.deleteAttribute("normal");
  const smooth = mergeVertices(g);
  g.dispose();
  smooth.computeVertexNormals();
  return smooth;
}

export function disposeScene(scene: THREE.Scene) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  scene.traverse((o) => {
    if (
      o instanceof THREE.Mesh ||
      o instanceof THREE.Line ||
      o instanceof THREE.Points
    ) {
      geometries.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        materials.add(m);
        for (const v of Object.values(m))
          if (v instanceof THREE.Texture) textures.add(v);
      }
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
}
