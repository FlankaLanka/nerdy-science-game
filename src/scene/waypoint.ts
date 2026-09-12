import * as THREE from "three";

export type Waypoint = {
  x: number;
  y: number;
  visible: boolean;
  distance: number;
};
const projected = new THREE.Vector3();

/** Project the exact world anchor after the camera pose is committed for this frame. */
export function projectWaypoint(
  camera: THREE.Camera,
  target: THREE.Vector3,
  width: number,
  height: number,
  distance: number,
  enabled: boolean,
): Waypoint {
  projected.copy(target).project(camera);
  return {
    x: (projected.x * 0.5 + 0.5) * width,
    y: (-projected.y * 0.5 + 0.5) * height,
    distance,
    visible:
      enabled &&
      distance > 3 &&
      projected.z > -1 &&
      projected.z < 1 &&
      Math.abs(projected.x) < 0.96 &&
      Math.abs(projected.y) < 0.88,
  };
}
