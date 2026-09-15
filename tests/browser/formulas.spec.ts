import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { CHAMBERS, FORMULAS } from "../../src/chambers.ts";
import { SAVE_KEY, serializeCampaign } from "../../src/chamberCampaign.ts";
import { PLAYER_KEY } from "../../src/scene/navigation.ts";
import { formulaScreen } from "../../src/scene/formulaView.ts";
import { chamberFixture } from "../chamber-fixtures.ts";
import { position, saved } from "./helpers";

async function approach(page: Page, index: number, godMode = false) {
  const screen = formulaScreen(CHAMBERS[index]);
  await page.goto("/tests/browser/fixture.html");
  await page.evaluate(({ key, state, playerKey, pose, godMode }) => {
    localStorage.setItem(key, state);
    localStorage.setItem(playerKey, JSON.stringify(pose));
    if (godMode) sessionStorage.setItem("signal.asterion.god-mode", "on");
  }, { key: SAVE_KEY, state: serializeCampaign(chamberFixture(godMode ? 0 : index)), playerKey: PLAYER_KEY,
    pose: { x: screen.x - 2.5, z: screen.z, yaw: -Math.PI / 2, pitch: 0.1 }, godMode });
  await page.goto("/");
  await page.getByRole("button", { name: /^(Begin|Continue)$/ }).click();
  await expect(page.getByRole("button", { name: "Inspect formula screen" })).toBeVisible();
}

test("E travels to the screen, registers on arrival, and returns without moving the player", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await approach(page, 3);
  const before = await position(page);
  const canvas = page.locator(".world canvas");
  await page.keyboard.press("n");
  await page.getByRole("button", { name: "Formulas", exact: true }).click();
  await expect(page.getByText("Inspect formula screens to add notes.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.keyboard.press("e");
  await expect(canvas).toHaveAttribute("data-camera-mode", "transition");
  expect((await saved(page)).formulas).toEqual([]);
  await page.keyboard.down("w");
  await expect(canvas).toHaveAttribute("data-camera-mode", "formula");
  await page.keyboard.up("w");
  await expect.poll(async () => (await saved(page)).formulas).toEqual(["ohm"]);
  await expect(page.getByRole("status").filter({ hasText: "New formula added!" })).toBeVisible();
  await page.screenshot({ path: "artifacts/formula-desktop.png" });
  await page.keyboard.press("n");
  await expect(page.getByRole("heading", { name: "Ohm's law", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(canvas).toHaveAttribute("data-camera-mode", "walk");
  expect(await position(page)).toEqual(before);
  await expect(canvas).toBeFocused();
  await page.keyboard.press("e");
  await expect(canvas).toHaveAttribute("data-camera-mode", "formula");
  await expect(page.getByText("New formula added!", { exact: true })).toHaveCount(0);
  await page.keyboard.press("e");
  await expect(canvas).toHaveAttribute("data-camera-mode", "walk");
  await page.reload();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.keyboard.press("n");
  await page.getByRole("button", { name: "Formulas", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ohm's law", exact: true })).toBeVisible();
});

test("backing out during travel does not collect a formula or trap movement", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await approach(page, 4);
  const canvas = page.locator(".world canvas");
  await page.keyboard.press("e");
  await expect(canvas).toHaveAttribute("data-camera-mode", "transition");
  await page.keyboard.press("Escape");
  await expect(canvas).toHaveAttribute("data-camera-mode", "walk");
  expect((await saved(page)).formulas).toEqual([]);
  await expect(page.getByText("New formula added!", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Inspect formula screen" })).toBeVisible();
  await page.keyboard.press("e");
  await expect(canvas).toHaveAttribute("data-camera-mode", "formula");
  await expect.poll(async () => (await saved(page)).formulas).toEqual(["series"]);
});

for (const [index, width, height] of [[3, 320, 568], [4, 390, 844], [5, 844, 390]]) {
  test(`screen ${index + 1} supports touch and reduced motion at ${width} × ${height}`, async ({ browser, baseURL }) => {
    const page = await browser.newPage({ baseURL, viewport: { width, height }, hasTouch: true, reducedMotion: "reduce" });
    try {
      await approach(page, index);
      await page.getByRole("button", { name: "Inspect formula screen" }).tap();
      await expect(page.locator(".world canvas")).toHaveAttribute("data-camera-mode", "formula");
      const formula = CHAMBERS[index].formula!;
      await expect.poll(async () => (await saved(page)).formulas).toEqual([formula]);
      await expect(page.getByText("New formula added!", { exact: true })).toBeVisible();
      const explanation = page.getByRole("region", { name: `${FORMULAS[formula].name} explanation` });
      await expect(explanation).toBeVisible();
      expect(await explanation.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      await page.screenshot({ path: `artifacts/formula-${width}x${height}.png` });
      const box = (await explanation.boundingBox())!;
      const touch = await page.context().newCDPSession(page);
      const x = box.x + box.width / 2, startY = box.y + box.height * 0.8;
      await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: startY }] });
      for (let step = 1; step <= 6; step++) {
        await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: startY - box.height * 0.6 * step / 6 }] });
      }
      await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await touch.detach();
      await expect.poll(() => explanation.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
      await page.getByRole("button", { name: "Open notebook", exact: true }).tap();
      await expect(page.getByRole("heading", { name: FORMULAS[formula].name, exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Close notebook" }).tap();
      await page.getByRole("button", { name: "Leave formula screen" }).tap();
      await expect(page.locator(".world canvas")).toHaveAttribute("data-camera-mode", "walk");
    } finally {
      await page.close();
    }
  });
}

test("god mode still requires inspecting the poster and does not complete lessons", async ({ page }) => {
  await approach(page, 5, true);
  expect((await saved(page)).formulas).toEqual([]);
  expect((await saved(page)).visited).toEqual(["branch"]);
  await page.keyboard.press("e");
  await expect.poll(async () => (await saved(page)).formulas).toEqual(["parallel"]);
  expect((await saved(page)).proofs.every((p: unknown) => p === null)).toBe(true);
  expect((await saved(page)).visited).toEqual(["branch"]);
});

test("the wall explanation scrolls with mouse and keyboard and keeps its place through the notebook", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await approach(page, 3);
  await page.keyboard.press("e");
  const explanation = page.getByRole("region", { name: "Ohm's law explanation" });
  await expect(explanation).toBeFocused();
  await expect(explanation.getByText("Voltage equals current times resistance.", { exact: true })).toBeVisible();
  await expect(explanation.getByRole("heading", { name: "What it means", exact: true })).toBeVisible();
  await explanation.hover();
  await page.mouse.wheel(0, 250);
  await expect.poll(() => explanation.evaluate(el => el.scrollTop)).toBeGreaterThan(100);
  await page.keyboard.press("End");
  await expect.poll(() => explanation.evaluate(el => el.scrollHeight - el.clientHeight - el.scrollTop)).toBeLessThan(4);
  await expect(page.getByText("Scroll to read", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: "artifacts/formula-explanation-scrolled.png" });
  const scrollTop = await explanation.evaluate(el => el.scrollTop);
  await page.keyboard.press("n");
  await expect(page.getByRole("dialog", { name: "Notebook" })).toBeVisible();
  await expect(explanation).not.toBeVisible();
  await page.keyboard.press("Escape");
  await expect(explanation).toBeFocused();
  expect(await explanation.evaluate(el => el.scrollTop)).toBe(scrollTop);
  await page.keyboard.press("Home");
  await expect.poll(() => explanation.evaluate(el => el.scrollTop)).toBe(0);
  await expect(page.getByText("Scroll to read", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 900, height: 600 });
  await expect(async () => {
    const panel = (await page.locator(".formula-reader").boundingBox())!;
    expect(panel.x).toBeGreaterThan(0);
    expect(panel.y).toBeGreaterThan(0);
    expect(panel.x + panel.width).toBeLessThan(900);
    expect(panel.y + panel.height).toBeLessThan(600);
  }).toPass({ timeout: 5000 });
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.locator(".world canvas")).toHaveAttribute("data-camera-mode", "walk");
  await expect(explanation).toHaveCount(0);
  expect(errors).toEqual([]);
});
