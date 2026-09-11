import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  begin,
  connect,
  hold,
  openWorkshop,
  position,
  workshopRepair,
} from "./helpers";

test("drag look and keyboard movement work when pointer lock is denied", async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.requestPointerLock = () =>
      Promise.reject(new Error("Pointer lock denied"));
  });
  await begin(page);
  await expect(page.locator(".compass")).toHaveAttribute(
    "aria-label",
    "Facing 0 degrees",
  );
  await page.mouse.move(850, 400);
  await page.mouse.down();
  await page.mouse.move(730, 400, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator(".compass")).not.toHaveAttribute(
    "aria-label",
    "Facing 0 degrees",
  );
  const start = await position(page);
  await hold(page, "w", 700);
  const end = await position(page);
  expect(Math.hypot(end.x - start.x, end.z - start.z)).toBeGreaterThan(1.5);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Paused", exact: true }),
  ).toBeVisible();
});

test("pre-first-person saves keep their repairs and start safely on the path", async ({
  page,
}) => {
  await openWorkshop(page);
  await workshopRepair(page);
  await page.keyboard.press("Tab");
  const legacy = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("signal.lighthouse.v1")!);
    delete state.intro;
    delete state.lesson;
    return JSON.stringify(state);
  });
  // A new page has none of the test's initial near-workshop script.
  const restored = await page.context().newPage();
  await page.close();
  await restored.addInitScript((save) => {
    localStorage.removeItem("signal.lighthouse.player.v1");
    localStorage.setItem("signal.lighthouse.v1", save);
  }, legacy);
  await restored.goto("/");
  await restored
    .getByRole("button", { name: "Continue", exact: true })
    .click({ timeout: 60000 });
  await expect(
    restored.getByText("Bring the harbor lights online", { exact: true }),
  ).toBeVisible();
  const p = await position(restored);
  expect(p.x).toBe(-3);
  expect(p.z).toBe(15.5);
  await restored.close();
});

test("abandoned coaching requests do not reappear and authored hints survive network failure", async ({
  page,
}) => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let arrived = () => {};
  const requested = new Promise<void>((resolve) => {
    arrived = resolve;
  });
  await page.route("**/api/coach", async (route) => {
    arrived();
    await gate;
    await route
      .fulfill({
        json: { source: "live", text: "A stale reply that must never appear." },
      })
      .catch(() => {});
  });
  await openWorkshop(page);
  await page.getByRole("button", { name: "Hint", exact: true }).click();
  await requested;
  await page
    .getByRole("button", {
      name: "Close keeper’s workshop circuit",
      exact: true,
    })
    .click();
  release();
  await page.keyboard.press("e");
  await expect(
    page.getByText("A stale reply that must never appear.", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Hint", exact: true }),
  ).toBeEnabled();
  await page.unroute("**/api/coach");
  await page.route("**/api/coach", (route) => route.abort());
  await page.getByRole("button", { name: "Hint", exact: true }).click();
  await expect(
    page.getByText("PIP · FIELD GUIDE", { exact: true }),
  ).toBeVisible();
});

test("WebGL failure offers explicit circuit mode instead of a broken world", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: any[]
    ) {
      if (["webgl", "webgl2", "experimental-webgl"].includes(args[0]))
        return null;
      return Reflect.apply(original, this, args);
    } as typeof original;
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Play circuit puzzles", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Repair Keeper’s workshop", exact: true })
    .click();
  await connect(page, "Lamp A right", "Bridge left");
  await page.getByRole("button", { name: "Copper", exact: true }).click();
  await page.getByRole("button", { name: "Light up", exact: true }).click();
  await page.getByRole("button", { name: "Test circuit", exact: true }).click();
  await expect(
    page.getByText("There’s our spark.", { exact: true }),
  ).toBeVisible();
});

test("blocked storage leaves repairs playable and reports the save limitation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "signal.lighthouse.player.v1",
      JSON.stringify({ x: -3, z: 5.6, yaw: 0, pitch: 0 }),
    );
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
  });
  await openWorkshop(page);
  await expect(
    page.getByText("Saving unavailable · progress stays in this tab", {
      exact: true,
    }),
  ).toBeVisible();
  await connect(page, "Lamp A right", "Bridge left");
  await page.getByRole("button", { name: "Copper", exact: true }).click();
  await page.getByRole("button", { name: "Light up", exact: true }).click();
  await page.getByRole("button", { name: "Test circuit", exact: true }).click();
  await expect(
    page.getByText("There’s our spark.", { exact: true }),
  ).toBeVisible();
});

test("circuit panel and notebook pass automated WCAG A/AA checks", async ({
  page,
}) => {
  await openWorkshop(page);
  for (const screen of ["repair", "notebook"]) {
    if (screen === "notebook") {
      await page.keyboard.press("Escape");
      await page.keyboard.press("j");
    }
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      audit.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
  }
});
