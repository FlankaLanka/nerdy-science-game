import { test, expect } from "@playwright/test";
import { begin, bench } from "./helpers";

test("pointer shaft aims at the actual target in every room and motion mode", async ({
  page,
}) => {
  await page.goto("/tests/browser/fixture.html");
  const failures = await page.evaluate(async () => {
    const t = "/node_modules/.vite/deps/three.js",
      g = "/src/scene/tandem.ts",
      c = "/src/chambers.ts";
    const THREE = (await import(t)) as typeof import("three");
    const { buildTandem } = (await import(
      g
    )) as typeof import("../../src/scene/tandem");
    const { CHAMBERS } = (await import(
      c
    )) as typeof import("../../src/chambers");
    const guide = buildTandem(new THREE.Scene());
    const base = guide.root.getObjectByName("Tandem pointer base")!;
    const tip = guide.root.getObjectByName("Tandem pointer tip")!;
    const failures: string[] = [];
    for (const reduced of [true, false])
      for (let index = 0; index < 6; index++) {
        guide.reset();
        const bench = CHAMBERS[index].bench;
        const player = { x: bench.x, z: bench.z + 2.5, yaw: 0, pitch: 0 };
        for (const [dx, dz] of [
          [0, 0],
          [-0.9, -0.55],
          [0.9, 0.55],
        ]) {
          const target = new THREE.Vector3(bench.x + dx, 1.094, bench.z + dz);
          for (let i = 0; i < (reduced ? 1 : 180); i++)
            guide.update(
              1 / 60,
              player,
              [],
              [],
              index,
              false,
              false,
              reduced,
              "point",
              target,
            );
          const a = base.getWorldPosition(new THREE.Vector3()),
            b = tip.getWorldPosition(new THREE.Vector3());
          const direction = b.clone().sub(a).normalize(),
            toTarget = target.clone().sub(b);
          const miss = direction.clone().cross(toTarget).length();
          if (direction.dot(toTarget) <= 0 || miss > 0.005)
            failures.push(`${index} ${reduced} ${dx},${dz}: miss ${miss}`);
          if (Math.min(a.y, b.y) < 1.06)
            failures.push(`pointer below tabletop ${index}`);
        }
        guide.update(1 / 60, player, [], [], null, false, false, true, "speak");
        const a = base.getWorldPosition(new THREE.Vector3()),
          b = tip.getWorldPosition(new THREE.Vector3());
        if (b.y >= a.y)
          failures.push("pointer did not stow during conversation");
      }
    return failures;
  });
  expect(failures).toEqual([]);
});

test("selected parts and the raised forearm render together at the bench", async ({
  page,
}) => {
  await begin(page, 3);
  await bench(page, 3);
  await page.getByRole("button", { name: "Select Bulb", exact: true }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "artifacts/tandem/pointer-fixed-bench.png" });
});
