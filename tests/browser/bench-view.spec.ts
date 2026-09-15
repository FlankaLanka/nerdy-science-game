import { test, expect } from "@playwright/test";
import { add, begin, bench, position, saved } from "./helpers";

test("the same world canvas travels to the table and back without moving the player", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await begin(page);
  const before = await position(page);
  const canvas = page.locator(".world canvas");
  await canvas.evaluate((node) => {
    node.dataset.originalCanvas = "yes";
    const modes = [node.dataset.cameraMode];
    new MutationObserver(() => {
      if (modes.at(-1) !== node.dataset.cameraMode)
        modes.push(node.dataset.cameraMode);
      node.dataset.cameraHistory = modes.join(",");
    }).observe(node, {
      attributes: true,
      attributeFilter: ["data-camera-mode"],
    });
  });
  await expect(
    page.getByRole("button", { name: "Use circuit bench" }),
  ).toBeVisible();
  await page.keyboard.press("e");
  await expect(canvas).toHaveAttribute("data-camera-mode", "bench");
  await expect(canvas).toHaveAttribute(
    "data-camera-history",
    "walk,transition,bench",
  );
  await expect(page.locator(".kit-board")).toHaveAttribute(
    "data-ready",
    "true",
  );
  expect(
    await page
      .locator(".circuit-lab")
      .evaluate((node) => getComputedStyle(node).backgroundImage),
  ).toBe("none");
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.locator(".kit-scene, .wire-layer")).toHaveCount(0);
  await page.screenshot({ path: "artifacts/bench-overhead.png" });
  await page.keyboard.press("n");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(canvas).toHaveAttribute("data-camera-mode", "bench");
  await page.getByRole("button", { name: "Leave circuit bench" }).click();
  await expect(canvas).toHaveAttribute("data-camera-mode", "walk");
  await expect(canvas).toHaveAttribute(
    "data-camera-history",
    "walk,transition,bench,transition,walk",
  );
  await expect(canvas).toHaveAttribute("data-original-canvas", "yes");
  await page.keyboard.press("n");
  expect(await position(page)).toEqual(before);
  await page.keyboard.press("Escape");
  await bench(page);
  await expect(canvas).toHaveAttribute("data-original-canvas", "yes");
});

test("drag previews change the room canvas before committing and survive a resized view", async ({
  page,
}) => {
  await begin(page, 2);
  await bench(page, 2);
  await add(page, "Bulb", 650, 265);
  const before = (await saved(page)).rooms[2];
  const canvas = page.locator(".world canvas");
  const part = page.getByRole("button", { name: "Select Bulb", exact: true });
  const box = (await part.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const initialImage = await canvas.screenshot();
  await page.mouse.move(box.x - 90, box.y - 20, { steps: 8 });
  expect((await saved(page)).rooms[2]).toEqual(before);
  expect((await canvas.screenshot()).equals(initialImage)).toBe(false);
  await page.mouse.up();
  await expect
    .poll(async () => (await saved(page)).rooms[2].parts[0].x)
    .toBeLessThan(before.parts[0].x);
  await page.setViewportSize({ width: 900, height: 600 });
  await expect(page.locator(".kit-board")).toBeVisible();
  await part.click();
  await page.getByRole("button", { name: "Rotate Bulb" }).click();
  await expect
    .poll(async () => (await saved(page)).rooms[2].parts[0].angle)
    .toBe(0);
  await page.getByRole("button", { name: "Remove Bulb" }).click();
  await expect
    .poll(async () => (await saved(page)).rooms[2].parts.length)
    .toBe(0);
});

test("losing the graphics context during editing preserves a usable fallback", async ({
  page,
}) => {
  await begin(page, 2);
  await bench(page, 2);
  await add(page, "Battery", 250, 265);
  await page.locator(".world canvas").evaluate((canvas) => {
    (canvas as HTMLCanvasElement)
      .getContext("webgl2")!
      .getExtension("WEBGL_lose_context")!
      .loseContext();
  });
  await expect(page.locator(".kit-fallback")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Battery negative", exact: true }),
  ).toBeVisible();
  await add(page, "Bulb", 650, 265);
  await expect
    .poll(async () => (await saved(page)).rooms[2].parts.length)
    .toBe(2);
});
