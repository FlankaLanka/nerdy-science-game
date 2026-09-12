import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { initialState, reducer } from "../src/game.ts";

// Build a valid completed fixture through the same physical tests as gameplay.
// The browser adventure test separately verifies the actual unseeded playthrough.
let restoredShip = reducer(initialState(), { type: "START" });
const checkpoints = {};
const wiring = {
  workshop: [["a2", "m1"]],
  harbor: [["b2", "n"]],
  beacon: [
    ["p", "a1"],
    ["a2", "n"],
    ["p", "b1"],
    ["b2", "n"],
  ],
};
for (const id of ["workshop", "harbor", "beacon"]) {
  const send = (action) => {
    restoredShip = reducer(restoredShip, { type: "MISSION", id, action });
  };
  if (id === "workshop") send({ type: "MATERIAL", material: "copper" });
  for (const wire of wiring[id]) send({ type: "WIRE", wire });
  send({ type: "PREDICT", value: id === "workshop" ? "on" : "both" });
  send({ type: "TEST" });
  if (id !== "workshop") {
    send({ type: "FAULT_PREDICT", value: id === "beacon" ? "stays" : "out" });
    send({ type: "FAULT_TEST" });
  }
  send({ type: "EXPLAIN", value: id === "beacon" ? "branch" : "loop" });
  restoredShip = reducer(restoredShip, { type: "COMPLETE", id, now: 1 });
  checkpoints[id] = JSON.stringify(restoredShip);
}

const baseURL = process.env.SIGNAL_REVIEW_URL || "http://127.0.0.1:5174";
const directory = "artifacts/spaceship";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  args: process.platform === "darwin" ? ["--use-angle=metal"] : [],
});
const errors = [];
const views = [
  ["title", null],
  ["engineering", { x: -4, z: 20, yaw: 0, pitch: 0.015 }],
  ["restored-engineering", { x: -4, z: 20, yaw: 0, pitch: 0.015 }],
  ["observation", { x: 1, z: 16, yaw: -0.75, pitch: 0.08 }],
  ["reactor", { x: 0, z: 1, yaw: 0.65, pitch: 0.08 }],
  ["restored-reactor", { x: 0, z: 1, yaw: 0.65, pitch: 0.08 }],
  ["command", { x: 0, z: -17.5, yaw: -0.16, pitch: 0.06 }],
  ["restored-observatory", { x: 0, z: -17.5, yaw: -0.16, pitch: 0.06 }],
  ["circuit", { x: -4, z: 13.5, yaw: 0, pitch: 0 }],
  ["rescue", { x: 0, z: -20.5, yaw: 0, pitch: 0 }],
];
const reports = [];
try {
  for (const [name, player] of views) {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 900 },
      reducedMotion: "reduce",
    });
    page.on("pageerror", (error) =>
      errors.push({ name, error: error.message }),
    );
    page.on("response", (response) => {
      if (response.status() >= 400)
        errors.push({ name, status: response.status(), url: response.url() });
    });
    if (player)
      await page.addInitScript(
        (player) =>
          localStorage.setItem(
            "signal.dead-orbit.player.v1",
            JSON.stringify(player),
          ),
        player,
      );
    if (name === "rescue" || name === "restored-observatory")
      await page.addInitScript(
        (save) => localStorage.setItem("signal.dead-orbit.v1", save),
        JSON.stringify(restoredShip),
      );
    if (name === "restored-engineering" || name === "restored-reactor")
      await page.addInitScript(
        (save) => localStorage.setItem("signal.dead-orbit.v1", save),
        checkpoints[name === "restored-engineering" ? "workshop" : "harbor"],
      );
    await page.goto(baseURL);
    await page.locator(".title-play:enabled").waitFor({ timeout: 60000 });
    if (player) {
      await page.locator(".title-play").click();
      await page.locator(".deck-readout").waitFor();
      // Exercise map and pause transitions before capturing the gameplay view.
      await page.keyboard.press("m");
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Resume", exact: true }).click();
    }
    if (name === "circuit") {
      await page.keyboard.press("e");
      await page
        .getByRole("dialog", { name: "Engineering circuit", exact: true })
        .waitFor();
      await page.screenshot({ path: `${directory}/circuit.png` });
      await page
        .getByRole("button", { name: "Lamp A right", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Bridge left", exact: true })
        .click();
      await page.getByRole("button", { name: "Copper", exact: true }).click();
      await page.getByRole("button", { name: "Light up", exact: true }).click();
      await page
        .getByRole("button", { name: "Test circuit", exact: true })
        .click();
      await page.screenshot({ path: `${directory}/circuit-live.png` });
    }
    if (name === "rescue") {
      await page.screenshot({ path: `${directory}/restored-command.png` });
      await page.keyboard.press("e");
      await page
        .getByRole("dialog", { name: "Signal restored", exact: true })
        .waitFor();
      await page.screenshot({ path: `${directory}/transmitter-ready.png` });
      await page
        .getByRole("button", { name: "Transmit distress signal", exact: true })
        .click();
      await page.screenshot({ path: `${directory}/transmitting.png` });
      await page.getByText("Signal received.", { exact: true }).waitFor();
    }
    if (name !== "circuit")
      await page.screenshot({ path: `${directory}/${name}.png` });
    if (name === "engineering") {
      await page.keyboard.press("m");
      await page
        .getByRole("dialog", { name: "Deck map", exact: true })
        .waitFor();
      await page.screenshot({ path: `${directory}/deck-map.png` });
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Resume", exact: true }).click();
      await page.keyboard.press("q");
      await page.screenshot({ path: `${directory}/ship-systems.png` });
    }
    reports.push({
      name,
      player: await page.evaluate(() =>
        JSON.parse(
          localStorage.getItem("signal.dead-orbit.player.v1") || "null",
        ),
      ),
    });
    await page.close();
  }
  await writeFile(
    `${directory}/review.json`,
    JSON.stringify({ baseURL, views: reports, errors }, null, 2) + "\n",
  );
  if (errors.length) throw new Error(JSON.stringify(errors));
  console.log(
    `Reviewed ${views.length} scenes and deck map. No browser errors. Captures: ${directory}/`,
  );
} finally {
  await browser.close();
}
