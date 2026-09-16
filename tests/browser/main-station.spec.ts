import { test, expect } from "@playwright/test";
import { SAVE_KEY, serializeCampaign } from "../../src/chamberCampaign";
import { PLAYER_KEY } from "../../src/scene/navigation";
import { chamberFixture } from "../chamber-fixtures";
import { position } from "./helpers";

async function arrive(page: import("@playwright/test").Page, completed = 6) {
  await page.addInitScript(({ key, value, playerKey }) => {
    // Seed once so a reload exercises the real saved player position.
    if (sessionStorage.getItem("station-review")) return;
    sessionStorage.setItem("station-review", "yes");
    localStorage.setItem(key, value);
    localStorage.setItem(playerKey, JSON.stringify({ x: 10, z: 31, yaw: Math.PI, pitch: 0.05 }));
  }, { key: SAVE_KEY, value: serializeCampaign(chamberFixture(completed)), playerKey: PLAYER_KEY });
  await page.goto("/");
  await page.getByRole("button", { name: /^(Begin|Continue)$/ }).click();
}

test("finishing circuits opens an explorable station and preserves the visit on reload", async ({ page }) => {
  await arrive(page);
  await expect(page.locator(".room-marker")).toHaveText("Arrival gallery");
  await page.keyboard.down("Shift");
  await page.keyboard.down("w");
  try {
    await expect(page.locator(".room-marker")).toHaveText("Station commons", { timeout: 15000 });
  } finally {
    await page.keyboard.up("w");
    await page.keyboard.up("Shift");
  }
  await expect(page.locator(".tandem-caption")).toHaveAttribute("data-line", "commons", { timeout: 20000 });
  // Finish the first reply before saving; the rest of the conversation resumes after reload.
  await expect(page.locator(".tandem-caption")).toHaveAttribute("data-line", "commons--2", { timeout: 20000 });
  await expect(page.getByRole("button", { name: "Use circuit bench" })).toHaveCount(0);
  await expect(page.locator(".circuit-lab")).toHaveCount(0);
  await expect.poll(async () => (await position(page)).z).toBeGreaterThan(39);
  await page.keyboard.press("m");
  await expect(page.getByRole("img", { name: /Space station map.*Station commons/ })).toBeVisible();
  await expect(page.locator(".map-lab-label")).toHaveText(["Kinematics", "Electromagnetism", "Waves & optics"]);
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
  expect(saved.proofs.filter(Boolean)).toHaveLength(6);
  expect(saved.rooms).toHaveLength(6);
  await page.keyboard.press("Escape");
  const before = await position(page);
  await page.reload();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator(".room-marker")).toHaveText("Station commons");
  expect((await position(page)).z).toBeCloseTo(before.z, 1);
  await expect(page.locator('.tandem-caption[data-line="commons"]')).toHaveCount(0);
});

test("a saved position in the public station cannot bypass the final circuit", async ({ page }) => {
  await arrive(page, 5);
  await expect(page.locator(".room-marker")).toContainText("Wake");
  await expect.poll(async () => (await position(page)).z).toBeLessThan(25);
});

test("all public galleries connect, dormant bays stay closed, and observation glass opens onto space", async ({ page }) => {
  await page.goto("/tests/browser/fixture.html");
  const result = await page.evaluate(async () => {
    const threeUrl = "/node_modules/.vite/deps/three.js";
    const shipUrl = "/src/scene/spaceship.ts";
    const navUrl = "/src/scene/navigation.ts";
    const chambersUrl = "/src/chambers.ts";
    const stationUrl = "/src/scene/stationLayout.ts";
    const artUrl = "/src/scene/art.ts";
    const THREE = await import(threeUrl);
    const { buildSpaceship } = await import(shipUrl);
    const { canWalk, movePlayer, focusedSite } = await import(navUrl);
    const { CHAMBERS } = await import(chambersUrl);
    const { FUTURE_LABS } = await import(stationUrl);
    const { disposeScene } = await import(artUrl);
    const scene = new THREE.Scene();
    const model = buildSpaceship(scene);
    const complete = CHAMBERS.map((c: { id: string }) => c.id);
    let player = { x: 10, z: 31, yaw: 0, pitch: 0 };
    const path = [
      [10, 44], [10, 67], [-5, 61], [-16, 61], [-17, 71], [-18, 71],
      [-18, 51], [-16, 51], [-16, 58], [-5, 58],
      [-5, 75], [10, 75], [10, 85], [4, 89], [4, 84], [26, 76],
      [33, 74], [37, 70], [33, 60], [37, 60], [33, 50], [37, 50],
      [26, 46], [10, 46], [10, 31],
    ];
    for (const [x, z] of path) {
      for (let step = 0; step < 2000; step++) {
        const dx = x - player.x, dz = z - player.z, distance = Math.hypot(dx, dz);
        if (distance < 0.02) break;
        if (step === 1999) throw new Error(`Blocked at ${player.x}, ${player.z} going to ${x}, ${z}`);
        const dt = Math.min(1 / 60, distance / 3.5);
        model.update(dt, 0, player, complete, true, true);
        player = movePlayer(player, dx / distance, -dz / distance, dt, false, model.obstacles);
      }
      if (focusedSite(player, model.obstacles)) throw new Error("Unexpected lesson in the station");
    }
    const bayBlocked = FUTURE_LABS.every((lab: { x: number; z: number }) =>
      !canWalk(lab.x - 0.6, lab.z, model.obstacles));
    model.root.updateMatrixWorld(true);
    const windows: { blocked: boolean; canEscape: boolean }[] = [];
    model.root.traverse((object: import("three").Object3D) => {
      if (object.name !== "station viewport") return;
      const center = object.getWorldPosition(new THREE.Vector3());
      const inward = new THREE.Vector3(0, 0, 1).transformDirection(object.matrixWorld);
      const ray = new THREE.Raycaster(center.clone().addScaledVector(inward, 1.2), inward.clone().negate(), 0, 2.4);
      const blocking = ray.intersectObject(model.root, true).filter((hit: import("three").Intersection) => {
        const m = (hit.object as import("three").Mesh).material;
        return !Array.isArray(m) && !m.transparent;
      });
      const outside = center.clone().addScaledVector(inward, -0.5);
      windows.push({ blocked: !!blocking.length, canEscape: canWalk(outside.x, outside.z, model.obstacles) });
    });
    model.dispose();
    disposeScene(scene);
    return { bayBlocked, legs: path.length, windows, player };
  });
  expect(result.legs).toBeGreaterThan(20);
  expect(result.bayBlocked).toBe(true);
  expect(result.windows.length).toBeGreaterThan(25);
  expect(result.windows.filter((w) => w.blocked || w.canEscape)).toEqual([]);
  expect(result.player.z).toBeCloseTo(31, 1);
});
