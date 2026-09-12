import { test, expect } from "@playwright/test";
import { begin, hold, position, walkTo } from "./helpers";

test("ship saves are isolated from the preserved lighthouse adventure", async ({
  page,
}) => {
  const previous = {
    progress: '{"started":true,"completed":["workshop"]}',
    player: '{"x":21,"z":14,"yaw":0,"pitch":0}',
  };
  await page.addInitScript((previous) => {
    localStorage.setItem("signal.lighthouse.v1", previous.progress);
    localStorage.setItem("signal.lighthouse.player.v1", previous.player);
  }, previous);
  await begin(page);
  await hold(page, "w", 250);
  await page.keyboard.press("Tab");
  const saves = await page.evaluate(() => ({
    lighthouse: localStorage.getItem("signal.lighthouse.v1"),
    lighthousePlayer: localStorage.getItem("signal.lighthouse.player.v1"),
    ship: JSON.parse(localStorage.getItem("signal.dead-orbit.v1")!),
    shipPlayer: JSON.parse(
      localStorage.getItem("signal.dead-orbit.player.v1")!,
    ),
  }));
  expect(saves.lighthouse).toBe(previous.progress);
  expect(saves.lighthousePlayer).toBe(previous.player);
  expect(saves.ship.completed).toEqual([]);
  expect(saves.shipPlayer.x).toBe(-4);
  expect(saves.shipPlayer.z).toBeLessThan(20);
});

test.describe("animated ship", () => {
  test.use({ reducedMotion: "no-preference" });
  test("launch effects release the view, doors open on approach, and reduced motion remains usable", async ({
    page,
  }) => {
    test.setTimeout(90000);
    await begin(page);
    const overlay = page.locator(".world-transition");
    await expect(overlay).toHaveCSS("pointer-events", "none");
    await expect(overlay).toHaveCount(0, { timeout: 4000 });
    await walkTo(page, 0, 16);
    await walkTo(page, 0, 0);
    const p = await position(page);
    expect(p.z).toBeLessThan(1);
    await expect(page.locator(".deck-readout strong")).toHaveText(
      "Power relay",
    );
    await page.keyboard.press("Tab");
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page
      .getByRole("checkbox", { name: "Reduce motion", exact: true })
      .check();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
    await expect(page.locator(".dialog[open] .screen-content")).toHaveCSS(
      "animation-name",
      "none",
    );
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Resume", exact: true }).click();
    await hold(page, "w", 250);
    expect((await position(page)).z).toBeLessThan(p.z);
  });
});

test("a saved doorway position resumes inside the open bulkhead", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "signal.dead-orbit.player.v1",
      JSON.stringify({ x: 0, z: 5.5, yaw: 0, pitch: 0 }),
    ),
  );
  await begin(page);
  const resumed = await position(page);
  expect(resumed.x).toBe(0);
  expect(resumed.z).toBe(5.5);
  await hold(page, "w", 450);
  expect((await position(page)).z).toBeLessThan(4.5);
});
