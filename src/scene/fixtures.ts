import * as THREE from "three";

/** A metal shade has an inside, outside and a closed lip, visible from below. */
export function lampShadeGeometry() {
  return new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.31, 0),
      new THREE.Vector2(0.035, 0.15),
      new THREE.Vector2(0.025, 0.14),
      new THREE.Vector2(0.29, 0.008),
      new THREE.Vector2(0.31, 0),
    ],
    24,
  );
}

export const towerRadius = (height: number) =>
  2.65 - ((height - 0.2) / 16) * 0.93;
export const towerPitch = -Math.atan2(0.93, 16);

/** A plaque follows the masonry radius and taper instead of floating on a tangent. */
export function curvedTowerPlaque(
  width: number,
  height: number,
  centerHeight: number,
) {
  const depth = 0.055;
  const geometry = new THREE.BoxGeometry(width, height, depth, 24, 2, 1);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const y = centerHeight + positions.getY(i);
    const radius = towerRadius(y);
    const z = Math.sqrt(radius * radius - positions.getX(i) ** 2);
    // Rear face embeds slightly, including the deviation of the 48-sided tower.
    positions.setZ(i, z + positions.getZ(i) + 0.01);
  }
  geometry.computeVertexNormals();
  return geometry;
}
