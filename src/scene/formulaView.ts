import { CHAMBERS } from "../chambers.ts";
import type { Chamber } from "../chambers.ts";
import { canWalk, groundHeight } from "./navigation.ts";
import type { Obstacle, Player } from "./navigation.ts";
import { roomAt } from "./shipLayout.ts";
import { Vector3 } from "three";
import type { PerspectiveCamera } from "three";

export type FormulaView = { index: number; left: number; top: number; width: number; height: number };

/** The screen faces into the room from its east wall. */
export function formulaScreen(chamber: Chamber) {
  return {
    x: chamber.x + 5.5, y: 1.95, z: chamber.z + 3.85, width: 1.64, height: 1.14,
    displayWidth: 1.55, displayHeight: 1.05, displayDepth: 0.065,
  };
}

/** Match native readable text to the surface of the original wall display. */
export function projectFormulaScreen(index: number, camera: PerspectiveCamera, width: number, height: number): FormulaView {
  const s = formulaScreen(CHAMBERS[index]);
  const topLeft = new Vector3(s.x - s.displayDepth, s.y + s.displayHeight / 2, s.z - s.displayWidth / 2).project(camera);
  const bottomRight = new Vector3(s.x - s.displayDepth, s.y - s.displayHeight / 2, s.z + s.displayWidth / 2).project(camera);
  return {
    index,
    left: (topLeft.x + 1) * width / 2,
    top: (1 - topLeft.y) * height / 2,
    width: (bottomRight.x - topLeft.x) * width / 2,
    height: (topLeft.y - bottomRight.y) * height / 2,
  };
}

export function focusedFormula(player: Player, obstacles: Obstacle[]): number | null {
  const index = roomAt(player.x, player.z);
  if (index < 0 || !CHAMBERS[index].formula) return null;
  const screen = formulaScreen(CHAMBERS[index]);
  const dx = screen.x - player.x;
  const directionX = -Math.sin(player.yaw) * Math.cos(player.pitch);
  if (dx < 0.3 || directionX <= 0) return null;
  const distance = dx / directionX;
  if (distance > 3.2) return null;
  const hitZ = player.z - Math.cos(player.yaw) * Math.cos(player.pitch) * distance;
  const hitY = groundHeight(player.x, player.z) + 1.68 + Math.sin(player.pitch) * distance;
  if (Math.abs(hitZ - screen.z) > screen.width / 2 + 0.12 ||
      Math.abs(hitY - screen.y) > screen.height / 2 + 0.12) return null;
  // Trace the approach, stopping before the capsule would touch the wall itself.
  for (let t = 0.1; t < distance - 0.4; t += 0.15) {
    if (!canWalk(player.x + directionX * t,
      player.z - Math.cos(player.yaw) * Math.cos(player.pitch) * t, obstacles)) return null;
  }
  return index;
}

export function formulaFraming(width: number, height: number) {
  const distance = 2;
  const screenHeight = Math.min(height * 0.68, (width - 40) * 1.14 / 1.64);
  return {
    distance,
    fov: 2 * Math.atan(1.14 * height / (screenHeight * 2 * distance)) * 180 / Math.PI,
  };
}
