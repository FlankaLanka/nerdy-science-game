import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { begin, bench, connect, restored, saved } from "./helpers";
import { SAVE_KEY, serializeCampaign } from "../../src/chamberCampaign";
import { PLAYER_KEY } from "../../src/scene/navigation";
import { chamberFixture } from "../chamber-fixtures";

async function openProgression(page: import("@playwright/test").Page) {
  await page.keyboard.press("n");
  await page.getByRole("button", { name: "Progression", exact: true }).click();
  await expect(page.getByRole("region", { name: "Progression notes" })).toBeVisible();
}

test("progression follows earned circuit completion and ignores god mode", async ({ page }) => {
  await begin(page);
  await openProgression(page);
  const levels = page.getByRole("list", { name: "Circuit levels" });
  await expect(levels.getByRole("listitem")).toHaveCount(6);
  await expect(levels.locator(".progression-status")).toHaveText([
    "In progress", "Locked", "Locked", "Locked", "Locked", "Locked",
  ]);
  await expect(page.locator(".progression-heading")).toContainText("0 / 6 complete");
  await page.keyboard.press("Escape");
  await bench(page);
  await connect(page, "Battery negative", "Bulb contact B");
  await restored(page, 0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "God mode (dev)", exact: true }).click();
  await page.keyboard.press("Escape");
  await openProgression(page);
  await expect(levels.locator(".progression-status")).toHaveText([
    "Complete", "Ready", "Locked", "Locked", "Locked", "Locked",
  ]);
  await expect(page.locator(".progression-heading")).toContainText("1 / 6 complete");
  await expect(page.locator(".progression-labs p")).toHaveText([
    "Locked · Coming soon", "Locked · Coming soon", "Locked · Coming soon",
  ]);
  expect((await saved(page)).proofs.filter(Boolean)).toHaveLength(1);
});

test("a completed circuit wing keeps future labs locked across reloads", async ({ page }) => {
  await page.goto("/tests/browser/fixture.html");
  await page.evaluate(({ key, value, playerKey }) => {
    localStorage.setItem(key, value);
    localStorage.setItem(playerKey, JSON.stringify({ x: 10, z: 31, yaw: Math.PI, pitch: 0 }));
  }, { key: SAVE_KEY, value: serializeCampaign(chamberFixture(6)), playerKey: PLAYER_KEY });
  await page.goto("/");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  for (let pass = 0; pass < 2; pass++) {
    await openProgression(page);
    await expect(page.locator(".progression-heading")).toContainText("6 / 6 complete");
    await expect(page.locator(".progression-levels [data-state='complete']")).toHaveCount(6);
    await expect(page.locator(".progression-labs h3")).toHaveText(["Kinematics", "Electromagnetism", "Waves & optics"]);
    await expect(page.locator(".progression-count")).toHaveText(["0 / 8 levels", "0 / 10 levels", "0 / 8 levels"]);
    await expect(page.locator(".progression-labs p")).toHaveText(Array(3).fill("Locked · Coming soon"));
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
    if (pass === 0) {
      await page.reload();
      await page.getByRole("button", { name: "Continue", exact: true }).click();
    }
  }
});

test("progression fits a narrow phone and future lab rows remain reachable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await begin(page, 2);
  await openProgression(page);
  const bounds = await page.locator(".notebook-tabs button").evaluateAll((buttons) => buttons.map((button) => {
    const rect = button.getBoundingClientRect();
    return { left: rect.left, right: rect.right, fits: button.scrollWidth <= button.clientWidth };
  }));
  expect(bounds.every((b) => b.left >= 0 && b.right <= 320 && b.fits)).toBe(true);
  const notes = page.getByRole("region", { name: "Progression notes" });
  expect(await notes.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await notes.focus();
  await page.keyboard.press("End");
  await expect(page.getByRole("heading", { name: "Waves & optics", exact: true })).toBeInViewport();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
});
