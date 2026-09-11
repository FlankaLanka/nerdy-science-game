import { mkdir, writeFile } from "node:fs/promises";
const root = new URL("../public/art/", import.meta.url);
await mkdir(root, { recursive: true });
const headers = { "User-Agent": "SIGNAL-Game-Asset-Pipeline/1.0" };
async function download(url, file) {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`);
  await writeFile(new URL(file, root), Buffer.from(await r.arrayBuffer()));
  console.log(`Saved ${file}`);
}
const assets = {
  rock: "dark_rock",
  ground: "aerial_grass_rock",
  wood: "weathered_planks",
  plaster: "grey_plaster",
  metal: "green_metal_rust",
};
const credits = [];
for (const [short, name] of Object.entries(assets)) {
  const response = await fetch(`https://api.polyhaven.com/files/${name}`, {
    headers,
  });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  const data = await response.json();
  const maps = [
    ["Diffuse", "color"],
    ["nor_gl", "normal"],
    ["Rough", "roughness"],
  ];
  const results = await Promise.allSettled(
    maps.map(async ([key, suffix]) => {
      const source = data[key]?.["1k"]?.jpg;
      if (!source) throw new Error(`Missing ${name}/${key}`);
      await download(source.url, `${short}-${suffix}.jpg`);
      credits.push({
        file: `${short}-${suffix}.jpg`,
        source: source.url,
        asset: `https://polyhaven.com/a/${name}`,
        license: "CC0-1.0",
      });
    }),
  );
  for (const result of results)
    if (result.status === "rejected") throw result.reason;
}
const name = "belfast_sunset_puresky";
const data = await (
  await fetch(`https://api.polyhaven.com/files/${name}`, { headers })
).json();
await download(data.hdri["1k"].hdr.url, "coastal-sunset.hdr");
credits.push({
  file: "coastal-sunset.hdr",
  source: data.hdri["1k"].hdr.url,
  asset: `https://polyhaven.com/a/${name}`,
  license: "CC0-1.0",
});
await download(
  "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/waternormals.jpg",
  "water-normal.jpg",
);
credits.push({
  file: "water-normal.jpg",
  source:
    "https://github.com/mrdoob/three.js/blob/dev/examples/textures/waternormals.jpg",
  license: "MIT (Three.js examples)",
});
const pine = await (
  await fetch("https://api.polyhaven.com/files/pine_sapling_medium", {
    headers,
  })
).json();
for (const [key, file] of [
  ["twig_diff", "pine-color"],
  ["twig_alpha", "pine-alpha"],
]) {
  const source = pine[key]["1k"].png;
  await download(source.url, `${file}.png`);
  credits.push({
    file: `${file}.webp`,
    source: source.url,
    asset: "https://polyhaven.com/a/pine_sapling_medium",
    license: "CC0-1.0",
  });
}
await writeFile(
  new URL("credits.json", root),
  JSON.stringify(credits, null, 2) + "\n",
);
