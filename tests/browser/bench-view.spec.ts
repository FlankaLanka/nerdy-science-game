import { test, expect } from "@playwright/test";
import { add, begin, bench, connect, position, saved } from "./helpers";

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
  await expect(part).toHaveAccessibleDescription(/Movable/);
  const box = (await part.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(page.locator('.rotation-corner')).toHaveCount(4);
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
  const rotate = page.getByRole("button", { name: "Rotate Bulb", exact: true });
  await expect(rotate).toHaveAttribute("aria-keyshortcuts", "R");
  await rotate.click();
  await expect
    .poll(async () => (await saved(page)).rooms[2].parts[0].angle)
    .toBe(0);
  await page.keyboard.press("r");
  await expect.poll(async () => (await saved(page)).rooms[2].parts[0].angle).toBe(Math.PI / 2);
  await expect(page.locator('.rotation-corner')).toHaveCount(4);
  await page.getByRole("button", { name: "Remove Bulb" }).click();
  await expect
    .poll(async () => (await saved(page)).rooms[2].parts.length)
    .toBe(0);
});

test("corner dragging previews rotation, keeps wires attached, and cancels or undoes cleanly", async ({ page }) => {
  await begin(page, 2);
  await bench(page, 2);
  await add(page, "Battery", 250, 265);
  await add(page, "Bulb", 650, 265);
  await connect(page, "Battery positive", "Bulb contact A");
  const part = page.getByRole("button", { name: "Select Bulb", exact: true });
  await part.click();
  const corner = page.locator(".rotation-corner").first();
  const before = (await saved(page)).rooms[2];
  const canvas = page.locator(".world canvas");
  const firstContact = (await page.getByRole("button", { name: "Bulb contact A", exact: true }).boundingBox())!;
  const startTurn = async () => {
    const box = (await corner.boundingBox())!;
    const corners = await page.locator(".rotation-corner").evaluateAll(nodes => nodes.map(node => {
      const r = node.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }));
    const center = { x: corners.reduce((n, c) => n + c.x, 0) / 4, y: corners.reduce((n, c) => n + c.y, 0) / 4 };
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    expect(await corner.evaluate(node => getComputedStyle(node).cursor)).toContain("rotate-cursor.svg");
    await page.mouse.down();
    return { center, x: x - center.x, y: y - center.y };
  };
  const turn = await startTurn();
  const image = await canvas.screenshot();
  for (let i = 1; i <= 8; i++) {
    const a = i * Math.PI / 32;
    await page.mouse.move(turn.center.x + turn.x * Math.cos(a) - turn.y * Math.sin(a),
      turn.center.y + turn.x * Math.sin(a) + turn.y * Math.cos(a));
  }
  expect((await saved(page)).rooms[2]).toEqual(before);
  expect((await canvas.screenshot()).equals(image)).toBe(false);
  const movedContact = (await page.getByRole("button", { name: "Bulb contact A", exact: true }).boundingBox())!;
  expect(Math.hypot(movedContact.x - firstContact.x, movedContact.y - firstContact.y)).toBeGreaterThan(20);
  await page.mouse.up();
  await expect.poll(async () => (await saved(page)).rooms[2].parts.find((p: { kind: string }) => p.kind === "bulb").angle)
    .not.toBe(before.parts[1].angle);
  const after = (await saved(page)).rooms[2];
  expect(after.wires).toEqual(before.wires);
  expect(Math.abs(after.parts[1].angle / (Math.PI / 2) - Math.round(after.parts[1].angle / (Math.PI / 2)))).toBeGreaterThan(0.1);
  await expect(page.locator("body")).not.toHaveClass(/rotating-part/);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect((await saved(page)).rooms[2]).toEqual(before);
  await part.click();
  const cancelTurn = await startTurn();
  await page.mouse.move(cancelTurn.center.x + cancelTurn.x + 45, cancelTurn.center.y + cancelTurn.y + 25, { steps: 5 });
  await expect(page.locator("body")).toHaveClass(/rotating-part/);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect((await saved(page)).rooms[2]).toEqual(before);
  await expect(page.locator("body")).not.toHaveClass(/rotating-part/);
  await expect(page.locator(".rotation-corner")).toHaveCount(0);
  await expect(page.locator(".kit-board")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await part.click();
  // Enlarged invisible targets must leave both contacts clickable on a small bench.
  for (const name of ["Bulb contact A", "Bulb contact B"]) {
    const contact = page.getByRole("button", { name, exact: true });
    expect(await contact.evaluate(node => {
      const r = node.getBoundingClientRect();
      return node.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    })).toBe(true);
  }
  const snapTurn = await startTurn();
  await page.keyboard.down("Shift");
  await page.mouse.move(snapTurn.center.x - snapTurn.y, snapTurn.center.y + snapTurn.x, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up("Shift");
  const snapped = (await saved(page)).rooms[2].parts[1].angle / (Math.PI / 12);
  expect(snapped).toBeCloseTo(Math.round(snapped), 6);
  const snappedRoom = (await saved(page)).rooms[2];
  const blurTurn = await startTurn();
  await page.mouse.move(blurTurn.center.x + blurTurn.x + 40, blurTurn.center.y + blurTurn.y + 30, { steps: 5 });
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.mouse.up();
  expect((await saved(page)).rooms[2]).toEqual(snappedRoom);
  await expect(page.locator("body")).not.toHaveClass(/rotating-part/);
});

test("fixed parts show one subtle label and cannot be dragged or rotated", async ({ page }) => {
  await begin(page);
  await bench(page);
  const part = page.getByRole("button", { name: "Select Battery", exact: true });
  await expect(part).toHaveAccessibleDescription(/Fixed to the bench/);
  await part.click();
  const label = page.locator(".fixed-part-label");
  await expect(label).toHaveText("Fixed");
  await expect(page.locator(".rotation-corner, .mobility-corner")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Rotate Battery", exact: true })).toHaveCount(0);
  const before = (await saved(page)).rooms[0];
  const box = (await part.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 45, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.press("r");
  await page.keyboard.press("ArrowRight");
  expect((await saved(page)).rooms[0]).toEqual(before);
  expect(await part.evaluate(node => getComputedStyle(node).cursor)).toBe("pointer");
  await page.setViewportSize({ width: 320, height: 568 });
  await expect(label).toBeVisible();
  await expect.poll(() => label.evaluate(node => {
    const rect = node.getBoundingClientRect();
    return rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight;
  })).toBe(true);
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
