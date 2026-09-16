import { test, expect, type Page } from "@playwright/test";
import { CHAMBERS } from "../../src/chambers.ts";
import { initialCampaign, SAVE_KEY, serializeCampaign } from "../../src/chamberCampaign.ts";
import { PLAYER_KEY } from "../../src/scene/navigation.ts";
import { bench, restored, saved } from "./helpers";

async function reachBench(page: Page, index: number) {
  const c = CHAMBERS[index];
  await page.goto("/tests/browser/fixture.html");
  await page.evaluate(({ key, state, poseKey, pose }) => {
    localStorage.setItem(key, state);
    localStorage.setItem(poseKey, JSON.stringify(pose));
    sessionStorage.setItem("signal.asterion.god-mode", "on");
  }, {
    key: SAVE_KEY, state: serializeCampaign(initialCampaign()), poseKey: PLAYER_KEY,
    pose: { x: c.bench.x, z: c.bench.z + 2.5, yaw: 0, pitch: 0 },
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Begin", exact: true }).click();
  await expect(page.locator(".room-marker")).toBeVisible();
  // The fixture reaches the room through the development bypass. Bench access
  // itself must work with ordinary interaction rules and no completed circuits.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "God mode (dev)", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("God mode enabled")).toHaveCount(0);
}

for (const [index, chamber] of CHAMBERS.entries()) {
  test(`E opens ${chamber.name} with no prior activity completion`, async ({ page }) => {
    await reachBench(page, index);
    await bench(page, index);
    expect((await saved(page)).proofs.every((proof: unknown) => proof === null)).toBe(true);
    expect((await saved(page)).visited).toContain(chamber.id);
    await page.keyboard.press("n");
    await page.getByRole("button", { name: "Progression", exact: true }).click();
    await expect(page.locator(".progression-status").nth(index)).toHaveText("In progress");
  });
}

test("an out-of-order repair credits its own activity and survives editing and reload", async ({ page }) => {
  await reachBench(page, 1);
  await bench(page, 1);
  await page.getByRole("button", { name: "Close switch", exact: true }).click();
  await restored(page, 1);
  let state = await saved(page);
  expect(state.proofs.map(Boolean)).toEqual([false, true, false, false, false, false]);
  await expect(page.locator(".tandem-caption")).toHaveAttribute("data-scene", "contact-restored");
  await bench(page, 1);
  await page.getByRole("button", { name: "Reset circuit", exact: true }).click();
  await expect(page.locator(".circuit-lab")).not.toHaveClass(/restored/);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".circuit-lab")).toHaveClass(/restored/);
  await page.reload();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  // One later repair is not one repaired gate from the start of the route.
  await expect(page.locator(".hud-room-name")).toHaveText("Wake");
  state = await saved(page);
  expect(state.proofs.map(Boolean)).toEqual([false, true, false, false, false, false]);
  expect(state.rooms[1].parts.find((part: { kind: string }) => part.kind === "switch").closed).toBe(true);
  await page.keyboard.press("n");
  await page.getByRole("button", { name: "Progression", exact: true }).click();
  await expect(page.locator(".progression-status").nth(1)).toHaveText("Complete");
  await expect(page.locator(".progression-heading")).toContainText("1 / 6 complete");
});
