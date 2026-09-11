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
  await restored.keyboard.press("m");
  await expect(
    restored.locator('.map-stops [aria-current="step"]'),
  ).toContainText("Harbor relay");
  await restored.keyboard.press("Escape");
  await restored.getByRole("button", { name: "Resume", exact: true }).click();
  const p = await position(restored);
  expect(p.x).toBe(-3);
  expect(p.z).toBe(15.5);
  await restored.close();
});

test("circuit activities expose reset without undo or coaching controls", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/coach")) requests.push(request.url());
  });
  await openWorkshop(page);
  await expect(
    page.getByRole("button", { name: /^(Undo|Clear|Hint|Ask Pip)$/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Reset", exact: true }),
  ).toBeDisabled();
  await connect(page, "Lamp A right", "Bridge left");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /^Remove wire from/ }),
  ).toHaveCount(0);
  expect(requests).toEqual([]);
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
