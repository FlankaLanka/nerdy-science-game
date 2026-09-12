import { test, expect } from "@playwright/test";
import { begin, workshopRepair } from "./helpers";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 320, height: 568 },
]) {
  test.describe(`${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, isMobile: true, hasTouch: true });
    test("touch movement, proximity interaction and the guided repair remain reachable", async ({
      page,
    }) => {
      test.setTimeout(90000);
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await begin(page);
      const touch = await page.context().newCDPSession(page);
      const look = { x: viewport.width * 0.75, y: viewport.height * 0.48 };
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [look],
      });
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: look.x + 55, y: look.y }],
      });
      await expect(page.locator(".compass")).not.toHaveAttribute(
        "aria-label",
        "Facing 0 degrees",
      );
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [look],
      });
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      const joystick = page.getByRole("group", {
        name: "Movement joystick",
        exact: true,
      });
      await expect(joystick).toBeVisible();
      const box = (await joystick.boundingBox())!;
      const center = {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
      };
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [center],
      });
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: center.x, y: center.y - box.width * (38 / 140) }],
      });
      const prompt = page.getByRole("button", {
        name: "Repair Engineering",
        exact: true,
      });
      await prompt.waitFor();
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await prompt.tap();
      await page
        .getByRole("dialog", { name: "Engineering circuit", exact: true })
        .waitFor();
      await page.locator(".circuit-board.with-depth").waitFor();
      await workshopRepair(page);
      await page.getByRole("button", { name: "Pause game", exact: true }).tap();
      await page.getByRole("button", { name: /^Deck map/ }).tap();
      await expect(
        page.locator('.activity-map-list .tracked'),
      ).toContainText("Materials workshop");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(errors).toEqual([]);
    });
  });
}
