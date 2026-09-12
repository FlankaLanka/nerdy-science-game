import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { initialState, reducer } from "../src/game.ts";

const url = process.env.SIGNAL_REVIEW_URL || "http://127.0.0.1:5174";
const directory = process.env.SIGNAL_REVIEW_OUTPUT || "docs/screenshots";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  args: process.platform === "darwin" ? ["--use-angle=metal"] : [],
});
const errors = [];
let state = reducer(initialState(), { type: "START" });
for (const action of [
  { type: "WIRE", wire: ["a2", "m1"] },
  { type: "MATERIAL", material: "copper" },
  { type: "PREDICT", value: "on" },
  { type: "TEST" },
  { type: "EXPLAIN", value: "loop" },
])
  state = reducer(state, { type: "MISSION", id: "workshop", action });
state = reducer(state, { type: "COMPLETE", id: "workshop", now: 1 });
state = { ...state, intro: 3, lesson: 4, reducedMotion: true };
const views = [
  ["harbor-sign-front", 18.4, 16, 0, -0.05],
  ["harbor-sign-side", 20.5, 15, 0.82, -0.08],
  ["harbor-sign-back", 18.4, 10.5, Math.PI, -0.08],
  ["harbor-approach", 20.5, 14.5, -Math.PI / 2, -0.15],
  ["harbor-boat", 30, 15.5, Math.PI, -0.5],
  ["lighthouse-front", 11, -12, 0, 0.38],
  ["lighthouse-door", 13.8, -16.5, 0.6, 0.15],
  ["lighthouse-west", 4.2, -21, -Math.PI / 2, 0.75],
  ["lighthouse-rear", 11, -26, Math.PI, 0.8],
  ["workshop-gable", -6, 10, 0, 0.28],
  ["workshop-ceiling", -6, -1, 0, 0.9],
];
const report = [];
try {
  for (const [name, x, z, yaw, pitch] of views) {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 900 },
      reducedMotion: "reduce",
    });
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
    await page.goto(url);
    await page
      .getByRole("button", { name: "Continue", exact: true })
      .click({ timeout: 60000 });
    await page
      .getByRole("button", { name: "Pause game", exact: true })
      .waitFor();
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await page.screenshot({ path: `${directory}/${name}.png` });
    await page.keyboard.press("Tab");
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("signal.lighthouse.player.v1")),
    );
    if (Math.hypot(saved.x - x, saved.z - z) > 0.01)
      throw new Error(`Review position ${name} is obstructed`);
    report.push({ name, requested: { x, z, yaw, pitch }, saved });
    if (name === "harbor-sign-front") {
      await page.getByRole("button", { name: /^Island map/ }).click();
      await page.screenshot({ path: `${directory}/survey-map.png` });
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      await page.screenshot({ path: `${directory}/field-settings.png` });
    }
    await page.close();
    console.log(`Reviewed ${name}`);
  }
  const result = {
    date: new Date().toISOString(),
    url,
    viewport: "1600 × 900",
    views: report,
    errors,
  };
  await writeFile(
    process.env.SIGNAL_REVIEW_OUTPUT
      ? `${directory}/island-review.json`
      : "docs/island-review.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  if (errors.length) {
    console.error(errors);
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
