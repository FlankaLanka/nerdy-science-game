import { readdir, unlink, writeFile, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
const run = promisify(execFile);
const runtime = new URL("../public/art/", import.meta.url);
const records = [];
for (const name of await readdir(runtime)) {
  if (!/\.(jpg|png)$/.test(name)) continue;
  const destination = name.replace(/\.(jpg|png)$/, ".webp");
  await run("cwebp", [
    "-quiet",
    "-q",
    name.includes("normal") || name.includes("pine") ? "90" : "85",
    fileURLToPath(new URL(name, runtime)),
    "-o",
    fileURLToPath(new URL(destination, runtime)),
  ]);
  await unlink(new URL(name, runtime));
}
for (const name of await readdir(runtime)) {
  if (!name.endsWith(".webp")) continue;
  records.push({
    file: name,
    bytes: (await stat(new URL(name, runtime))).size,
  });
}
await writeFile(
  new URL("optimized.json", runtime),
  JSON.stringify(records, null, 2) + "\n",
);
console.log(
  `Prepared ${records.length} runtime images (${(records.reduce((n, r) => n + r.bytes, 0) / 1e6).toFixed(2)} MB). Original downloads are removed after successful conversion.`,
);
