export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export function gameScale() {
  return Math.min(innerWidth / GAME_WIDTH, innerHeight / GAME_HEIGHT);
}

/** Keep the 3D drawing buffer sharp when the fixed game frame is enlarged. */
export function gamePixelRatio(limit: number) {
  return Math.min(devicePixelRatio * gameScale(), limit);
}
