import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const server = spawn(process.execPath, ["server/index.mjs"], {
  env: { ...process.env, PORT: "5176", OPENROUTER_API_KEY: "" },
  stdio: "ignore",
});
let browser;
try {
  let available = false;
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch("http://127.0.0.1:5176")).ok) {
        available = true;
        break;
      }
    } catch {
      /* Wait for the owned server to bind. */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(available && server.exitCode === null, "production server ready");
  browser = await chromium.launch({
    args: process.platform === "darwin" ? ["--use-angle=metal"] : [],
  });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [],
    badAssets = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400 && /\/(art|assets)\//.test(response.url()))
      badAssets.push({ url: response.url(), status: response.status() });
  });
  await page.goto("http://127.0.0.1:5176");
  await page
    .getByRole("button", { name: "Enter the island", exact: true })
    .waitFor({ timeout: 60000 });
  await page.screenshot({ path: "docs/screenshots/survey-title.png" });
  await page
    .getByRole("button", { name: "Enter the island", exact: true })
    .click();
  const mapStart = await page.evaluate(() => performance.now());
  await page.keyboard.press("m");
  await page.getByRole("dialog", { name: "Island map", exact: true }).waitFor();
  const mapOpenMs = await page.evaluate(
    (start) => performance.now() - start,
    mapStart,
  );
  const mapAxe = await new AxeBuilder({ page })
    .include("dialog[open]")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  const fonts = await page.evaluate(() => ({
    status: document.fonts.status,
    heading: getComputedStyle(document.querySelector(".map-heading h2"))
      .fontFamily,
    notes: getComputedStyle(document.querySelector(".map-heading p"))
      .fontFamily,
  }));
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const settingsAxe = await new AxeBuilder({ page })
    .include("dialog[open]")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.keyboard.down("w");
  await page
    .getByRole("button", { name: "Repair Keeper’s workshop", exact: true })
    .waitFor();
  await page.keyboard.up("w");
  const circuitOpenings = [];
  for (let i = 0; i < 3; i++) {
    const start = await page.evaluate(() => performance.now());
    await page.keyboard.press("e");
    await page.locator("dialog[open] .circuit-board.with-depth").waitFor();
    const entry = await page.evaluate(
      ({ start, i }) => {
        const canvas = document.querySelector(".bench-scene canvas");
        if (i === 0) window.reviewCanvas = canvas;
        return {
          detailedMs: performance.now() - start,
          sameCanvas: !!canvas && canvas === window.reviewCanvas,
          artRequests: performance
            .getEntriesByType("resource")
            .filter(
              (entry) =>
                entry.startTime >= start && /\/(art|assets)\//.test(entry.name),
            )
            .map((entry) => entry.name.split("/").pop()),
        };
      },
      { start, i },
    );
    circuitOpenings.push(entry);
    await page.keyboard.press("Escape");
  }
  const archivedMapLoaded = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .some((entry) => entry.name.includes("keepers-map")),
  );
  const report = {
    date: new Date().toISOString(),
    mode: "local production build, Chromium, 1600 × 900",
    method:
      "Open timings include browser automation overhead; a local diagnostic, not a device benchmark.",
    mapOpenMs,
    fonts,
    circuitOpenings,
    archivedMapLoaded,
    mapAccessibility: mapAxe.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.length,
    })),
    settingsAccessibility: settingsAxe.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.length,
    })),
    badAssets,
    errors,
  };
  await writeFile(
    "docs/island-production-check.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
  assert.deepEqual(errors, []);
  assert.deepEqual(badAssets, []);
  assert.deepEqual(mapAxe.violations, []);
  assert.deepEqual(settingsAxe.violations, []);
  assert.ok(
    circuitOpenings.every(
      (entry) => entry.sameCanvas && entry.artRequests.length === 0,
    ),
  );
  assert.equal(archivedMapLoaded, false);
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
