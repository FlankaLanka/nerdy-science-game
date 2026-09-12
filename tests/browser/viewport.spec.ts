import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { begin, connect } from "./helpers";

async function checkFrame(page: Page) {
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const box = document
          .querySelector(".game-stage")!
          .getBoundingClientRect();
        const scale = Math.min(innerWidth / 1280, innerHeight / 720);
        return Math.max(
          Math.abs(box.width - 1280 * scale),
          Math.abs(box.height - 720 * scale),
        );
      });
    })
    .toBeLessThan(1);
  const problems = await page.evaluate(() => {
    const issues: string[] = [];
    const stage = document
      .querySelector(".game-stage")!
      .getBoundingClientRect();
    const dialog = document.querySelector("dialog[open]");
    const root = dialog ?? document.querySelector(".game-stage")!;
    if (
      document.documentElement.scrollWidth > innerWidth ||
      document.documentElement.scrollHeight > innerHeight
    )
      issues.push("document overflows");
    if (
      stage.x < -1 ||
      stage.y < -1 ||
      stage.right > innerWidth + 1 ||
      stage.bottom > innerHeight + 1
    )
      issues.push("stage exceeds viewport");
    if (dialog) {
      const box = dialog.getBoundingClientRect();
      if (
        [
          box.x - stage.x,
          box.y - stage.y,
          box.width - stage.width,
          box.height - stage.height,
        ].some((n) => Math.abs(n) > 1)
      )
        issues.push("menu and world frames differ");
      const control = [
        ...dialog.querySelectorAll<HTMLButtonElement>("button:not([disabled])"),
      ].find(
        (button) =>
          button.getClientRects().length &&
          button.getBoundingClientRect().width > 0,
      );
      if (control) {
        const bounds = control.getBoundingClientRect();
        const hit = document.elementFromPoint(
          bounds.x + bounds.width / 2,
          bounds.y + bounds.height / 2,
        );
        if (!hit || !dialog.contains(hit))
          issues.push("menu controls are covered");
      }
    }
    for (const element of root.querySelectorAll<HTMLElement>("*")) {
      if (
        !element.getClientRects().length ||
        element.classList.contains("sr-only")
      )
        continue;
      const style = getComputedStyle(element);
      if (style.visibility === "hidden" || style.display === "none") continue;
      if (
        (/auto|scroll/.test(style.overflowY) &&
          element.scrollHeight > element.clientHeight + 1) ||
        (/auto|scroll/.test(style.overflowX) &&
          element.scrollWidth > element.clientWidth + 1)
      )
        issues.push(`scrolling ${element.className}`);
      if (!element.matches("button, input, h1, h2, h3, legend, p")) continue;
      const box = element.getBoundingClientRect();
      if (
        box.x < stage.x - 1 ||
        box.y < stage.y - 1 ||
        box.right > stage.right + 1 ||
        box.bottom > stage.bottom + 1
      )
        issues.push(
          `clipped ${element.getAttribute("aria-label") ?? element.textContent?.slice(0, 60)}`,
        );
    }
    return issues;
  });
  expect(problems).toEqual([]);
}

test("world, menus and repair steps share a 16:9 frame with no scrolling", async ({
  page,
}) => {
  await begin(page, true);
  await page.keyboard.press("Tab");
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1600, height: 1000 },
    { width: 1920, height: 800 },
    { width: 960, height: 540 },
  ]) {
    await page.setViewportSize(viewport);
    await checkFrame(page);
  }
  await page.setViewportSize({ width: 1600, height: 900 });
  for (const name of [
    /^Deck map/,
    /^Mission log/,
    /^Settings$/,
    /^Controls$/,
  ]) {
    await page.getByRole("button", { name }).click();
    await checkFrame(page);

    await page.keyboard.press("Escape");
  }
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.keyboard.press("e");
  await page.locator(".circuit-board.with-depth").waitFor();
  await checkFrame(page);
  await connect(page, "Lamp A right", "Bridge left");
  await checkFrame(page);
  await page.getByRole("button", { name: "Copper", exact: true }).click();
  await checkFrame(page);
  await page.getByRole("button", { name: "Light up", exact: true }).click();
  await page.getByRole("button", { name: "Test circuit", exact: true }).click();
  await page
    .getByRole("button", {
      name: "A connection to the positive terminal only",
      exact: true,
    })
    .click();
  await checkFrame(page);
});

test("fullscreen works from the title, the F key and the pause menu", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".title-fullscreen").click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await checkFrame(page);
  await page.locator(".title-fullscreen").click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(false);
  await begin(page);
  await page.keyboard.press("f");
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await page.keyboard.press("Tab");
  await checkFrame(page);
  await page.getByRole("button", { name: /^Exit fullscreen/ }).click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(false);
  await expect(
    page.getByRole("dialog", { name: "Paused", exact: true }),
  ).toBeVisible();
  // Enter fullscreen with an existing dialog: it must stay above the new
  // fullscreen top-layer entry and continue receiving clicks.
  await page.keyboard.press("f");
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await checkFrame(page);
  await page.getByRole("button", { name: /^Exit fullscreen/ }).click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(false);
  await page.getByRole("button", { name: /^Mission log/ }).click();
  await page.getByRole("textbox", { name: "A note to yourself" }).press("f");
  expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  await expect(
    page.getByRole("textbox", { name: "A note to yourself" }),
  ).toHaveValue("f");
});

test("console fonts and circuit shaders are prepared before entry and its renderer survives reopening", async ({
  page,
}) => {
  let release = () => {};
  let requested = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const arrival = new Promise<void>((resolve) => {
    requested = resolve;
  });
  await page.route("**/*space-grotesk*500*.woff2", async (route) => {
    requested();
    await gate;
    await route.continue();
  });
  await page.addInitScript(() =>
    localStorage.setItem(
      "signal.dead-orbit.player.v1",
      JSON.stringify({ x: -4, z: 13.5, yaw: 0, pitch: 0 }),
    ),
  );
  await page.goto("/");
  await arrival;
  await expect(page.locator(".title-play")).toBeDisabled();
  release();
  await page
    .getByRole("button", { name: "Board the Asterion", exact: true })
    .click();
  const canvas = await page.locator(".bench-scene canvas").elementHandle();
  expect(canvas).not.toBeNull();
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("e");
    await expect(
      page.getByRole("dialog", {
        name: "Engineering circuit",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".circuit-board")).toHaveClass(/with-depth/);
    await expect(page.locator(".circuit-board")).not.toHaveClass(
      /is-preparing/,
    );
    await expect(page.locator(".flat-board").first()).not.toBeVisible();
    await checkFrame(page);
    await page.keyboard.press("Escape");
    expect(await canvas!.evaluate((element) => element.isConnected)).toBe(true);
  }
  const builds = await page.evaluate(
    () => performance.getEntriesByName("signal-kit-build").length,
  );
  expect(builds).toBe(1);
});
