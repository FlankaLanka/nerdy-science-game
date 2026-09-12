/** Cap native-viewport render resolution for a predictable GPU budget. */
export function gamePixelRatio(limit: number) {
  return Math.min(devicePixelRatio, limit);
}
