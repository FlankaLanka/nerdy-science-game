import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const browser = await chromium.launch({
  args: process.platform === "darwin" ? ["--use-angle=metal"] : [],
});
const page = await browser.newPage({
  viewport: { width: 1600, height: 900 },
  reducedMotion: "no-preference",
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error" && !m.text().includes("pointer lock"))
    errors.push(m.text());
});
try {
  await page.goto(process.env.SIGNAL_REVIEW_URL || "http://127.0.0.1:5174");
  await page
    .getByRole("button", { name: "Enter the island", exact: true })
    .waitFor({ timeout: 60000 });
  await page.screenshot({ path: "docs/screenshots/fps-title.png" });
  await page
    .getByRole("button", { name: "Enter the island", exact: true })
    .click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "docs/screenshots/fps-world.png" });
  const timing = await page.evaluate(async () => {
    const samples = [];
    let previous = performance.now();
    await new Promise((resolve) => {
      function frame(now) {
        samples.push(now - previous);
        previous = now;
        if (samples.length >= 150) resolve();
        else requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
    const sorted = samples.slice(10).sort((a, b) => a - b);
    return {
      medianFrameMs: sorted[Math.floor(sorted.length * 0.5)],
      p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
    };
  });
  await page.keyboard.down("w");
  await page
    .getByRole("button", { name: "Repair Keeper’s workshop", exact: true })
    .waitFor();
  await page.keyboard.up("w");
  await page.screenshot({ path: "docs/screenshots/fps-interact.png" });
  await page.keyboard.press("e");
  await page.locator(".circuit-board.with-depth").waitFor({ timeout: 30000 });
  await page.screenshot({ path: "docs/screenshots/fps-circuit.png" });
  const report = {
    date: new Date().toISOString(),
    viewport: "1600 × 900 (16:9)",
    renderer: "Playwright Chromium with platform GPU",
    sample:
      "150 requestAnimationFrame callbacks during first-person play; local diagnostic, not a device benchmark",
    ...timing,
    errors,
  };
  await writeFile(
    "docs/render-check.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
  if (errors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
