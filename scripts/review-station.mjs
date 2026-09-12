import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import { initialState, SAVE_KEY } from "../src/campaign.ts";
import { campaignFixtures } from "../tests/fixtures.ts";
import { PLAYER_KEY } from "../src/scene/navigation.ts";
const { snapshots, complete } = campaignFixtures();
const output = "artifacts/station";
const selected = new Set(process.argv.slice(2));
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  args: process.platform === "darwin" ? ["--use-angle=metal"] : [],
});
const results = selected.size
  ? JSON.parse(
      await fs.readFile(`${output}/review.json`, "utf8").catch(() => "[]"),
    ).filter((r) => !selected.has(r.name))
  : [];
for (const shot of [
  { name: "title", pose: { x: -3, z: 24, yaw: 0, pitch: 0 }, title: true },
  { name: "engineering", pose: { x: -2, z: 24, yaw: 0, pitch: 0 } },
  {
    name: "door-closed",
    pose: { x: 0.65, z: 15.4, yaw: 0.17, pitch: 0.18 },
  },
  {
    name: "door-open",
    pose: { x: 0.65, z: 15.4, yaw: 0.17, pitch: 0.18 },
    state: snapshots.workshop,
  },
  {
    name: "doorway-materials",
    pose: { x: -4.5, z: 10.5, yaw: 1.45, pitch: 0.12 },
    state: snapshots.workshop,
  },
  {
    name: "window-engineering",
    pose: { x: -3.8, z: 22, yaw: 1.12, pitch: 0.12 },
  },
  {
    name: "window-materials",
    pose: { x: -15.5, z: 11, yaw: 1.12, pitch: 0.12 },
    state: snapshots.workshop,
  },
  {
    name: "window-distribution",
    pose: { x: 15.5, z: 13.5, yaw: -1.35, pitch: 0.1 },
    state: snapshots.harbor,
  },
  {
    name: "window-engineering-starboard",
    pose: { x: 3.8, z: 22, yaw: -1.2, pitch: 0.12 },
  },
  {
    name: "window-life-support",
    pose: { x: -14, z: -8, yaw: 0, pitch: 0.08 },
    state: snapshots.power,
  },
  {
    name: "window-reserve",
    pose: { x: 14, z: -8, yaw: 0, pitch: 0.08 },
    state: snapshots.storage,
  },
  {
    name: "window-command",
    pose: { x: 0, z: -20.5, yaw: 0, pitch: 0.07 },
    state: complete,
  },
  {
    name: "window-command-port",
    pose: { x: -4, z: -15.7, yaw: 1.35, pitch: 0.1 },
    state: complete,
  },
  {
    name: "window-command-starboard",
    pose: { x: 4, z: -15.7, yaw: -1.35, pitch: 0.1 },
    state: complete,
  },
  {
    name: "wiring-instruments",
    pose: { x: -3, z: 22.5, yaw: 0, pitch: 0 },
    panel: true,
  },
  {
    name: "hub",
    pose: { x: 0, z: 10, yaw: 0.13, pitch: 0.04 },
    state: snapshots.workshop,
  },
  {
    name: "materials",
    pose: { x: -13, z: 16, yaw: 0.22, pitch: 0.02 },
    state: snapshots.workshop,
  },
  {
    name: "life-support",
    pose: { x: -12, z: -1, yaw: 0.5, pitch: 0.01 },
    state: snapshots.power,
  },
  {
    name: "reserve",
    pose: { x: 12, z: -1, yaw: -0.3, pitch: 0 },
    state: snapshots.storage,
  },
  {
    name: "command",
    pose: { x: 0, z: -14, yaw: 0, pitch: 0.02 },
    state: complete,
  },
  {
    name: "ohm-instruments",
    pose: { x: -15, z: 15.2, yaw: 0, pitch: 0 },
    state: snapshots.workshop,
    panel: true,
  },
  {
    name: "rc-instruments",
    pose: { x: 0, z: -4.7, yaw: 0, pitch: 0 },
    state: snapshots.storage,
    panel: true,
  },
  {
    name: "power-instruments",
    pose: { x: -15, z: -3.7, yaw: 0, pitch: 0 },
    state: snapshots.harbor,
    panel: true,
  },
  {
    name: "junction-instruments",
    pose: { x: 4, z: 6.3, yaw: 0, pitch: 0 },
    state: snapshots.harbor,
    panel: true,
  },
  {
    name: "storage-instruments",
    pose: { x: 14, z: -3.7, yaw: 0, pitch: 0 },
    state: snapshots.junction,
    panel: true,
  },
  {
    name: "map",
    pose: { x: 0, z: 10, yaw: 0, pitch: 0 },
    state: snapshots.workshop,
    map: true,
  },
]) {
  if (selected.size && !selected.has(shot.name)) continue;
  const page = await browser.newPage({
    viewport: { width: 1600, height: 900 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  await page.addInitScript(
    ({ key, playerKey, state, pose }) => {
      localStorage.setItem(key, JSON.stringify(state));
      localStorage.setItem(playerKey, JSON.stringify(pose));
    },
    {
      key: SAVE_KEY,
      playerKey: PLAYER_KEY,
      state: shot.state ?? initialState(),
      pose: shot.pose,
    },
  );
  await page.goto(process.env.REVIEW_URL ?? "http://localhost:5176");
  await page
    .getByRole("button", {
      name: /Board the Asterion|Continue|Play circuit puzzles/i,
    })
    .first()
    .waitFor({ timeout: 30000 });
  await page.waitForTimeout(1800);
  if (!shot.title) {
    await page
      .getByRole("button", {
        name: /Board the Asterion|Continue|Play circuit puzzles/i,
      })
      .first()
      .click();
    await page.waitForTimeout(700);
    if (shot.panel) await page.keyboard.press("e");
    if (shot.map) await page.keyboard.press("m");
    await page.waitForTimeout(800);
    const click = (name) =>
      page.getByRole("button", { name, exact: true }).click();
    if (shot.name === "wiring-instruments") {
      await click("Lamp A right");
      await click("Bridge left");
      await click("Copper");
      await click("Test circuit");
    }
    if (shot.name === "ohm-instruments") {
      await click("Nichrome");
      await click("Test & record");
      await click("3 V");
      await click("Test & record");
      await click("6 V");
      await click("Test & record");
    }
    if (shot.name === "rc-instruments") {
      await click("40 mF");
      await click("Advance to 5τ");
      await click("Run 2 s outage test");
      await page
        .getByRole("button", { name: "Commission system", exact: true })
        .waitFor();
    }
    if (shot.name === "power-instruments") {
      await click("5 Ω");
      await click("Test & record");
    }
    if (shot.name === "junction-instruments") {
      await click("Test & record");
      await click("A isolated");
      await click("Test & record");
    }
    if (shot.name === "storage-instruments") {
      await click("Test & record");
      await click("Parallel");
      await click("Test & record");
    }
  }
  await page.screenshot({ path: `${output}/${shot.name}.png` });
  let timing = null;
  if (shot.name === "hub" || shot.name === "window-command-port") {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);
    const sample = () =>
      page.evaluate(
        () =>
          new Promise((resolve) => {
            const dt = [];
            let last;
            const step = (t) => {
              if (last) dt.push(t - last);
              last = t;
              if (dt.length < 120) requestAnimationFrame(step);
              else {
                dt.sort((a, b) => a - b);
                resolve({
                  median: dt[60],
                  p90: dt[108],
                  mean: dt.reduce((a, b) => a + b, 0) / dt.length,
                });
              }
            };
            requestAnimationFrame(step);
          }),
      );
    const stationary = await sample();
    await page.keyboard.down("d");
    const moving = await sample();
    await page.keyboard.up("d");
    timing = { viewport: "1280×720", stationary, moving };
  }
  results.push({ name: shot.name, errors, timing });
  await page.close();
}
await browser.close();
await fs.writeFile(`${output}/review.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
if (results.some((r) => r.errors.length)) process.exitCode = 1;
