let loading: Promise<void> | undefined;

/** Load paper and menu fonts during arrival, before any menu can be opened. */
export function prepareInterface() {
  return (loading ??= Promise.allSettled([
    ...["keepers-paper", "keepers-map"].map((name) => {
      const image = new Image();
      image.src = `/art/${name}.webp`;
      return image.decode();
    }),
    ...[
      '600 28px "Barlow Condensed"',
      '400 16px "DM Sans"',
      '500 16px "DM Sans"',
      '600 16px "DM Sans"',
      '500 35px "Cormorant Garamond"',
      '500 24px "Caveat"',
      '400 12px "IBM Plex Mono"',
    ].map((font) => document.fonts.load(font)),
  ]).then(() => {}));
}
