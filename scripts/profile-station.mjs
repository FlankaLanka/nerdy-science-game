import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import { chamberFixture } from "../tests/chamber-fixtures.ts";
import { SAVE_KEY, serializeCampaign } from "../src/chamberCampaign.ts";
import { PLAYER_KEY } from "../src/scene/navigation.ts";
const browser = await chromium.launch({
  args: process.platform === "darwin" ? ["--use-angle=metal"] : [],
});
const results = [];
async function sample(page) {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const values = [];
        let previous = performance.now();
        function frame(now) {
          values.push(now - previous);
          previous = now;
          if (values.length < 130) {
            requestAnimationFrame(frame);
            return;
          }
          const a = values.slice(10).sort((a, b) => a - b);
          resolve({
            median: a[Math.floor(a.length * 0.5)],
            p90: a[Math.floor(a.length * 0.9)],
            max: a.at(-1),
            frames: a.length,
          });
        }
        requestAnimationFrame(frame);
      }),
  );
}
try {
  for (const scene of [
    { name: "wake", pose: { x: -10, z: 23, yaw: 0, pitch: 0 }, count: 0 },
    {
      name: "earth",
      pose: { x: 6.5, z: 31, yaw: 1.73, pitch: 0.08 },
      count: 6,
    },
    {
      name: "kit",
      pose: { x: 10, z: 21.5, yaw: 0, pitch: 0 },
      count: 6,
      kit: true,
    },
  ]) {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
      reducedMotion: "no-preference",
    });
    await page.addInitScript(
      ({ key, value, playerKey, pose }) => {
        localStorage.setItem(key, value);
        localStorage.setItem(playerKey, JSON.stringify(pose));
      },
      {
        key: SAVE_KEY,
        value: serializeCampaign(chamberFixture(scene.count)),
        playerKey: PLAYER_KEY,
        pose: scene.pose,
      },
    );
    await page.goto(process.env.REVIEW_URL ?? "http://localhost:5176");
    await page.getByRole("button", { name: /^(Begin|Continue)$/ }).click();
    if (scene.kit) {
      await page.getByRole("button", { name: "Use circuit bench" }).waitFor();
      await page.keyboard.press("e");
      await page.locator(".kit-board canvas").waitFor();
    }
    await page.waitForTimeout(1500);
    const stationary = await sample(page);
    let moving;
    if (!scene.kit) {
      await page.keyboard.down("ArrowRight");
      moving = await sample(page);
      await page.keyboard.up("ArrowRight");
    }
    let dragging;
    if (scene.kit) {
      const bounds = await page
        .getByRole("button", { name: "Select Bulb 2", exact: true })
        .boundingBox();
      const x = bounds.x + bounds.width / 2,
        y = bounds.y + bounds.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      const measurements = await Promise.all([
        sample(page),
        (async () => {
          for (let step = 0; step < 130; step++) {
            await page.mouse.move(
              x + Math.sin(step * 0.08) * 38,
              y + Math.cos(step * 0.08) * 16,
            );
            await new Promise((resolve) => setTimeout(resolve, 16));
          }
        })(),
      ]);
      dragging = measurements[0];
      await page.mouse.up();
    }
    results.push({
      scene: scene.name,
      stationary,
      ...(moving ? { moving } : {}),
      ...(dragging ? { dragging } : {}),
    });
    process.stdout.write(JSON.stringify(results.at(-1)) + "\n");
    await page.close();
  }
  await fs.mkdir("artifacts/station", { recursive: true });
  await fs.writeFile(
    "artifacts/station/performance.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        viewport: "1280x720",
        browser: "Chromium, Metal",
        results,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
