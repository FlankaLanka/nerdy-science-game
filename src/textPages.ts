/** Page long radio responses without clipping text or introducing a scrolling panel. */
export function textPages(text: string, size = 220) {
  const pages: string[] = [];
  let rest = text.trim();
  while (rest.length > size) {
    const boundary = rest.lastIndexOf(" ", size);
    const end = boundary > size / 2 ? boundary : size;
    pages.push(rest.slice(0, end));
    rest = rest.slice(end).trimStart();
  }
  if (rest) pages.push(rest);
  return pages.length ? pages : [""];
}
