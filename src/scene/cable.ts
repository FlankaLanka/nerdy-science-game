import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** Round each corner locally, without letting a spline overshoot the route. */
export function roundedCablePath(points: THREE.Vector3[], radius = 0.18) {
  const path = new THREE.CurvePath<THREE.Vector3>();
  path.arcLengthDivisions = 1200;
  let start = points[0];
  for (let i = 1; i < points.length - 1; i++) {
    const before = points[i - 1], corner = points[i], after = points[i + 1];
    const inset = Math.min(radius, before.distanceTo(corner) * 0.42, after.distanceTo(corner) * 0.42);
    const a = corner.clone().lerp(before, inset / corner.distanceTo(before));
    const b = corner.clone().lerp(after, inset / corner.distanceTo(after));
    if (start.distanceTo(a) > 0.0001) path.add(new THREE.LineCurve3(start, a));
    path.add(new THREE.QuadraticBezierCurve3(a, corner, b));
    start = b;
  }
  path.add(new THREE.LineCurve3(start, points[points.length - 1]));
  return path;
}

/** Spend vertices on bends; long straight runs need only their end rings. */
function cableGeometry(curve: THREE.Curve<THREE.Vector3>, radius: number) {
  const sections = curve instanceof THREE.CurvePath ? curve.curves : [curve];
  const points: THREE.Vector3[] = [], tangents: THREE.Vector3[] = [], distances: number[] = [];
  let length = 0;
  for (const section of sections) {
    const count = section instanceof THREE.LineCurve3 ? 1 : section instanceof THREE.QuadraticBezierCurve3 ? 12 : 64;
    for (let i = points.length ? 1 : 0; i <= count; i++) {
      const point = section.getPointAt(i / count);
      if (points.length) length += point.distanceTo(points[points.length - 1]);
      points.push(point);
      tangents.push(section.getTangentAt(i / count));
      distances.push(length);
    }
  }
  // TubeGeometry transports its frames along these samples. UV distance remains
  // physical, so a pulse has the same speed through a bend as along a straight.
  const sweep = new class extends THREE.Curve<THREE.Vector3> {
    constructor() { super(); }
    getPointAt(u: number, target = new THREE.Vector3()) {
      return target.copy(points[Math.round(u * (points.length - 1))]);
    }
    getTangentAt(u: number, target = new THREE.Vector3()) {
      return target.copy(tangents[Math.round(u * (points.length - 1))]);
    }
  }();
  const geometry = new THREE.TubeGeometry(sweep, points.length - 1, radius, 24, false);
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < points.length; i++)
    for (let j = 0; j <= 24; j++) uv.setX(i * 25 + j, distances[i] / length);
  return geometry;
}

type CableOptions = {
  radius: number;
  color: string;
  signal: string;
  standby: string;
  spacing: number;
  pulseWidth: number;
};

/** Insulated lead with embedded tracer lines. Light is a power indicator. */
export function buildCable(curve: THREE.Curve<THREE.Vector3>, options: CableOptions) {
  const root = new THREE.Group();
  root.userData.dynamic = true;
  const length = curve.getLength();
  const uniforms = {
    cableLength: { value: length },
    cableTravel: { value: 0 },
    cableDirection: { value: 1 },
    cableSpacing: { value: Math.min(options.spacing, length * 0.65) },
    cableWidth: { value: Math.min(options.pulseWidth, length * 0.13) },
    cablePower: { value: 0 },
    cableMotion: { value: 0 },
    cableSignal: { value: new THREE.Color(options.signal) },
    cableStandby: { value: new THREE.Color(options.standby) },
  };
  const material = new THREE.MeshStandardMaterial({ color: options.color, roughness: 0.43, metalness: 0.08 });
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `varying vec2 vCableUv;\n${shader.vertexShader}`
      .replace("#include <uv_vertex>", "#include <uv_vertex>\nvCableUv = uv;");
    shader.fragmentShader = `
      varying vec2 vCableUv;
      uniform float cableLength, cableTravel, cableDirection, cableSpacing, cableWidth, cablePower, cableMotion;
      uniform vec3 cableSignal, cableStandby;
      ${shader.fragmentShader}`
      .replace("#include <color_fragment>", `#include <color_fragment>
        float seam = abs(fract(vCableUv.y * 3.0 + 0.5) - 0.5);
        float edge = max(fwidth(seam), 0.004);
        float tracer = 1.0 - smoothstep(0.045 - edge, 0.045 + edge, seam);
        vec3 tracerColor = mix(cableStandby, cableSignal, cablePower);
        diffuseColor.rgb = mix(diffuseColor.rgb, tracerColor * 0.65, tracer);
      `)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        float distanceAlong = (cableDirection > 0.0 ? vCableUv.x : 1.0 - vCableUv.x) * cableLength;
        // A pointed leading edge and fading tail make direction readable in a
        // single frame. Reduced motion retains the same arrows without travel.
        float phase = mod(distanceAlong - cableTravel * cableMotion + cableSpacing * 0.5, cableSpacing) - cableSpacing * 0.5;
        float chevron = phase + seam * cableWidth * 1.8;
        float head = (1.0 - smoothstep(cableWidth * 0.12, cableWidth * 0.24, abs(chevron))) *
          (1.0 - smoothstep(0.29 - edge, 0.29 + edge, seam));
        float behind = -phase / cableWidth;
        float tail = smoothstep(0.0, 0.35, behind) * (1.0 - smoothstep(0.4, 2.4, behind));
        float tailWidth = mix(0.13, 0.025, clamp(behind / 2.4, 0.0, 1.0));
        tail *= 1.0 - smoothstep(tailWidth - edge, tailWidth + edge, seam);
        totalEmissiveRadiance += tracer * tracerColor * (0.12 + cablePower * 0.18);
        totalEmissiveRadiance += cablePower * (
          mix(cableSignal, vec3(1.0), 0.7) * head * mix(0.85, 2.0, cableMotion) +
          cableSignal * tail * mix(0.16, 0.85, cableMotion));
      `);
  };
  material.customProgramCacheKey = () => "insulated-cable-v2";
  const jacket = new THREE.Mesh(cableGeometry(curve, options.radius), material);
  jacket.name = "Insulated cable";
  jacket.castShadow = jacket.receiveShadow = true;
  root.add(jacket);

  const rubber = new THREE.MeshStandardMaterial({ color: "#202c30", roughness: 0.62, metalness: 0.04 });
  const metal = new THREE.MeshStandardMaterial({ color: "#879497", roughness: 0.5, metalness: 0.55 });
  const ownedGeometry: THREE.BufferGeometry[] = [jacket.geometry];
  const fittings = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const up = new THREE.Vector3(0, 1, 0);
  // Tapered strain reliefs and small compression collars hide the open tube ends.
  for (const end of [0, 1]) {
    const r = options.radius;
    const direction = curve.getTangentAt(end).multiplyScalar(end ? -1 : 1);
    const position = curve.getPointAt(end);
    function fitting(from: number, height: number, bottom: number, top: number, mat: THREE.Material) {
      const geometry = new THREE.CylinderGeometry(top * r, bottom * r, height * r, 24);
      const center = position.clone().addScaledVector(direction, (from + height / 2) * r);
      geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, direction));
      geometry.translate(center.x, center.y, center.z);
      const group = fittings.get(mat) ?? [];
      group.push(geometry);
      fittings.set(mat, group);
    }
    fitting(0, 1.3, 1.35, 1.35, metal);
    fitting(1.3, 3.6, 1.5, 1.04, rubber);
    for (const offset of [1.8, 2.6, 3.4]) {
      const radius = 1.5 - (offset - 1.3) * 0.46 / 3.6;
      fitting(offset, 0.22, radius + 0.09, radius + 0.06, rubber);
    }
  }
  // One draw each for rubber and metal, independent of the number of ribs.
  for (const [material, pieces] of fittings) {
    const geometry = mergeGeometries(pieces, false)!;
    pieces.forEach(piece => piece.dispose());
    ownedGeometry.push(geometry);
    const fitting = new THREE.Mesh(geometry, material);
    fitting.castShadow = fitting.receiveShadow = true;
    root.add(fitting);
  }
  let powered = false, started = 0;
  return {
    root,
    jacket,
    uniforms,
    update(on: boolean, time: number, reduced: boolean, animate: boolean, speed: number, direction = 1) {
      if (on && !powered) started = time;
      powered = on;
      uniforms.cablePower.value = on ? 1 : 0;
      uniforms.cableMotion.value = on && !reduced && animate ? 1 : 0;
      uniforms.cableTravel.value = Math.max(0, time - started) * speed;
      uniforms.cableDirection.value = direction;
    },
    select(selected: boolean) {
      material.color.set(selected ? "#9ebfc5" : options.color);
    },
    dispose() {
      root.removeFromParent();
      ownedGeometry.forEach(geometry => geometry.dispose());
      [material, rubber, metal].forEach(material => material.dispose());
    },
  };
}
