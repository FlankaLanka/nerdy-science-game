import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import { CHAMBERS } from "../src/chambers.ts";
import { SAVE_KEY, serializeCampaign } from "../src/chamberCampaign.ts";
import { PLAYER_KEY } from "../src/scene/navigation.ts";
import { chamberFixture } from "../tests/chamber-fixtures.ts";

const output = "artifacts/station";
const orbitOnly = process.argv.includes("--orbit");
const recording = orbitOnly ? "title-orbit" : "immersion";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  args: process.platform === "darwin" ? ["--use-angle=metal"] : [],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "no-preference",
  recordVideo: { dir: output, size: { width: 1440, height: 900 } },
});
const page = await context.newPage(),
  video = page.video(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
});
try {
  const c = CHAMBERS[3];
  await page.addInitScript(
    ({ key, state, playerKey, pose }) => {
      localStorage.setItem(key, state);
      localStorage.setItem(playerKey, JSON.stringify(pose));
    },
    {
      key: SAVE_KEY,
      state: serializeCampaign(chamberFixture(3)),
      playerKey: PLAYER_KEY,
      pose: { x: c.bench.x, z: c.bench.z + 2.5, yaw: 0, pitch: 0 },
    },
  );
  await page.goto(process.env.REVIEW_URL ?? "http://localhost:5176");
  const start = page.getByRole("button", { name: /^(Begin|Continue)$/ });
  await start.waitFor();
  if (orbitOnly) {
    await page.mouse.move(720, 450);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${output}/title.png` });
    await page.waitForTimeout(58000);
  } else {
    await page.mouse.move(1100, 280, { steps: 28 });
    await page.waitForTimeout(1500);
    await page.mouse.move(370, 540, { steps: 35 });
    await start.hover();
    await page.waitForTimeout(800);
    await start.click();
    await page.waitForTimeout(1100);
    await page.keyboard.press("n");
    await page.waitForTimeout(100);
    await page.screenshot({ path: `${output}/tablet-raising.png` });
    await page.waitForTimeout(700);
    await page.getByRole("button", { name: "Map", exact: true }).click();
    await page.waitForTimeout(1100);
    await page.getByRole("button", { name: "Formulas", exact: true }).click();
    await page.waitForTimeout(900);
    await page.getByRole("button", { name: "Parts", exact: true }).click();
    await page.waitForTimeout(700);
    await page
      .getByRole("button", { name: "Power off notebook", exact: true })
      .hover();
    await page.waitForTimeout(450);
    await page
      .getByRole("button", { name: "Power off notebook", exact: true })
      .click();
    await page.waitForTimeout(800);
    await page.keyboard.press("n");
    await page.waitForTimeout(900);
    await page.keyboard.press("n");
    await page.waitForTimeout(800);
  }
  if (errors.length) throw new Error(errors.join("\n"));
} finally {
  await context.close();
  await fs.rename(await video.path(), `${output}/${recording}.webm`);
  await browser.close();
}
process.stdout.write(
  `Motion review: ${output}/${recording}.webm; ${errors.length} errors\n`,
);
