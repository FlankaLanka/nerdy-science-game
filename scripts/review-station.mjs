import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import { CHAMBERS } from "../src/chambers.ts";
import { SAVE_KEY, serializeCampaign } from "../src/chamberCampaign.ts";
import { chamberFixture, solvedCircuit } from "../tests/chamber-fixtures.ts";
import { PLAYER_KEY } from "../src/scene/navigation.ts";
const output = "artifacts/station",
  selected = new Set(process.argv.slice(2));
await fs.mkdir(output, { recursive: true });
const shots = [
  { name: "title", index: 0, title: true },
  {
    name: "title-phone",
    index: 0,
    title: true,
    viewport: { width: 390, height: 844 },
    touch: true,
  },
  {
    name: "title-wide",
    index: 0,
    title: true,
    viewport: { width: 2560, height: 1080 },
  },
  {
    name: "title-landscape",
    index: 0,
    title: true,
    viewport: { width: 844, height: 390 },
    touch: true,
  },
  { name: "wake-dark", index: 0, pose: { x: -10, z: 23, yaw: 0, pitch: 0 } },
  { name: "power-link-off", index: 0, pose: { x: -7.2, z: 22.4, yaw: 0.37, pitch: -0.1 } },
  { name: "power-link-on", index: 0, completed: 1, pose: { x: -7.2, z: 22.4, yaw: 0.37, pitch: -0.1 } },
  { name: "power-flow", index: 0, completed: 1, motion: true, pose: { x: -7.2, z: 22.4, yaw: 0.37, pitch: -0.1 } },
  { name: "power-door-off", index: 0, pose: { x: -10, z: 16.3, yaw: 0, pitch: 0 } },
  { name: "power-door-on", index: 0, completed: 1, pose: { x: -10, z: 16.3, yaw: 0, pitch: 0 } },
  { name: "power-transfer", index: 2, pose: { x: -7.2, z: -5.7, yaw: -0.85, pitch: -0.1 } },
  { name: "power-return", index: 3, pose: { x: 13, z: -11.5, yaw: 2.75, pitch: -0.1 } },
  {
    name: "wake-powered",
    index: 0,
    completed: 1,
    pose: { x: -10, z: 23, yaw: 0, pitch: 0 },
  },
  { name: "first-circuit", index: 0, kit: true },
  { name: "circuit-restored", index: 0, completed: 1, kit: true },
  { name: "circuit-flow", index: 0, completed: 1, kit: true, motion: true },
  { name: "contact-selected", index: 1, completed: 2, kit: true, select: "Select Battery" },
  { name: "resistor-selected", index: 3, completed: 4, kit: true, select: "Select Resistor" },
  { name: "resistor-selected-phone", index: 3, completed: 4, kit: true, select: "Select Resistor", viewport: { width: 390, height: 844 }, touch: true },
  { name: "resistor-selected-small", index: 3, completed: 4, kit: true, select: "Select Resistor", viewport: { width: 320, height: 568 }, touch: true },
  { name: "resistor-selected-landscape", index: 3, completed: 4, kit: true, select: "Select Resistor", viewport: { width: 844, height: 390 }, touch: true },
  { name: "assembly-tray", index: 2, kit: true },
  { name: "assembly-phone", index: 2, kit: true, viewport: { width: 390, height: 844 }, touch: true },
  { name: "assembly-small", index: 2, kit: true, viewport: { width: 320, height: 568 }, touch: true },
  { name: "assembly-landscape", index: 2, kit: true, viewport: { width: 844, height: 390 }, touch: true },
  { name: "resistance", index: 3, kit: true, example: true },
  { name: "independent-branches", index: 5, completed: 6, kit: true },
  { name: "parts", index: 3, book: "Parts" },
  { name: "pause", index: 3, pause: true },
  { name: "pause-options", index: 3, pause: "Options" },
  { name: "pause-restart", index: 3, pause: "New run" },
  { name: "pause-phone", index: 3, pause: true, viewport: { width: 320, height: 568 }, touch: true },
  { name: "pause-landscape", index: 3, pause: true, viewport: { width: 844, height: 390 }, touch: true },
  {
    name: "parts-phone",
    index: 3,
    book: "Parts",
    viewport: { width: 390, height: 844 },
    touch: true,
  },
  {
    name: "map-compact",
    index: 3,
    book: "Map",
    viewport: { width: 320, height: 568 },
    touch: true,
  },
  {
    name: "parts-landscape",
    index: 3,
    book: "Parts",
    viewport: { width: 844, height: 390 },
    touch: true,
  },
  { name: "formulas", index: 5, book: "Formulas" },
  { name: "map", index: 3, book: "Map" },
  {
    name: "earth-window",
    index: 5,
    completed: 6,
    pose: { x: 6.5, z: 31, yaw: 1.73, pitch: 0.08 },
  },
  {
    name: "saturn-window",
    index: 5,
    completed: 6,
    pose: { x: 13.5, z: 31, yaw: -1.29, pitch: 0.13 },
  },
  {
    name: "ohm-poster",
    index: 3,
    pose: { x: 12.4, z: -4.15, yaw: -Math.PI / 2, pitch: 0.08 },
  },
];
const browser = await chromium.launch({
  args: process.platform === "darwin" ? ["--use-angle=metal"] : [],
});
const results = selected.size
  ? JSON.parse(
      await fs.readFile(`${output}/review.json`, "utf8").catch(() => "[]"),
    ).filter((r) => !selected.has(r.name))
  : [];
try {
  for (const shot of shots) {
    if (selected.size && !selected.has(shot.name)) continue;
    const c = CHAMBERS[shot.index],
      state = chamberFixture(shot.completed ?? shot.index);
    if (shot.example) state.rooms[shot.index] = solvedCircuit(shot.index);
    const page = await browser.newPage({
        viewport: shot.viewport ?? { width: 1440, height: 900 },
        isMobile: shot.touch ?? false,
        hasTouch: shot.touch ?? false,
        reducedMotion: shot.motion ? "no-preference" : "reduce",
      }),
      errors = [];
    page.setDefaultTimeout(90000);
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    });
    await page.addInitScript(
      ({ saveKey, saved, playerKey, pose }) => {
        localStorage.setItem(saveKey, saved);
        localStorage.setItem(playerKey, JSON.stringify(pose));
      },
      {
        saveKey: SAVE_KEY,
        saved: serializeCampaign(state),
        playerKey: PLAYER_KEY,
        pose: shot.pose ?? {
          x: c.bench.x,
          z: c.bench.z + 2.5,
          yaw: 0,
          pitch: 0,
        },
      },
    );
    await page.goto(process.env.REVIEW_URL ?? "http://localhost:5176");
    await page.getByRole("button", { name: /^(Begin|Continue)$/ }).waitFor();
    if (!shot.title) {
      await page.getByRole("button", { name: /^(Begin|Continue)$/ }).click();
      await page.locator('.world canvas[data-camera-mode="walk"]').waitFor();
      await page.locator(".room-marker").waitFor();
    }
    if (shot.kit) {
      await page.getByRole("button", { name: "Use circuit bench" }).waitFor();
      await page.keyboard.press("e");
      await page.locator('.kit-board[data-ready="true"]').waitFor();
      if (shot.select) await page.getByRole("button", { name: shot.select, exact: true }).click();
    }
    if (shot.book) {
      await page.keyboard.press("n");
      await page.getByRole("button", { name: shot.book, exact: true }).click();
    }
    if (shot.pause) {
      await page.keyboard.press("Escape");
      if (typeof shot.pause === "string")
        await page.getByRole("button", { name: shot.pause, exact: true }).click();
    }
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${output}/${shot.name}.png` });
    results.push({ name: shot.name, errors });
    process.stdout.write(`${shot.name}: ${errors.length} errors\n`);
    await page.close();
  }
  await fs.writeFile(
    `${output}/review.json`,
    JSON.stringify(results, null, 2) + "\n",
  );
} finally {
  await browser.close();
}
