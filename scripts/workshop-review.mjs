import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { initialState, reducer } from "../src/game.ts";

const url = process.env.SIGNAL_REVIEW_URL || "http://127.0.0.1:5174";
const browser = await chromium.launch({
  args: process.platform === "darwin" ? ["--use-angle=metal"] : [],
});
const errors = [];
const options = {
  viewport: { width: 1280, height: 720 },
  reducedMotion: "reduce",
};
function watch(page) {
  page.on("pageerror", (error) => errors.push(error.message));
}
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

try {
  // Use an isolated page and the same keyboard-to-locator timings as the baseline.
  const page = await browser.newPage(options);
  watch(page);
  await page.addInitScript(() => {
    localStorage.setItem(
      "signal.lighthouse.player.v1",
      JSON.stringify({ x: -3, z: 5.6, yaw: 0, pitch: 0 }),
    );
    window.uiReview = { longTasks: [], states: [] };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        window.uiReview.longTasks.push({
          start: entry.startTime,
          duration: entry.duration,
        });
    }).observe({ type: "longtask", buffered: true });
    let previous = "";
    new MutationObserver(() => {
      const board = document.querySelector("dialog[open] .circuit-board");
      const state = board?.className || "closed";
      if (state !== previous)
        window.uiReview.states.push({ state, time: performance.now() });
      previous = state;
    }).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "open"],
    });
  });
  await page.goto(url);
  await page
    .getByRole("button", { name: "Enter the island", exact: true })
    .click({ timeout: 60000 });
  const openingStart = await page.evaluate(() => performance.now());
  const timings = [];
  for (let i = 0; i < 3; i++) {
    const start = Date.now();
    await page.keyboard.press("e");
    await page
      .getByRole("dialog", { name: "Keeper’s workshop circuit", exact: true })
      .waitFor();
    const dialogMs = Date.now() - start;
    await page.locator(".circuit-board.with-depth").waitFor();
    timings.push({ open: i + 1, dialogMs, detailedMs: Date.now() - start });
    if (i === 0)
      await page.screenshot({ path: "docs/screenshots/workshop-circuit.png" });
    await page.keyboard.press("Escape");
  }
  const result = await page.evaluate(
    (start) => ({
      ...window.uiReview,
      openingLongTasks: window.uiReview.longTasks.filter(
        (task) => task.start >= start,
      ),
      marks: performance
        .getEntriesByType("mark")
        .filter((entry) => /signal-kit-(build|ready)/.test(entry.name))
        .map((entry) => ({ name: entry.name, start: entry.startTime })),
      openingArtRequests: performance
        .getEntriesByType("resource")
        .filter(
          (entry) => entry.startTime >= start && /\/art\//.test(entry.name),
        )
        .map((entry) => entry.name.split("/").pop()),
    }),
    openingStart,
  );
  await page.close();
  console.log(
    JSON.stringify({
      timings,
      marks: result.marks,
      openingLongTasks: result.openingLongTasks,
      openingArtRequests: result.openingArtRequests,
    }),
  );

  const views = [
    ["front", -6, 10, 0, 0.22],
    ["rear", -6, -10, Math.PI, 0.22],
    ["west", -15, -1, -Math.PI / 2, 0.2],
    ["east", 3, -1, Math.PI / 2, 0.2],
    ["interior-door", -4, -1, -3.6, 0.22],
    ["interior-roof", -6, -1, 0, 0.9],
    ["interior-rear", -4, 0, 0.4, -0.15],
  ];
  for (const [name, x, z, yaw, pitch] of views) {
    const view = await browser.newPage(options);
    watch(view);
    await view.addInitScript(
      ({ state, player }) => {
        localStorage.setItem("signal.lighthouse.v1", JSON.stringify(state));
        localStorage.setItem(
          "signal.lighthouse.player.v1",
          JSON.stringify(player),
        );
      },
      { state, player: { x, z, yaw, pitch } },
    );
    await view.goto(url);
    await view
      .getByRole("button", { name: "Continue", exact: true })
      .click({ timeout: 60000 });
    await view
      .getByRole("button", { name: "Pause game", exact: true })
      .waitFor();
    await view.screenshot({ path: `docs/screenshots/workshop-${name}.png` });
    await view.close();
    console.log(`Reviewed workshop ${name}`);
  }
  const report = {
    date: new Date().toISOString(),
    viewport: "1280 × 720",
    renderer: "Playwright Chromium with platform GPU; reduced motion",
    method:
      "Three consecutive keyboard openings on a local development server. Times include automation overhead and are a local diagnostic, not a device benchmark.",
    timings,
    ...result,
    views: views.map(([name]) => name),
    errors,
  };
  await writeFile(
    "docs/workshop-review.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  if (errors.length) {
    console.error(errors);
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
