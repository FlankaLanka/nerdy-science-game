import { test, expect } from "@playwright/test";
import {
  aimAt,
  begin,
  connect,
  hold,
  openWorkshop,
  position,
  walkTo,
  workshopRepair,
} from "./helpers";

test("walk the island, restore all three physical stations, and retain discoveries", async ({
  page,
}) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await begin(page);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.screenshot({ path: "docs/screenshots/fps-world.png" });
  await page.keyboard.down("w");
  await page
    .getByRole("button", { name: "Repair Keeper’s workshop", exact: true })
    .waitFor();
  await page.keyboard.up("w");
  await page.screenshot({ path: "docs/screenshots/fps-interact.png" });
  await page.keyboard.press("e");
  await page
    .getByRole("dialog", { name: "Keeper’s workshop circuit" })
    .waitFor();
  await expect(
    page.getByRole("button", { name: "Test circuit", exact: true }),
  ).toHaveCount(0);
  await connect(page, "Lamp A right", "Bridge left");
  await page.getByRole("button", { name: "Glass", exact: true }).click();
  await page.getByRole("button", { name: "Light up", exact: true }).click();
  await page.getByRole("button", { name: "Test circuit", exact: true }).click();
  await expect(
    page.getByText("No current through the bridge.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Copper", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Test circuit", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Light up", exact: true }).click();
  await page.getByRole("button", { name: "Test circuit", exact: true }).click();
  await page
    .getByRole("button", {
      name: "A wire to just one end of the battery",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("One connection leaves a gap.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "A conducting path through the lamp, joining both battery ends",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Light the workshop", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Inspect Keeper’s workshop", exact: true }),
  ).toBeVisible();
  await walkTo(page, -3, 8.5);
  await walkTo(page, 21, 8.5);
  await aimAt(page, 21, 12);
  await page.keyboard.down("w");
  await page
    .getByRole("button", { name: "Repair Harbor relay", exact: true })
    .waitFor();
  await page.keyboard.up("w");
  await page.screenshot({ path: "docs/screenshots/fps-harbor.png" });
  await page.keyboard.press("e");
  await connect(page, "Lamp B right", "Battery negative");
  await page
    .getByRole("button", { name: "Both lamps light", exact: true })
    .click();
  await page.getByRole("button", { name: "Test circuit", exact: true }).click();
  await page.getByRole("button", { name: "B stays on", exact: true }).click();
  await page
    .getByRole("button", { name: "Disconnect lamp A", exact: true })
    .click();
  await expect(
    page.getByText("They shared one path.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Removing A opened their only complete path",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Restore the harbor", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Inspect Harbor relay", exact: true }),
  ).toBeVisible();
  await walkTo(page, 11, 8);
  await walkTo(page, 11, -13.7);
  await aimAt(page, 11, -16.3);
  await page.keyboard.down("w");
  await expect(
    page.getByRole("button", {
      name: "Repair Lighthouse control",
      exact: true,
    }),
  ).toBeVisible();
  await page.keyboard.up("w");
  await page.keyboard.press("e");
  await connect(page, "Battery positive", "Lamp A left");
  await connect(page, "Lamp A right", "Lamp B left");
  await connect(page, "Lamp B right", "Battery negative");
  await page
    .getByRole("button", { name: "Both lamps light", exact: true })
    .click();
  await page.getByRole("button", { name: "Test circuit", exact: true }).click();
  await page.getByRole("button", { name: "B stays on", exact: true }).click();
  await page
    .getByRole("button", { name: "Disconnect lamp A", exact: true })
    .click();
  await expect(
    page.getByText("Both went dark.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Revise your circuit", exact: true })
    .click();
  await connect(page, "Lamp A right", "Lamp B left");
  await connect(page, "Lamp A right", "Battery negative");
  await connect(page, "Battery positive", "Lamp B left");
  await page
    .getByRole("button", { name: "Both lamps light", exact: true })
    .click();
  await page.getByRole("button", { name: "Test circuit", exact: true }).click();
  await page.getByRole("button", { name: "B stays on", exact: true }).click();
  await page
    .getByRole("button", { name: "Disconnect lamp A", exact: true })
    .click();
  await expect(
    page.getByText("The backup held.", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/fps-backup.png" });
  await page
    .getByRole("button", {
      name: "B has its own complete path to both battery ends",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Send the signal", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Signal restored", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open field notes", exact: true })
    .click();
  await page
    .getByLabel("A note to yourself", { exact: false })
    .fill("Each lamp can have its own path.");
  await page
    .getByRole("button", { name: "Previous discovery", exact: true })
    .click();
  await expect(
    page.getByText(
      "Before disconnecting A, you expected B to stay on. B went out.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Continue", exact: true })
    .click({ timeout: 60000 });
  await page.keyboard.press("j");
  await expect(page.locator(".archive-tabs svg")).toHaveCount(3);
  await expect(
    page.getByLabel("A note to yourself", { exact: false }),
  ).toHaveValue("Each lamp can have its own path.");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.keyboard.press("e");
  await expect(
    page.getByRole("dialog", { name: "Lighthouse control circuit", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Remove wire from/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Test circuit", exact: true }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});

test("pause, mouse release, wall collision, map, and safe restart preserve progress", async ({
  page,
}) => {
  await begin(page);
  const start = await position(page);
  await hold(page, "w", 1300);
  const after = await position(page);
  expect(after.z).toBeLessThan(start.z - 2);
  await hold(page, "w", 3500);
  const wall = await position(page);
  expect(wall.z).toBeGreaterThanOrEqual(3.7);
  await page.keyboard.press("m");
  await expect(
    page.getByRole("dialog", { name: "Island map", exact: true }),
  ).toBeVisible();
  const stopped = await page.evaluate(() =>
    localStorage.getItem("signal.lighthouse.player.v1"),
  );
  await hold(page, "w", 300);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("signal.lighthouse.player.v1"),
    ),
  ).toBe(stopped);
  await expect(
    page.getByRole("button", { name: /follow path|explore/ }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("button", { name: "Start a new adventure", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Keep exploring", exact: true })
    .click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  const kept = await position(page);
  expect(kept.z).toBeCloseTo(wall.z, 1);
});

test("keyboard socket selection, undo, closing a panel and reloading retain the circuit", async ({
  page,
}) => {
  await openWorkshop(page);
  await page.getByRole("button", { name: "Lamp A right", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Bridge left", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Remove wire from Lamp A right to Bridge left",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Lamp A right", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", {
      name: "Keeper’s workshop circuit",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Lamp A right", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await connect(page, "Lamp A right", "Bridge left");
  await page.getByRole("button", { name: "Copper", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await page
    .getByRole("button", { name: "Continue", exact: true })
    .click({ timeout: 60000 });
  await page.keyboard.press("e");
  await expect(
    page.getByRole("button", { name: "Copper", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", {
      name: "Remove wire from Lamp A right to Bridge left",
      exact: true,
    }),
  ).toBeAttached();
});

test("locked stations cannot be repaired before they have incoming power", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "signal.lighthouse.player.v1",
      JSON.stringify({ x: 21, z: 14.2, yaw: 0, pitch: 0 }),
    ),
  );
  await begin(page);
  await page
    .getByRole("button", { name: "Inspect locked Harbor relay", exact: true })
    .waitFor();
  await page.keyboard.press("e");
  await expect(
    page.getByText("This line is dead.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("coaching API validates requests and labels authored answers", async ({
  request,
}) => {
  expect((await request.get("/api/status")).status()).toBe(200);
  expect((await request.post("/api/coach", { data: {} })).status()).toBe(400);
  expect(
    (
      await request.post("/api/coach", {
        headers: { Origin: "https://unrelated.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  const answer = await request.post("/api/coach", {
    data: {
      mission: "workshop",
      phase: "build",
      wires: [["a2", "m1"]],
      material: "copper",
      message: "What changed?",
      hints: 1,
      attempts: 1,
    },
  });
  expect(answer.status()).toBe(200);
  expect((await answer.json()).source).toBe("field-guide");
});

test("first repair restores the environment and marks the harbor on the map", async ({
  page,
}) => {
  await openWorkshop(page);
  await workshopRepair(page);
  await page.keyboard.press("m");
  await expect(
    page.locator('.map-stops [aria-current="step"]'),
  ).toContainText("Harbor relay");
  const completed = await page.evaluate(
    () => JSON.parse(localStorage.getItem("signal.lighthouse.v1")!).completed,
  );
  expect(completed).toEqual(["workshop"]);
});
