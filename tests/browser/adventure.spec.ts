import { test, expect } from "@playwright/test";
import {
  begin,
  openWorkshop,
  workshopRepair,
  connect,
  walkTo,
  aimAt,
  position,
} from "./helpers";
import { SAVE_KEY } from "../../src/campaign.ts";
import { PLAYER_KEY } from "../../src/scene/navigation.ts";
import { campaignFixtures } from "../fixtures.ts";
import type { Page } from "@playwright/test";
const button = (p: Page, name: string) =>
  p.getByRole("button", { name, exact: true });
const record = async (p: Page) => button(p, "Test & record").click();
const commission = async (p: Page) => button(p, "Commission system").click();
async function travel(p: Page, points: number[][]) {
  for (const [x, z] of points) await walkTo(p, x, z);
}
async function use(p: Page, x: number, z: number, title: string) {
  await aimAt(p, x, z);
  await p.keyboard.press("e");
  await expect(
    p.getByRole("dialog", { name: title, exact: true }),
  ).toBeVisible();
}
test("explore both loops and commission the full eight-repair station through ordinary controls", async ({
  page,
}) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openWorkshop(page);
  await expect(button(page, "Test circuit")).toBeEnabled();
  await expect(page.getByText(/Your prediction|The lamp will/)).toHaveCount(0);
  await button(page, "Test circuit").click();
  await expect(page.locator(".service-readout")).toContainText("0.00");
  await workshopRepair(page);
  // Choose the distribution branch first rather than the default materials objective.
  await travel(page, [
    [0, 22.5],
    [0, 15],
    [0, 10],
    [8, 10],
    [12, 10],
    [12, 15.3],
    [14, 15.3],
  ]);
  await use(page, 14, 13, "Distribution circuit");
  await connect(page, "Lamp B right", "Battery negative");
  await button(page, "Test circuit").click();
  await expect(page.locator(".service-readout")).toContainText("3.0V/0.25A");
  await button(page, "Disconnect lamp A").click();
  await button(page, "Restore distribution").click();
  await travel(page, [
    [12, 15],
    [12, 10],
    [4, 10],
    [4, 6.3],
  ]);
  await use(page, 4, 4, "Station hub instruments");
  await button(page, "Parallel").click();
  await record(page);
  await expect(page.locator(".instrument-meters")).toContainText("1.50 A");
  await button(page, "A isolated").click();
  await record(page);
  await expect(page.locator(".instrument-meters")).toContainText("12.00 V");
  await commission(page);
  await travel(page, [
    [4, 9],
    [14, 9],
    [14, 2],
    [12, -2],
    [12, -3.7],
    [14, -3.7],
  ]);
  await use(page, 14, -6, "Reserve vault instruments");
  await record(page);
  await button(page, "Parallel").click();
  await record(page);
  await expect(page.locator(".instrument-meters")).toContainText("2.88 J");
  await commission(page);
  await travel(page, [
    [12, -3.7],
    [12, -6],
    [0, -6],
    [-12, -6],
    [-14, -2],
    [-14, 4],
    [-13, 10],
    [-13, 15.3],
    [-15, 15.3],
  ]);
  await use(page, -15, 13, "Materials workshop instruments");
  await button(page, "Copper").click();
  await record(page);
  await expect(page.locator(".lab-narration")).toContainText("virtual fuse");
  await button(page, "Nichrome").click();
  await record(page);
  await button(page, "3 V").click();
  await record(page);
  await button(page, "6 V").click();
  await record(page);
  await expect(page.locator(".instrument-meters")).toContainText("0.50 A");
  await commission(page);
  await travel(page, [
    [-13, 15.3],
    [-13, 10],
    [-14, 4],
    [-14, -2],
    [-15, -3.7],
  ]);
  await use(page, -15, -6, "Life support instruments");
  await record(page);
  await expect(button(page, "Commission system")).toHaveCount(0);
  await button(page, "5 Ω").click();
  await record(page);
  await expect(page.locator(".instrument-meters")).toContainText("6.00 V");
  await commission(page);
  await travel(page, [
    [-13, -3.7],
    [-12, -6],
    [-3, -6],
    [0, -4.7],
  ]);
  await use(page, 0, -7, "Airlock control instruments");
  await button(page, "Advance to 5τ").click();
  await button(page, "Run 2 s outage test").click();
  await expect(page.locator(".lab-narration")).toContainText(
    "lost its voltage reserve",
    { timeout: 7000 },
  );
  await button(page, "40 mF").click();
  await button(page, "Advance to 5τ").click();
  await button(page, "Run 2 s outage test").click();
  await expect(button(page, "Commission system")).toBeVisible({
    timeout: 7000,
  });
  await commission(page);
  // The airlock console is offset by walking around its right side.
  await travel(page, [
    [1.35, -5],
    [1.35, -9],
    [0, -12],
    [0, -16.7],
  ]);
  await use(page, 0, -19, "Command circuit");
  for (const [a, b] of [
    ["Battery positive", "Lamp A left"],
    ["Lamp A right", "Battery negative"],
    ["Battery positive", "Lamp B left"],
    ["Lamp B right", "Battery negative"],
  ])
    await connect(page, a, b);
  await button(page, "Test circuit").click();
  await button(page, "Disconnect lamp A").click();
  await button(page, "Power the transmitter").click();
  await button(page, "Transmit distress signal").click();
  await expect(
    page.getByRole("heading", { name: "Signal received." }),
  ).toBeVisible();
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
  expect(saved.completed).toHaveLength(8);
  expect(saved.distressSent).toBe(true);
  expect(saved.missions.beacon.prediction).toBeNull();
  expect(errors).toEqual([]);
});
test("later equipment can be inspected before commissioning dependencies are repaired", async ({
  page,
}) => {
  await page.addInitScript(
    (key) =>
      localStorage.setItem(
        key,
        JSON.stringify({ x: 14, z: -3.7, yaw: 0, pitch: 0 }),
      ),
    PLAYER_KEY,
  );
  await begin(page);
  await page.keyboard.press("e");
  await record(page);
  await button(page, "Parallel").click();
  await record(page);
  await expect(button(page, "Commission system")).toBeDisabled();
  await expect(page.locator(".lab-blocked")).toContainText(
    "Independent supply",
  );
});
test("map tracking chooses either unlocked wing and changes the world objective", async ({
  page,
}) => {
  const state = campaignFixtures().snapshots.workshop!;
  await page.addInitScript(
    ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
    { key: SAVE_KEY, state },
  );
  await begin(page);
  await page.keyboard.press("m");
  await page
    .getByRole("button", { name: /03 Distribution TRACK REPAIR/ })
    .click();
  await expect(page.getByLabel("Current objective")).toContainText(
    "shared interlock",
  );
});
test("keyboard wiring, undo, cancellation and reload preserve the editable circuit", async ({
  page,
}) => {
  await openWorkshop(page);
  await button(page, "Lamp A right").focus();
  await page.keyboard.press("Enter");
  await button(page, "Bridge left").focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: /^Remove wire from/ }),
  ).toHaveCount(1);
  await button(page, "Undo").click();
  await expect(
    page.getByRole("button", { name: /^Remove wire from/ }),
  ).toHaveCount(0);
  await connect(page, "Lamp A right", "Bridge left");
  await page.keyboard.press("Escape");
  await position(page);
  await page.reload();
  await button(page, "Continue").click();
  await page.keyboard.press("e");
  await expect(
    page.getByRole("button", { name: /^Remove wire from/ }),
  ).toHaveCount(1);
});
