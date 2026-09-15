import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  add,
  begin,
  bench,
  connect,
  hold,
  restored,
  saved,
  position,
} from "./helpers";

test("first chamber is one connection, automatic restoration, and a quiet HUD", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await begin(page);
  await bench(page);
  await expect(
    page.getByRole("button", { name: /test|hypothesis|commission|submit/i }),
  ).toHaveCount(0);
  await expect(page.locator(".tool-instruction")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Wire tool", exact: true })).toHaveAccessibleDescription("Unlimited wire");
  await expect(page.locator(".tool-stock")).toHaveText("∞");
  await connect(page, "Battery negative", "Bulb contact B");
  await restored(page, 0);
  await expect(page.locator(".room-marker")).toContainText("01");
  await expect(page.locator(".room-marker")).toContainText("Wake");
  await expect(page.getByRole("button", { name: "Open notebook", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pause game", exact: true })).toHaveCount(0);
  await bench(page);
  await page.getByRole("button", { name: "Reset circuit" }).click();
  await expect(page.locator(".circuit-lab")).not.toHaveClass(/restored/);
  await expect(page.getByText("Power restored", { exact: true })).toHaveCount(0);
  await expect.poll(async () => !!(await saved(page)).proofs[0]).toBe(true);
  await page.waitForTimeout(1900);
  await expect(
    page.getByRole("region", { name: "Chamber 01 circuit" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("second chamber introduces a physical switch", async ({ page }) => {
  await begin(page, 1);
  await bench(page, 1);
  await page.getByRole("button", { name: "Close switch", exact: true }).click();
  await restored(page, 1);
});
test("third chamber builds a complete circuit from the parts tray", async ({
  page,
}) => {
  await begin(page, 2);
  await bench(page, 2);
  await expect(page.locator(".tool-instruction")).toHaveText("Drag a part onto the bench.");
  await expect(page.getByRole("button", { name: "Add Battery", exact: true })).toHaveAccessibleDescription("1 available");
  await expect(page.getByRole("button", { name: "Add Bulb", exact: true })).toHaveAccessibleDescription("1 available");
  await add(page, "Battery", 250, 265);
  await add(page, "Bulb", 650, 265);
  await expect(page.locator(".tool-instruction")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add Bulb", exact: true })).toHaveAccessibleDescription("0 available");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add Bulb", exact: true })).toHaveAccessibleDescription("1 available");
  await expect(page.locator(".tool-instruction")).toBeVisible();
  await page.getByRole("button", { name: "Reset circuit", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add Battery", exact: true })).toHaveAccessibleDescription("1 available");
  await add(page, "Battery", 250, 265);
  await add(page, "Bulb", 650, 265);
  await expect(
    page.getByRole("button", { name: "Add Battery" }),
  ).toBeDisabled();
  await connect(page, "Battery positive", "Bulb contact A");
  await connect(page, "Battery negative", "Bulb contact B");
  await restored(page, 2);
});
test("resistance is adjusted live, with no worksheet or submit step", async ({
  page,
}) => {
  await begin(page, 3);
  await bench(page, 3);
  await add(page, "Resistor", 450, 135);
  await connect(page, "Battery negative", "Resistor contact A");
  await connect(page, "Resistor contact B", "Bulb contact B");
  await expect.poll(async () => !!(await saved(page)).proofs[3]).toBe(false);
  await page
    .getByRole("button", { name: "Select Resistor", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "6 Ω", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "12 Ω", exact: true }).click();
  await restored(page, 3);
});
test("two lamps can share a twelve-volt supply in series", async ({ page }) => {
  await begin(page, 4);
  await bench(page, 4);
  await add(page, "Bulb", 440, 155);
  await page.getByRole("button", { name: "Select Bulb", exact: true }).click();
  await page.getByRole("button", { name: "Rotate Bulb" }).click();
  await add(page, "Bulb", 665, 295);
  await connect(page, "Battery negative", "Bulb 1 contact A");
  await connect(page, "Bulb 1 contact B", "Bulb 2 contact B");
  await connect(page, "Bulb 2 contact A", "Battery positive");
  await restored(page, 4);
});
test("final chamber requires an independent branch, and permits testing it after restoration", async ({
  page,
}) => {
  await begin(page, 5);
  await bench(page, 5);
  await add(page, "Bulb", 455, 375);
  await page
    .getByRole("button", { name: "Select Bulb 2", exact: true })
    .click();
  await page.getByRole("button", { name: "Rotate Bulb" }).click();
  await connect(page, "Battery positive", "Bulb 2 contact A");
  await connect(page, "Battery negative", "Bulb 2 contact B");
  await restored(page, 5);
  await bench(page, 5);
  await page.getByRole("button", { name: "Open switch", exact: true }).click();
  await expect(page.locator(".part-wrap.bulb.lit")).toHaveCount(1);
  await expect.poll(async () => !!(await saved(page)).proofs[5]).toBe(true);
});
test("shorted batteries trip protection, and undo immediately recovers", async ({
  page,
}) => {
  await begin(page);
  await bench(page);
  await connect(page, "Battery positive", "Battery negative");
  await expect(page.getByText("Short circuit", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByText("Short circuit", { exact: true }),
  ).not.toBeVisible();
  await connect(page, "Battery negative", "Bulb contact B");
  await restored(page, 0);
});
test("notebook keeps discovered parts, formulas, and a non-teleporting station map", async ({
  page,
}) => {
  await begin(page);
  await page.keyboard.press("n");
  await expect(
    page.getByRole("heading", { name: "Battery", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Resistor", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Formulas", exact: true }).click();
  await expect(page.getByText("Find formulas as you explore.")).toBeVisible();
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect(
    page.getByRole("img", { name: /Space station map/ }),
  ).toBeVisible();
  await expect(page.locator(".map-room")).toHaveCount(6);
  await expect(page.locator(".map-room.locked")).toHaveCount(5);
  await expect(page.locator(".station-map button")).toHaveCount(0);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("keyboard-only circuit construction and editing works", async ({
  page,
}) => {
  await begin(page, 2);
  await bench(page, 2);
  for (const name of ["Add Battery", "Add Bulb"]) {
    await page.getByRole("button", { name, exact: true }).focus();
    await page.keyboard.press("Enter");
  }
  await page.getByRole("button", { name: "Select Bulb", exact: true }).focus();
  await page.keyboard.press("Enter");
  const before = (await saved(page)).rooms[2].parts.find(
    (p: { kind: string }) => p.kind === "bulb",
  ).x;
  await page.keyboard.press("ArrowLeft");
  await expect
    .poll(
      async () =>
        (await saved(page)).rooms[2].parts.find(
          (p: { kind: string }) => p.kind === "bulb",
        ).x,
    )
    .toBe(before - 10);
  for (const name of [
    "Battery positive",
    "Bulb contact A",
    "Battery negative",
    "Bulb contact B",
  ]) {
    await page.getByRole("button", { name, exact: true }).focus();
    await page.keyboard.press("Enter");
  }
  await restored(page, 2);
});
test("a closed door physically blocks progression", async ({ page }) => {
  await begin(page, 0, { x: -10, z: 15, yaw: 0, pitch: 0 });
  await hold(page, "w", 1000);
  await page.keyboard.press("n");
  expect((await position(page)).z).toBeGreaterThanOrEqual(13.44);
  await page.keyboard.press("Escape");
  await expect(page.locator(".room-marker")).toContainText("01");
});
test("restoring the first circuit opens a walkable route to chamber two", async ({
  page,
}) => {
  await begin(page);
  await bench(page);
  await connect(page, "Battery negative", "Bulb contact B");
  await restored(page, 0);
  await hold(page, "d", 720);
  await hold(page, "w", 1650);
  await hold(page, "a", 720);
  await hold(page, "w", 2300);
  await expect(page.locator(".room-marker")).toContainText("02");
  await expect
    .poll(async () => (await saved(page)).visited)
    .toContain("contact");
});
test("breaking a repaired circuit closes its door, and undo restores passage", async ({ page }) => {
  await begin(page);
  await bench(page);
  await connect(page, "Battery negative", "Bulb contact B");
  await restored(page, 0);
  await bench(page);
  await page.getByRole("button", { name: "Reset circuit", exact: true }).click();
  await expect(page.locator(".circuit-lab")).not.toHaveClass(/restored/);
  await page.getByRole("button", { name: "Leave circuit bench", exact: true }).click();
  await expect(page.locator(".world canvas")).toHaveAttribute("data-camera-mode", "walk");
  await hold(page, "d", 720);
  await hold(page, "w", 1650);
  await hold(page, "a", 720);
  await hold(page, "w", 1300);
  await page.keyboard.press("n");
  expect((await position(page)).z).toBeGreaterThanOrEqual(13.44);
  expect((await position(page)).z).toBeLessThan(14.1);
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect(page.locator(".map-door.powered")).toHaveCount(0);
  await page.getByRole("button", { name: "Close notebook", exact: true }).click();
  await hold(page, "s", 950);
  await hold(page, "ArrowLeft", 1904);
  await bench(page);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".circuit-lab")).toHaveClass(/restored/);
  await page.getByRole("button", { name: "Leave circuit bench", exact: true }).click();
  await expect(page.locator(".world canvas")).toHaveAttribute("data-camera-mode", "walk");
  await hold(page, "ArrowLeft", 1904);
  await hold(page, "w", 2300);
  await expect(page.locator(".room-marker")).toContainText("02");
});
test("wires can be dragged between contacts", async ({ page }) => {
  await begin(page);
  await bench(page);
  const a = (await page
      .getByRole("button", { name: "Battery negative", exact: true })
      .boundingBox())!,
    b = (await page
      .getByRole("button", { name: "Bulb contact B", exact: true })
      .boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
  await restored(page, 0);
});
test("parts drag without losing their wires and undo restores their position", async ({
  page,
}) => {
  await begin(page, 2);
  await bench(page, 2);
  await add(page, "Battery", 250, 265);
  await add(page, "Bulb", 650, 265);
  await connect(page, "Battery positive", "Bulb contact A");
  const before = (await saved(page)).rooms[2];
  const p = (await page
    .getByRole("button", { name: "Select Bulb", exact: true })
    .boundingBox())!;
  await page.mouse.move(p.x + p.width / 2, p.y + p.height / 2);
  await page.mouse.down();
  await page.mouse.move(p.x + p.width / 2 - 80, p.y + p.height / 2 - 20, {
    steps: 8,
  });
  await page.mouse.up();
  const after = (await saved(page)).rooms[2];
  expect(after.wires).toEqual(before.wires);
  expect(after.parts[1].x).toBeLessThan(before.parts[1].x);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect
    .poll(async () => (await saved(page)).rooms[2].parts[1].x)
    .toBe(before.parts[1].x);
});
test("notebook returns discovered equations in the later chambers", async ({
  page,
}) => {
  await begin(page, 5);
  await page.keyboard.press("n");
  await page.getByRole("button", { name: "Formulas", exact: true }).click();
  for (const name of ["Ohm's law", "Series", "Parallel"])
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
});

test("Escape cancels a dragged lead and a switch drag does not toggle it", async ({
  page,
}) => {
  await begin(page, 1);
  await bench(page, 1);
  const a = (await page
    .getByRole("button", { name: "Battery negative", exact: true })
    .boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + 120, a.y - 30, { steps: 5 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(
    page.getByRole("region", { name: "Chamber 02 circuit" }),
  ).toBeVisible();
  expect((await saved(page)).rooms[1].wires).toHaveLength(3);
  const toggle = (await page
    .getByRole("button", { name: "Close switch", exact: true })
    .boundingBox())!;
  await page.mouse.move(
    toggle.x + toggle.width / 2,
    toggle.y + toggle.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(toggle.x + 130, toggle.y + 80, { steps: 5 });
  await page.mouse.up();
  await expect(
    page.getByRole("button", { name: "Close switch", exact: true }),
  ).toBeVisible();
  expect((await saved(page)).proofs[1]).toBeNull();
  await page.getByRole("button", { name: "Close switch", exact: true }).click();
  await restored(page, 1);
});
