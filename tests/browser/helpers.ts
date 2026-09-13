import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { CHAMBERS } from "../../src/chambers.ts";
import { SAVE_KEY, serializeCampaign } from "../../src/chamberCampaign.ts";
import { PLAYER_KEY } from "../../src/scene/navigation.ts";
import type { Player } from "../../src/scene/navigation.ts";
import { chamberFixture } from "../chamber-fixtures.ts";
export async function begin(page: Page, index = 0, player?: Player) {
  const c = CHAMBERS[index];
  const state = chamberFixture(index);
  await page.addInitScript(
    ({ key, value, playerKey, position }) => {
      localStorage.setItem(key, value);
      localStorage.setItem(playerKey, JSON.stringify(position));
    },
    {
      key: SAVE_KEY,
      value: serializeCampaign(state),
      playerKey: PLAYER_KEY,
      position: player ?? {
        x: c.bench.x,
        z: c.bench.z + 2.5,
        yaw: 0,
        pitch: 0,
      },
    },
  );
  await page.goto("/");
  await page.getByRole("button", { name: /^(Begin|Continue)$/ }).click();
  await expect(page.locator(".room-marker")).toBeVisible();
}
export async function bench(page: Page, index = 0) {
  await expect(
    page.getByRole("button", { name: "Use circuit bench" }),
  ).toBeVisible();
  await page.keyboard.press("e");
  await expect(
    page.getByRole("region", {
      name: `Chamber ${CHAMBERS[index].number} circuit`,
    }),
  ).toBeVisible();
  await expect(page.locator(".kit-board canvas")).toBeVisible();
}
export async function connect(page: Page, a: string, b: string) {
  await page.getByRole("button", { name: a, exact: true }).click();
  await page.getByRole("button", { name: b, exact: true }).click();
}
export async function add(page: Page, kind: string, x: number, y: number) {
  await page.getByRole("button", { name: `Add ${kind}`, exact: true }).click();
  const box = (await page.locator(".kit-board").boundingBox())!;
  await page.mouse.click(
    box.x + (x / 900) * box.width,
    box.y + (y / 500) * box.height,
  );
}
export async function hold(page: Page, key: string, ms: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}
export async function saved(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null"),
    SAVE_KEY,
  );
}
export async function position(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null") as Player,
    PLAYER_KEY,
  );
}
export async function restored(page: Page, index: number) {
  await expect
    .poll(async () => !!(await saved(page))?.proofs[index])
    .toBe(true);
  await expect(
    page.getByRole("region", {
      name: `Chamber ${CHAMBERS[index].number} circuit`,
    }),
  ).not.toBeVisible();
}
