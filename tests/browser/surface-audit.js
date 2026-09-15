import * as THREE from "three";

function isVisible(object) {
  for (let parent = object; parent; parent = parent.parent)
    if (!parent.visible) return false;
  return true;
}

const cross = (a, b, c) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

// Clip a counterclockwise polygon to a triangle. Shared edges have zero area.
function clip(polygon, triangle) {
  for (let i = 0; i < 3; i++) {
    const a = triangle[i], b = triangle[(i + 1) % 3], input = polygon;
    polygon = [];
    for (let j = 0; j < input.length; j++) {
      const p = input[j], q = input[(j + 1) % input.length];
      const cp = cross(a, b, p), cq = cross(a, b, q);
      if (cp >= -1e-10) polygon.push(p);
      if ((cp > 0 && cq < 0) || (cp < 0 && cq > 0)) {
        const f = cp / (cp - cq);
        polygon.push([p[0] + f * (q[0] - p[0]), p[1] + f * (q[1] - p[1])]);
      }
    }
    if (polygon.length < 3) return [];
  }
  return polygon;
}

// Find same-facing opaque triangle interiors on planes rounded to 0.1 mm.
// Inspect triangles inside merged meshes and apply every instance transform.
// Transparent panes/labels have their own depth-write policy and are excluded.
export function scanSurfaces(root, { precision = 10000 } = {}) {
  root.updateMatrixWorld(true);
  const planes = new Map();
  const instance = new THREE.Matrix4(), matrix = new THREE.Matrix4();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let triangleCount = 0;
  root.traverse((mesh) => {
    if (
      !mesh.isMesh || Array.isArray(mesh.material) ||
      mesh.material.transparent || !isVisible(mesh)
    ) return;
    const pos = mesh.geometry.attributes.position, index = mesh.geometry.index;
    const count = index ? index.count : pos.count;
    for (let k = 0; k < (mesh.isInstancedMesh ? mesh.count : 1); k++) {
      matrix.copy(mesh.matrixWorld);
      if (mesh.isInstancedMesh) {
        mesh.getMatrixAt(k, instance);
        matrix.multiply(instance);
      }
      for (let t = 0; t < count; t += 3) {
        a.fromBufferAttribute(pos, index ? index.getX(t) : t).applyMatrix4(matrix);
        b.fromBufferAttribute(pos, index ? index.getX(t + 1) : t + 1).applyMatrix4(matrix);
        c.fromBufferAttribute(pos, index ? index.getX(t + 2) : t + 2).applyMatrix4(matrix);
        const normal = b.clone().sub(a).cross(c.clone().sub(a));
        if (normal.length() / 2 < 1e-9) continue;
        normal.normalize();
        triangleCount++;
        const d = normal.dot(a);
        const key = normal.toArray().map((v) => Math.round(v * 10000)).join(",") +
          ":" + Math.round(d * precision);
        const axis = normal.toArray().map(Math.abs)
          .reduce((best, value, i, values) => value > values[best] ? i : best, 0);
        const axes = [0, 1, 2].filter((i) => i !== axis);
        const verts = [a, b, c].map((v) => [
          v.getComponent(axes[0]), v.getComponent(axes[1]),
        ]);
        if (cross(...verts) < 0) verts.reverse();
        const item = {
          mesh: mesh.uuid,
          name: mesh.name || mesh.parent?.name,
          kind: mesh.geometry.type,
          instance: mesh.isInstancedMesh ? k : null,
          face: t / 3,
          color: mesh.material.color?.getHexString(),
          verts, axes, axis, normal: normal.toArray(), d,
          min: axes.map((_, i) => Math.min(...verts.map((v) => v[i]))),
          max: axes.map((_, i) => Math.max(...verts.map((v) => v[i]))),
        };
        if (!planes.has(key)) planes.set(key, []);
        planes.get(key).push(item);
      }
    }
  });

  const found = [];
  for (const group of planes.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => a.min[0] - b.min[0]);
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i], b = group[j];
        if (b.min[0] >= a.max[0] - 1e-7) break;
        if (b.min[1] >= a.max[1] - 1e-7 || a.min[1] >= b.max[1] - 1e-7) continue;
        const polygon = clip(a.verts, b.verts);
        let area = 0;
        for (let k = 0; k < polygon.length; k++) {
          const p = polygon[k], q = polygon[(k + 1) % polygon.length];
          area += p[0] * q[1] - p[1] * q[0];
        }
        area = Math.abs(area) / 2;
        if (area < 1e-8) continue;
        const center = [0, 0, 0];
        a.axes.forEach((axis, k) => {
          center[axis] = polygon.reduce((sum, p) => sum + p[k], 0) / polygon.length;
        });
        center[a.axis] = (a.d - a.axes.reduce(
          (sum, i) => sum + a.normal[i] * center[i], 0,
        )) / a.normal[a.axis];
        found.push({
          point: center, normal: a.normal, area,
          faces: [a, b].map(({ mesh, name, kind, instance, face, color }) => ({
            mesh, name, kind, instance, face, color,
          })),
        });
      }
    }
  }
  return { triangleCount, candidates: found };
}

// A buried joint cannot flicker in the player's view. Cast to each overlap's
// interior from up to 12 nearby viewpoints, including overhead bench cameras.
export function visibleConflicts(root, candidates, eyes) {
  root.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(), normal = new THREE.Vector3();
  const target = new THREE.Vector3(), origin = new THREE.Vector3();
  return candidates.filter((candidate) => {
    target.fromArray(candidate.point);
    normal.fromArray(candidate.normal);
    const nearEyes = eyes
      .filter((e) => Math.hypot(e[0] - target.x, e[2] - target.z) < 10)
      .sort((a, b) => origin.fromArray(a).distanceToSquared(target) -
        origin.fromArray(b).distanceToSquared(target))
      .slice(0, 12);
    for (const eye of nearEyes) {
      origin.fromArray(eye);
      if (origin.clone().sub(target).dot(normal) < 0.00001) continue;
      const distance = origin.distanceTo(target);
      ray.set(origin, target.clone().sub(origin).normalize());
      ray.far = distance + 0.002;
      const hit = ray.intersectObject(root, true).find(({ object }) =>
        isVisible(object) && !Array.isArray(object.material) &&
        !object.material.transparent,
      );
      if (hit && Math.abs(hit.distance - distance) < 0.0007) {
        candidate.eye = eye;
        return true;
      }
    }
    return false;
  });
}
