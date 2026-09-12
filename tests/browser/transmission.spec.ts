import { test, expect } from "@playwright/test";
import { SAVE_KEY } from "../../src/campaign.ts";
import { campaignFixtures } from "../fixtures.ts";
import { PLAYER_KEY } from "../../src/scene/navigation.ts";
import { begin, hold, position } from "./helpers";

test("a distress packet completes once while the player explores outside the console", async ({
  page,
}) => {
  const state = campaignFixtures().complete;
  await page.addInitScript(
    ({ state, saveKey, playerKey }) => {
      localStorage.setItem(saveKey, JSON.stringify(state));
      localStorage.setItem(
        playerKey,
        JSON.stringify({ x: 0, z: -16.7, yaw: 0, pitch: 0 }),
      );
    },
    { state, saveKey: SAVE_KEY, playerKey: PLAYER_KEY },
  );
  await begin(page);
  await page.keyboard.press("e");
  await page
    .getByRole("button", { name: "Transmit distress signal", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Current objective")).toContainText(
    "Transmitting the distress signal",
  );
  await hold(page, "s", 400);
  expect((await position(page)).z).toBeGreaterThan(-16.5);
  await expect(page.getByLabel("Current objective")).toContainText(
    "Rescue has our coordinates.",
  );
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
  expect(saved.distressSent).toBe(true);
  expect(saved.completed).toHaveLength(8);
  expect(saved.missions.beacon.experiments).toHaveLength(2);
});
