import { test, expect } from "@playwright/test";
import {
  aimAt,
  begin,
  hold,
  position,
  walkTo,
  workshopRepair,
} from "./helpers";
import { SAVE_KEY } from "../../src/campaign.ts";
import { PLAYER_KEY } from "../../src/scene/navigation.ts";
test("station saves remain isolated from the lighthouse and prior three-room edition", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("signal.v1", "preserved lighthouse");
    localStorage.setItem("signal.dead-orbit.v1", "preserved earlier spaceship");
  });
  await begin(page);
  const keys = await page.evaluate(
    (key) => ({
      old: localStorage.getItem("signal.v1"),
      ship: localStorage.getItem("signal.dead-orbit.v1"),
      current: JSON.parse(localStorage.getItem(key)!),
    }),
    SAVE_KEY,
  );
  expect(keys.old).toBe("preserved lighthouse");
  expect(keys.ship).toBe("preserved earlier spaceship");
  expect(keys.current.version).toBe(2);
});
for (const motion of ["reduce", "no-preference"] as const)
  test(`first bulkhead requires a repair and opens physically (${motion})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: motion });
    await begin(page);
    await walkTo(page, 0, 21);
    await aimAt(page, 0, 13);
    await hold(page, "w", 3000);
    const locked = await position(page);
    expect(locked.z).toBeGreaterThan(13.4);
    await expect(page.locator(".bulkhead-notice")).toContainText(
      "auxiliary power",
    );
    await walkTo(page, 0, 22.4);
    await walkTo(page, -3, 22.4);
    await aimAt(page, -3, 20);
    await page.keyboard.press("e");
    await workshopRepair(page);
    await walkTo(page, 0, 20);
    await walkTo(page, 0, 10);
    expect((await position(page)).z).toBeLessThan(12);
  });
test("systems overlay shows eight equipment states without capturing movement", async ({
  page,
}) => {
  await begin(page);
  await page.keyboard.press("q");
  await expect(page.locator("#ship-systems")).toContainText("Sensor feed");
  await expect(page.locator("#ship-systems")).toContainText("Capacitor bank");
  const start = await position(page);
  await hold(page, "s", 200);
  expect((await position(page)).z).toBeGreaterThan(start.z);
  await page.keyboard.press("q");
  await expect(page.locator("#ship-systems")).toBeVisible();
  await page.keyboard.press("q");
  await expect(page.locator("#ship-systems")).not.toBeVisible();
});
test("a saved capsule in a doorway is not trapped by a closed leaf", async ({
  page,
}) => {
  await page.addInitScript(
    (key) =>
      localStorage.setItem(
        key,
        JSON.stringify({ x: 0, z: 13, yaw: 0, pitch: 0 }),
      ),
    PLAYER_KEY,
  );
  await begin(page);
  await hold(page, "s", 500);
  expect((await position(page)).z).toBeGreaterThan(14);
});
