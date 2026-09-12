import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { Player } from "../../src/scene/navigation";

export async function begin(page: Page, nearWorkshop = false) {
  if (nearWorkshop)
    await page.addInitScript(() => {
      if (!localStorage.getItem("signal.dead-orbit.player.v1"))
        localStorage.setItem(
          "signal.dead-orbit.player.v1",
          JSON.stringify({ x: -4, z: 13.5, yaw: 0, pitch: 0 }),
        );
    });
  await page.goto("/");
  await page
    .getByRole("button", { name: /^(Board the Asterion|Continue)$/ })
    .click({ timeout: 60000 });
  await expect(
    page.getByRole("button", { name: "Pause game", exact: true }),
  ).toBeVisible();
}
export async function openWorkshop(page: Page) {
  await begin(page, true);
  await expect(
    page.getByRole("button", { name: "Repair Engineering", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("e");
  await expect(
    page.getByRole("dialog", {
      name: "Engineering circuit",
      exact: true,
    }),
  ).toBeVisible();
}
export async function connect(page: Page, from: string, to: string) {
  await page.getByRole("button", { name: from, exact: true }).click();
  await page.getByRole("button", { name: to, exact: true }).click();
}
export async function hold(page: Page, key: string, ms: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}
// Read the actual saved camera by pausing. Navigation below uses ordinary player inputs.
export async function position(page: Page): Promise<Player> {
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("dialog", { name: "Paused", exact: true }),
  ).toBeVisible();
  const p = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("signal.dead-orbit.player.v1")!),
  );
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  return p;
}
export async function walkTo(page: Page, x: number, z: number) {
  for (let i = 0; i < 12; i++) {
    const p = await position(page),
      dx = x - p.x,
      dz = z - p.z,
      distance = Math.hypot(dx, dz);
    if (distance < 0.65) return;
    const yaw = Math.atan2(-dx, -dz);
    const turn = Math.atan2(Math.sin(yaw - p.yaw), Math.cos(yaw - p.yaw));
    if (Math.abs(turn) > 0.025)
      await hold(
        page,
        turn > 0 ? "ArrowLeft" : "ArrowRight",
        (Math.abs(turn) / 1.65) * 1000,
      );
    await hold(
      page,
      "w",
      Math.min(2800, Math.max(50, ((distance - 0.35) / 3.5) * 1000)),
    );
  }
  throw new Error(
    `Could not walk to ${x}, ${z}: ${JSON.stringify(await position(page))}`,
  );
}
export async function aimAt(page: Page, x: number, z: number) {
  const p = await position(page),
    yaw = Math.atan2(p.x - x, p.z - z);
  const turn = Math.atan2(Math.sin(yaw - p.yaw), Math.cos(yaw - p.yaw));
  if (Math.abs(turn) > 0.015)
    await hold(
      page,
      turn > 0 ? "ArrowLeft" : "ArrowRight",
      (Math.abs(turn) / 1.65) * 1000,
    );
}
export async function workshopRepair(page: Page) {
  await connect(page, "Lamp A right", "Bridge left");
  await page.getByRole("button", { name: "Copper", exact: true }).click();
  await page.getByRole("button", { name: "Light up", exact: true }).click();
  await page.getByRole("button", { name: "Test circuit", exact: true }).click();
  await page
    .getByRole("button", {
      name: "A conducting path through the lamp, joining both battery ends",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Restore auxiliary power", exact: true })
    .click();
}
