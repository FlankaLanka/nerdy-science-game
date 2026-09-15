import * as THREE from "three";
import { KIT_SIZE } from "../circuitKit.ts";
import type { Circuit } from "../circuitKit.ts";

export const KIT_SCALE = 0.0032;
export const BENCH_HEIGHT = 1.03;
export type BenchPoint = { x: number; y: number };
export type BenchView = {
  index: number | null;
  ready: boolean;
  left: number;
  top: number;
  width: number;
  height: number;
};
export type BenchInteraction = {
  circuit: Circuit;
  selected: string | null;
  lead: { a: BenchPoint; b: BenchPoint } | null;
};
export type BenchControls = {
  setBenchInteraction: (interaction: BenchInteraction | null) => void;
  benchPoint: (x: number, y: number) => BenchPoint | null;
  projectBench: (point: BenchPoint, elevation?: number) => BenchPoint | null;
  pickBench: (x: number, y: number) => string | null;
};

/** Reserve space for the small tool shelf while keeping the camera below the ceiling. */
export function benchFraming(width: number, height: number) {
  const compact = height <= 480 && width > 640;
  const shortPortrait = width <= 640 && height <= 690;
  const side = width <= 640 ? 20 : 64;
  const availableWidth = width - side * 2 - (compact ? 145 : 0);
  const top = compact ? 82 : shortPortrait ? 112 : width <= 640 ? 142 : 130;
  const bottom = compact ? 120 : shortPortrait ? 235 : width <= 640 ? 265 : 285;
  const availableHeight = Math.max(90, height - top - bottom);
  const boardWidth = Math.min(1120, availableWidth, availableHeight * 1.8);
  const boardHeight = boardWidth / 1.8;
  const centerX = (width - (compact ? 145 : 0)) / 2;
  const centerY = top + availableHeight / 2;
  const distance = 1.9;
  return {
    left: centerX - boardWidth / 2,
    top: centerY - boardHeight / 2,
    width: boardWidth,
    height: boardHeight,
    distance,
    fov: THREE.MathUtils.radToDeg(
      2 *
        Math.atan(
          (KIT_SIZE.height * KIT_SCALE * height) / (boardHeight * 2 * distance),
        ),
    ),
    offsetX: width / 2 - centerX,
    offsetY: height / 2 - centerY,
  };
}

export function benchWorldPoint(
  bench: { x: number; z: number },
  point: BenchPoint,
  elevation = 0,
) {
  return new THREE.Vector3(
    bench.x + (point.x - KIT_SIZE.width / 2) * KIT_SCALE,
    BENCH_HEIGHT + elevation * KIT_SCALE,
    bench.z + (point.y - KIT_SIZE.height / 2) * KIT_SCALE,
  );
}
