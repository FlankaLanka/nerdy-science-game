import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { begin, bench } from "./helpers";

test.use({ reducedMotion: "no-preference" });

test("the tablet can be put away during its opening animation and reopened without trapping input", async ({
  page,
}) => {
  await begin(page);
  await page.keyboard.press("n");
  await expect(page.getByRole("dialog", { name: "Notebook" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".world canvas")).toBeFocused();
  await page.keyboard.press("n");
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect(
    page.getByRole("img", { name: /Space station map/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close notebook", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await bench(page);
  await expect(
    page.getByRole("button", { name: "Battery negative", exact: true }),
  ).toBeVisible();
});

test("the tablet respects live motion preferences, retains focus, and stays readable", async ({
  page,
}) => {
  await begin(page, 5);
  await bench(page, 5);
  const open = page.getByRole("button", {
    name: "Battery positive",
    exact: true,
  });
  await open.focus();
  await page.keyboard.press("n");
  await page.getByRole("button", { name: "Formulas", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ohm's law", exact: true }),
  ).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .getByRole("button", { name: "Close notebook", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(open).toBeFocused();
  await page.keyboard.press("n");
  await expect(page.getByRole("dialog", { name: "Notebook" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
