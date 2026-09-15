import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { begin, bench, connect, restored, saved } from "./helpers";
import { SAVE_KEY } from "../../src/chamberCampaign.ts";

test("touch circuit controls and keyboard-opened notebook tabs fit a phone viewport", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await begin(page);
  await page.getByRole("button", { name: "Use circuit bench" }).tap();
  await expect(
    page.getByRole("region", { name: "Chamber 01 circuit" }),
  ).toBeVisible();
  await expect(page.locator(".kit-board")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await expect(page.locator(".world canvas")).toHaveAttribute(
    "data-camera-mode",
    "bench",
  );
  await page
    .getByRole("button", { name: "Battery negative", exact: true })
    .tap();
  await page.getByRole("button", { name: "Bulb contact B", exact: true }).tap();
  await restored(page, 0);
  await page.keyboard.press("n");
  for (const name of ["Parts", "Formulas", "Map"]) {
    await page.getByRole("button", { name, exact: true }).tap();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  const bounds = await page.getByRole("dialog").boundingBox();
  expect(bounds!.width).toBeLessThan(390);
  await context.close();
});
test("storage failure preserves the playable circuit", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Storage disabled");
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Begin", exact: true }).click();
  await page.keyboard.down("w");
  await page.waitForTimeout(490);
  await page.keyboard.up("w");
  await bench(page);
  await connect(page, "Battery negative", "Bulb contact B");
  await expect(page.getByText("Power restored", { exact: true })).toBeVisible();
  await expect(
    page.getByLabel("Storage unavailable. This run cannot be saved."),
  ).toBeVisible();
});
test("WebGL failure leaves a working circuit kit and sequential chamber navigation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const native = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof native>
    ) {
      if (String(args[0]).startsWith("webgl")) return null;
      return native.apply(this, args);
    } as typeof native;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Begin", exact: true }).click();
  await expect(page.locator(".kit-fallback")).toBeVisible();
  await connect(page, "Battery negative", "Bulb contact B");
  await restored(page, 0);
  await page.getByRole("button", { name: "Chamber 02", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Close switch", exact: true }),
  ).toBeVisible();
});
test("circuit controls meet contrast and accessible-name checks", async ({
  page,
}) => {
  await begin(page, 3);
  await bench(page, 3);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
test("a save resumes a restored door and the same unfinished circuit", async ({
  page,
}) => {
  await begin(page);
  await bench(page);
  await connect(page, "Battery negative", "Bulb contact B");
  await restored(page, 0);
  const completed = await saved(page);
  // Remove the initial-state injection before opening a fresh page in the same context.
  const next = await page.context().newPage();
  await next.goto("/");
  await expect(
    next.getByRole("button", { name: "Continue", exact: true }),
  ).toBeVisible();
  expect(
    await next.evaluate(
      (key) =>
        JSON.parse(localStorage.getItem(key)!).proofs.filter(Boolean).length,
      SAVE_KEY,
    ),
  ).toBe(1);
  expect(completed.proofs[0]).not.toBeNull();
  await next.close();
});
