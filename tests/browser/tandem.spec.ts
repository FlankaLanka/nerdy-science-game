import { test, expect } from "@playwright/test";
import { begin, bench, connect, hold } from "./helpers";

test("Tandem introduces itself, offers graduated help, and responds to a real repair", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await begin(page);
  await expect(page.locator(".world canvas")).toHaveAttribute(
    "data-tandem",
    "present",
  );
  await expect(page.locator(".tandem-caption")).toContainText("I'm Tandem");
  await page.screenshot({ path: "artifacts/tandem/wake-world.png" });
  await bench(page);
  await page.getByRole("button", { name: "Ask Tandem for a hint" }).click();
  await expect(page.locator(".tandem-caption")).toHaveAttribute(
    "data-line",
    "wake-hint-0",
  );
  await page.keyboard.press("t");
  await expect(page.locator(".tandem-caption")).toHaveAttribute(
    "data-line",
    "wake-hint-1",
  );
  await page.screenshot({ path: "artifacts/tandem/wake-bench.png" });
  await connect(page, "Battery negative", "Bulb contact B");
  await expect(page.locator(".tandem-caption")).toHaveAttribute(
    "data-line",
    "wake-restored",
  );
  await page.waitForTimeout(2200);
  await expect(page.locator(".world canvas")).toHaveAttribute(
    "data-camera-mode",
    "walk",
  );
  await page.screenshot({ path: "artifacts/tandem/wake-restored.png" });
  await bench(page);
  await expect(page.locator(".world canvas")).toHaveAttribute(
    "data-tandem-motion",
    "settled",
    { timeout: 10000 },
  );
  expect(errors).toEqual([]);
});
test("a physical conversation can be requested without entering a puzzle", async ({
  page,
}) => {
  await begin(page, 0, { x: -12.25, z: 22, yaw: 0, pitch: 0 });
  await expect(
    page.getByRole("button", { name: "Talk to Tandem" }),
  ).toBeVisible();
  await page.keyboard.press("e");
  await expect(page.locator(".tandem-caption")).toHaveAttribute(
    "data-line",
    "wake-story",
  );
  await page.screenshot({ path: "artifacts/tandem/conversation.png" });
  await expect(page.locator(".kit-board")).not.toBeVisible();
  await expect(page.locator(".tandem-caption")).toContainText("You'd like an explanation");
  // One E request keeps speaking, without another button press.
  await expect(page.locator(".tandem-caption")).toHaveAttribute("data-line", "wake-story--2", { timeout: 20000 });
  for (const line of ["wake-story--3", "wake-story--4", "wake-story--5"]) {
    await page.keyboard.press("e");
    await expect(page.locator(".tandem-caption")).toHaveAttribute("data-line", line);
  }
  await page.keyboard.press("e");
  await expect(page.locator(".tandem-caption")).toHaveCount(0);
  for (const scene of ["wake-hint-0", "wake-hint-1"]) {
    await page.keyboard.press("e");
    await expect(page.locator(".tandem-caption")).toHaveAttribute("data-line", scene);
    await page.keyboard.press("e");
    await expect(page.locator(".tandem-caption")).toHaveAttribute("data-line", `${scene}--2`);
    await page.keyboard.press("e");
  }
  // Walking to the bench keeps the hint progression from the E conversation.
  await hold(page, "d", 560);
  await hold(page, "w", 180);
  await bench(page);
  await page.keyboard.press("t");
  await expect(page.locator(".tandem-caption")).toHaveAttribute("data-line", "wake-hint-2");
});
test("requested fault help does not skip the next hint", async ({ page }) => {
  await begin(page, 3);
  await bench(page, 3);
  await connect(page, "Battery negative", "Bulb contact B");
  for (let i = 0; i < 2; i++) {
    await page.keyboard.press("t");
    await expect(page.locator(".tandem-caption")).toHaveAttribute("data-line", "overload");
  }
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.keyboard.press("t");
  await expect(page.locator(".tandem-caption")).toHaveAttribute("data-line", "resist-hint-0");
});
test("mobile bench keeps hints readable and controls available", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await begin(page, 3);
  await bench(page, 3);
  await page.getByRole("button", { name: "Ask Tandem for a hint" }).click();
  await expect(page.locator(".tandem-caption")).toHaveAttribute(
    "data-line",
    "resist-hint-0",
  );
  await page.screenshot({ path: "artifacts/tandem/mobile-bench.png" });
  const caption = (await page.locator(".tandem-caption").boundingBox())!;
  expect(caption.x).toBeGreaterThanOrEqual(0);
  expect(caption.x + caption.width).toBeLessThanOrEqual(390);
});

test("captions keep contacts clear on compact portrait and landscape screens", async ({
  page,
}) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await begin(page, 3);
    await bench(page, 3);
    await page.getByRole("button", { name: "Ask Tandem for a hint" }).click();
    await page.keyboard.press("t");
    await page.keyboard.press("t");
    const caption = (await page.locator(".tandem-caption").boundingBox())!;
    for (const terminal of await page.locator(".terminal").all()) {
      const box = (await terminal.boundingBox())!;
      const overlap =
        Math.min(caption.x + caption.width, box.x + box.width) -
          Math.max(caption.x, box.x) >
          0 &&
        Math.min(caption.y + caption.height, box.y + box.height) -
          Math.max(caption.y, box.y) >
          0;
      expect(overlap).toBe(false);
    }
    await page.screenshot({
      path: `artifacts/tandem/compact-${viewport.width}.png`,
    });
  }
});

test("Tandem travels through every powered gate without clipping architecture", async ({
  page,
}) => {
  await page.goto("/tests/browser/fixture.html");
  const result = await page.evaluate(async () => {
    const u = "/src/scene/tandem.ts",
      s = "/src/scene/spaceship.ts",
      t = "/node_modules/.vite/deps/three.js",
      c = "/src/chambers.ts",
      n = "/src/scene/navigation.ts";
    const { buildTandem } = (await import(
      u
    )) as typeof import("../../src/scene/tandem");
    const { buildSpaceship } = (await import(
      s
    )) as typeof import("../../src/scene/spaceship");
    const { CHAMBERS } = (await import(
      c
    )) as typeof import("../../src/chambers");
    const { canWalk } = (await import(
      n
    )) as typeof import("../../src/scene/navigation");
    const THREE = (await import(t)) as typeof import("three");
    const scene = new THREE.Scene(),
      ship = buildSpaceship(scene),
      guide = buildTandem(scene);
    const powered = CHAMBERS.map((c) => c.id),
      failures: string[] = [];
    let player = { x: -10, z: 21.5, yaw: 0, pitch: 0 };
    ship.update(0, 0, player, powered, true, true);
    guide.update(
      1 / 60,
      player,
      ship.obstacles,
      powered,
      0,
      false,
      false,
      true,
      "listen",
    );
    for (let index = 1; index < 6; index++) {
      const bench = CHAMBERS[index].bench;
      player = { x: bench.x, z: bench.z + 2.5, yaw: 0, pitch: 0 };
      for (let frame = 0; frame < 1500; frame++) {
        const before = guide.position();
        guide.update(
          1 / 60,
          player,
          ship.obstacles,
          powered,
          index,
          false,
          false,
          true,
          "point",
        );
        const p = guide.position();
        if (!canWalk(p.x, p.z, ship.obstacles)) {
          failures.push(`collision ${index}`);
          break;
        }
        if (Math.hypot(p.x - before.x, p.z - before.z) > 0.08) {
          failures.push(`teleport ${index}`);
          break;
        }
        ship.update(
          1 / 60,
          frame / 60,
          player,
          powered,
          true,
          true,
          undefined,
          false,
          index,
          null,
          false,
          p,
        );
        if (Math.hypot(p.x - (bench.x - 2.25), p.z - (bench.z + 0.5)) < 0.2)
          break;
      }
      const p = guide.position();
      if (Math.hypot(p.x - (bench.x - 2.25), p.z - (bench.z + 0.5)) > 0.25)
        failures.push(`missed bench ${index} at ${p.x},${p.z}`);
    }
    for (const destination of [
      { x: 10, z: 43 },
      { x: -16, z: 61 },
      { x: 34, z: 60 },
      { x: 10, z: 87 },
    ]) {
      player = { ...destination, yaw: 0, pitch: 0 };
      for (let frame = 0; frame < 2000; frame++) {
        guide.update(
          1 / 60,
          player,
          ship.obstacles,
          powered,
          null,
          false,
          false,
          true,
          "listen",
        );
        const p = guide.position();
        if (!canWalk(p.x, p.z, ship.obstacles)) {
          failures.push("station collision");
          break;
        }
        ship.update(
          1 / 60,
          frame / 60,
          player,
          powered,
          true,
          true,
          undefined,
          false,
          null,
          null,
          false,
          p,
        );
        if (Math.hypot(p.x - player.x, p.z - player.z) < 3) break;
      }
      if (
        Math.hypot(
          guide.position().x - player.x,
          guide.position().z - player.z,
        ) > 3.1
      )
        failures.push(`missed gallery ${destination.x},${destination.z}`);
    }
    return failures;
  });
  expect(result).toEqual([]);
});

test("all authored voice assets decode and speech pauses with the menu", async ({
  page,
}) => {
  await page.goto("/tests/browser/fixture.html");
  const voices = await page.evaluate(async () => {
    const u = "/src/tandemDialogue.ts";
    const { TANDEM_LINES } = (await import(
      u
    )) as typeof import("../../src/tandemDialogue");
    const context = new OfflineAudioContext(1, 44100, 44100);
    const failures: string[] = [];
    for (const key of Object.keys(TANDEM_LINES)) {
      try {
        const response = await fetch(
          `/audio/tandem/${encodeURIComponent(key)}.mp3`,
        );
        const buffer = await context.decodeAudioData(
          await response.arrayBuffer(),
        );
        if (!response.ok || buffer.duration < 1 || buffer.duration > 20)
          failures.push(key);
      } catch {
        failures.push(key);
      }
    }
    return failures;
  });
  expect(voices).toEqual([]);
  await page.addInitScript(() => {
    const Native = window.Audio;
    window.Audio = class extends Native {
      constructor(src?: string) {
        super(src);
        if (src?.includes("/tandem/"))
          (window as unknown as { tandemVoice: HTMLAudioElement }).tandemVoice =
            this;
      }
    };
  });
  await begin(page);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { tandemVoice: HTMLAudioElement }).tandemVoice
            ?.currentTime ?? 0,
      ),
    )
    .toBeGreaterThan(0.1);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { tandemVoice: HTMLAudioElement }).tandemVoice
          .paused,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { tandemVoice: HTMLAudioElement }).tandemVoice
            .paused,
      ),
    )
    .toBe(false);
});
