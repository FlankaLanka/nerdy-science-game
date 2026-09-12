import { test, expect } from "@playwright/test";
import { begin, hold } from "./helpers";

test("the chart locates the actual player and physical repair stations", async ({
  page,
}) => {
  await begin(page);
  await hold(page, "w", 450);
  await hold(page, "ArrowRight", 250);
  await page.keyboard.press("m");
  await expect(
    page.getByRole("dialog", { name: "Island map", exact: true }),
  ).toBeVisible();
  const player = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("signal.lighthouse.player.v1")!),
  );
  await expect(page.locator(".chart-player")).toHaveAttribute(
    "data-world-x",
    String(player.x),
  );
  await expect(page.locator(".chart-player")).toHaveAttribute(
    "data-world-z",
    String(player.z),
  );
  await expect(page.locator(".chart-player path")).toHaveAttribute(
    "transform",
    `rotate(${(-player.yaw * 180) / Math.PI})`,
  );
  await expect(page.locator('.chart-stop[data-site="harbor"]')).toHaveAttribute(
    "data-world-x",
    "21",
  );
  await expect(page.locator('.chart-stop[data-site="beacon"]')).toHaveAttribute(
    "data-world-z",
    "-16.3",
  );
  await expect(page.locator('.map-stops [aria-current="step"]')).toContainText(
    "Keeper’s workshop",
  );
  await expect(page.locator(".paper-map img")).toHaveCount(0);
  const bounds = await page.evaluate(() => ({
    chart: document.querySelector(".island-chart")!.getBoundingClientRect()
      .bottom,
    back: document
      .querySelector("dialog[open] .dialog-close")!
      .getBoundingClientRect().top,
  }));
  expect(bounds.chart).toBeLessThan(bounds.back - 4);
});

test("the destination stays attached to the world on every turning frame", async ({
  page,
}) => {
  await begin(page);
  const marker = page.locator(".world-waypoint");
  await expect(marker.locator("i")).toBeVisible();
  await page.keyboard.down("ArrowRight");
  const samples = await page.evaluate(async () => {
    const positions: string[] = [];
    await new Promise<void>((resolve) => {
      let count = 0;
      const frame = () => {
        const marker = document.querySelector<HTMLElement>(".world-waypoint")!;
        if (marker.style.visibility === "visible")
          positions.push(marker.style.transform);
        if (++count === 24) resolve();
        else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    return positions;
  });
  await page.keyboard.up("ArrowRight");
  expect(samples.length).toBeGreaterThan(15);
  expect(new Set(samples).size / samples.length).toBeGreaterThan(0.8);
  await page.keyboard.press("Tab");
  await expect(marker).not.toBeVisible();
});
