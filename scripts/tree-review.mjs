import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { initialState, reducer } from "../src/game.ts";

const directory = process.env.TREE_REVIEW_OUTPUT || "docs/screenshots/trees";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  args: process.platform === "darwin" ? ["--use-angle=metal"] : [],
});
const errors = [],
  views = [];
const state = {
  ...reducer(initialState(), { type: "START" }),
  intro: 3,
  lesson: 4,
};
try {
  for (const [name, x, z, yaw, pitch] of [
    ["western-pines", -3, 15.5, 0.98, 0.3],
    ["harbor-pines", 13, 10, -0.62, 0.4],
    ["close-canopy", 15, 8, -0.54, 0.6],
  ]) {
    const context = await browser.newContext({
      viewport: { width: 1600, height: 900 },
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(
      ({ state, player }) => {
        localStorage.setItem("signal.lighthouse.v1", JSON.stringify(state));
        localStorage.setItem(
          "signal.lighthouse.player.v1",
          JSON.stringify(player),
        );
      },
      { state, player: { x, z, yaw, pitch } },
    );
    await page.goto(process.env.SIGNAL_REVIEW_URL || "http://127.0.0.1:5174");
    await page
      .getByRole("button", { name: "Continue", exact: true })
      .click({ timeout: 60000 });
    await page
      .getByRole("button", { name: "Pause game", exact: true })
      .waitFor();
    const timing = await page.evaluate(async () => {
      const samples = [];
      let previous;
      await new Promise((resolve) => {
        function frame(now) {
          if (previous !== undefined) samples.push(now - previous);
          previous = now;
          if (samples.length < 150) requestAnimationFrame(frame);
          else resolve();
        }
        requestAnimationFrame(frame);
      });
      const sorted = samples.slice(30).sort((a, b) => a - b);
      return {
        medianFrameMs: sorted[Math.floor(sorted.length * 0.5)],
        p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
      };
    });
    await page.screenshot({ path: `${directory}/${name}.png` });
    await page.keyboard.press("Tab");
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("signal.lighthouse.player.v1")),
    );
    if (Math.hypot(saved.x - x, saved.z - z) > 0.01)
      throw new Error(`Obstructed review position: ${name}`);
    views.push({ name, player: saved, ...timing });
    console.log(JSON.stringify(views.at(-1)));
    await context.close();
  }
  await writeFile(
    `${directory}/review.json`,
    JSON.stringify(
      {
        date: new Date().toISOString(),
        method:
          "150 animation frames per fixed viewpoint, first 30 discarded; local Chromium diagnostic at 1600 × 900, not a hardware guarantee.",
        views,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  if (errors.length) throw new Error(errors.join("\n"));
} finally {
  await browser.close();
}
