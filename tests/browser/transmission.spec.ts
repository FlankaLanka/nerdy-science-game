import { test, expect } from "@playwright/test";
import { initialState, reducer, SAVE_KEY } from "../../src/game.ts";
import { PLAYER_KEY } from "../../src/scene/navigation.ts";
import type { MissionAction } from "../../src/game.ts";
import type { MissionId, Wire } from "../../src/missions.ts";
import { begin, hold, position } from "./helpers";

test("a distress packet completes once while the player explores outside the console", async ({
  page,
}) => {
  let state = reducer(initialState(), { type: "START" });
  const wires: Record<MissionId, Wire[]> = {
    workshop: [["a2", "m1"]],
    harbor: [["b2", "n"]],
    beacon: [
      ["p", "a1"],
      ["a2", "n"],
      ["p", "b1"],
      ["b2", "n"],
    ],
  };
  for (const id of ["workshop", "harbor", "beacon"] as MissionId[]) {
    const send = (action: MissionAction) => {
      state = reducer(state, { type: "MISSION", id, action });
    };
    if (id === "workshop") send({ type: "MATERIAL", material: "copper" });
    for (const wire of wires[id]) send({ type: "WIRE", wire });
    send({ type: "PREDICT", value: id === "workshop" ? "on" : "both" });
    send({ type: "TEST" });
    if (id !== "workshop") {
      send({ type: "FAULT_PREDICT", value: id === "beacon" ? "stays" : "out" });
      send({ type: "FAULT_TEST" });
    }
    send({ type: "EXPLAIN", value: id === "beacon" ? "branch" : "loop" });
    state = reducer(state, { type: "COMPLETE", id, now: 1 });
  }
  await page.addInitScript(
    ({ state, saveKey, playerKey }) => {
      localStorage.setItem(saveKey, JSON.stringify(state));
      localStorage.setItem(
        playerKey,
        JSON.stringify({ x: 0, z: -20.5, yaw: 0, pitch: 0 }),
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
  expect((await position(page)).z).toBeGreaterThan(-20);
  await expect(page.getByLabel("Current objective")).toContainText(
    "Rescue has our coordinates.",
  );
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
  expect(saved.distressSent).toBe(true);
  expect(saved.completed).toEqual(["workshop", "harbor", "beacon"]);
  expect(saved.missions.beacon.experiments).toHaveLength(2);
});
