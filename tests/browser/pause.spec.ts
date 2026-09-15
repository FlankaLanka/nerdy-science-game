import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { begin, position, saved } from "./helpers";

test("pause supports keyboard navigation, nested settings, and returning to play", async ({ page }) => {
  await begin(page);
  await page.keyboard.press("Escape");
  const dialog = page.getByRole("dialog", { name: "Pause", exact: true });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeFocused();
  const before = await position(page);
  await page.keyboard.down("w");
  await page.waitForTimeout(250);
  await page.keyboard.up("w");
  expect(await position(page)).toEqual(before);

  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Sound", exact: true })).toBeFocused();
  const sound = (await saved(page)).sound;
  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => (await saved(page)).sound).toBe(!sound);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await saved(page)).reducedMotion).toBe(true);
  await page.getByRole("button", { name: "Reduced motion", exact: true }).hover();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Options", exact: true })).toBeFocused();
  await expect(dialog).toBeVisible();
  // A parked mouse must not conceal a new keyboard selection.
  await page.getByRole("button", { name: "Resume", exact: true }).hover();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("button", { name: "Notebook", exact: true })).toBeFocused();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);

  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Notebook" })).toBeVisible();
  await expect(page.getByText("Field notes · Personal terminal")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".world canvas")).toBeFocused();
});

test("starting a new run requires confirmation and Escape preserves progress", async ({ page }) => {
  await begin(page, 1);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "New run", exact: true }).click();
  await expect(page.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "New run", exact: true })).toBeFocused();
  expect((await saved(page)).proofs[0]).not.toBeNull();
  await page.getByRole("button", { name: "New run", exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect((await saved(page)).proofs[0]).not.toBeNull();
  await page.getByRole("button", { name: "New run", exact: true }).click();
  await page.getByRole("button", { name: "Start new run", exact: true }).click();
  await expect(page.getByRole("button", { name: "Begin", exact: true })).toBeVisible();
  expect((await saved(page)).proofs.every((proof: unknown) => proof === null)).toBe(true);
});
