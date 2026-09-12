let loading: Promise<void> | undefined;

/** Load paper and menu fonts during arrival, before any menu can be opened. */
export function prepareInterface() {
  return (loading ??= Promise.allSettled([
    ...["keepers-paper"].map((name) => {
      const image = new Image();
      image.src = `/art/${name}.webp`;
      return image.decode();
    }),
    ...[
      '400 24px "IM Fell English"',
      'italic 400 24px "IM Fell English"',
      '400 24px "Kalam"',
    ].map((font) => document.fonts.load(font)),
  ]).then(() => {}));
}
