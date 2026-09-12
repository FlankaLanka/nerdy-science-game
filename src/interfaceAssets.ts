let loading: Promise<void> | undefined;

/** Prepare the locally bundled console type before the world paints its signage. */
export function prepareInterface() {
  return (loading ??= Promise.allSettled(
    [
      '400 24px "Space Grotesk"',
      '500 24px "Space Grotesk"',
      '600 24px "Space Grotesk"',
      '700 24px "Space Grotesk"',
      '400 16px "IBM Plex Mono"',
    ].map((font) => document.fonts.load(font)),
  ).then(() => {}));
}
