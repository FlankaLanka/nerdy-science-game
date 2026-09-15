import { test, expect } from "@playwright/test";
import { hold, position, saved } from "./helpers";
import { PLAYER_KEY, SPAWN } from "../../src/scene/navigation.ts";

test("god mode bypasses a locked door, survives refresh, and leaves lessons untouched", async ({ page }) => {
  await page.goto("/tests/browser/fixture.html");
  await page.evaluate((key) => {
    localStorage.setItem(key, JSON.stringify({ x: -10, z: 15.4, yaw: 0, pitch: 0 }));
  }, PLAYER_KEY);
  await page.goto("/");
  await page.getByRole("button", { name: "Begin", exact: true }).click();
  const circuits = (await saved(page)).rooms;
  await hold(page, "w", 900);
  await page.keyboard.press("Escape");
  expect((await position(page)).z).toBeGreaterThan(13.3);
  const toggle = page.getByRole("button", { name: "God mode (dev)", exact: true });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.focus();
  await page.keyboard.press("ArrowRight");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("God mode enabled")).toBeVisible();
  await hold(page, "w", 1400);
  await expect(page.locator(".hud-room-name")).toHaveText("Contact");
  await page.keyboard.press("Escape");
  const crossed = await position(page);
  expect(crossed.z).toBeLessThan(11);
  expect((await saved(page)).rooms).toEqual(circuits);
  expect((await saved(page)).proofs.every((proof: unknown) => proof === null)).toBe(true);

  await page.reload();
  await page.getByRole("button", { name: /^(Begin|Continue)$/ }).click();
  await expect(page.getByLabel("God mode enabled")).toBeVisible();
  await expect(page.locator(".hud-room-name")).toHaveText("Contact");
  await page.keyboard.press("Escape");
  expect(await position(page)).toEqual(crossed);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("God mode enabled")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: /^(Begin|Continue)$/ }).click();
  await page.keyboard.press("Escape");
  expect(await position(page)).toEqual(SPAWN);
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await page.getByRole("button", { name: "New run", exact: true }).click();
  await page.getByRole("button", { name: "Start new run", exact: true }).click();
  await page.getByRole("button", { name: "Begin", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
});

test("all six gates open both ways in god mode and safely relock with normal collisions", async ({ page }) => {
  await page.goto("/tests/browser/fixture.html");
  const failures = await page.evaluate(async () => {
    const threeUrl = "/node_modules/.vite/deps/three.js", shipUrl = "/src/scene/spaceship.ts";
    const layoutUrl = "/src/scene/shipLayout.ts", navUrl = "/src/scene/navigation.ts", artUrl = "/src/scene/art.ts";
    const THREE = await import(threeUrl);
    const { buildSpaceship } = await import(shipUrl);
    const { PORTALS, FURNITURE } = await import(layoutUrl);
    const { canWalk, movePlayer } = await import(navUrl);
    const { disposeScene } = await import(artUrl);
    const scene = new THREE.Scene(), model = buildSpaceship(scene);
    const failures: string[] = [];
    try {
      for (const reduced of [false, true]) {
        for (const gate of PORTALS) {
          const normalX = Math.sin(gate.rotation), normalZ = Math.cos(gate.rotation);
          let player = { x: gate.x + normalX * 2.4, z: gate.z + normalZ * 2.4, yaw: gate.rotation, pitch: 0 };
          const update = (enabled: boolean) => model.update(1 / 60, 0, player, [], reduced, true, undefined, false, null, null, enabled);
          const side = () => (player.x - gate.x) * normalX + (player.z - gate.z) * normalZ;
          const walk = (enabled: boolean) => {
            for (let frame = 0; frame < 90; frame++) {
              update(enabled);
              player = movePlayer(player, 0, 1, 1 / 60, false, model.obstacles);
            }
          };
          for (let frame = 0; frame < 90; frame++) update(false);
          walk(false);
          if (side() < 0.3) failures.push(`${gate.system}: ordinary lock failed`);
          walk(true);
          if (side() > -2) failures.push(`${gate.system}: forward crossing failed`);
          player.yaw += Math.PI;
          walk(true);
          if (side() < 0.3) failures.push(`${gate.system}: return crossing failed`);
          player.x = gate.x; player.z = gate.z;
          update(false);
          if (!canWalk(player.x, player.z, model.obstacles)) failures.push(`${gate.system}: closed on player`);
          player.x += normalX * 2.4; player.z += normalZ * 2.4;
          for (let frame = 0; frame < 90; frame++) update(false);
          if (canWalk(gate.x, gate.z, model.obstacles)) failures.push(`${gate.system}: did not relock`);
          update(true);
          if (FURNITURE.some((f: { x: number; z: number }) => canWalk(f.x, f.z, model.obstacles)) || canWalk(-40, 60, model.obstacles))
            failures.push(`${gate.system}: lost solid collisions`);
        }
      }
    } finally {
      model.dispose();
      disposeScene(scene);
    }
    return failures;
  });
  expect(failures).toEqual([]);
});
