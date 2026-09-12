import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { begin } from "./helpers";
import { SAVE_KEY } from "../../src/campaign.ts";
import { PLAYER_KEY } from "../../src/scene/navigation.ts";
import { campaignFixtures } from "../fixtures.ts";
import { activity } from "../../src/activities.ts";
import type { LabId } from "../../src/activities.ts";
import type { Page } from "@playwright/test";
async function openLab(page: Page, id: LabId, done = false) {
  const a = activity(id);
  const state = campaignFixtures().complete;
  if (!done)
    state.completed = state.completed.filter((x) => x !== id && x !== "beacon");
  await page.addInitScript(
    ({ state, key, pose, pk }) => {
      localStorage.setItem(key, JSON.stringify(state));
      localStorage.setItem(pk, JSON.stringify(pose));
    },
    {
      state,
      key: SAVE_KEY,
      pk: PLAYER_KEY,
      pose: { x: a.x, z: a.z + 2.3, yaw: 0, pitch: 0 },
    },
  );
  await begin(page);
  await page.keyboard.press("e");
  await expect(
    page.getByRole("dialog", { name: `${a.name} instruments` }),
  ).toBeVisible();
}
for (const id of ["ohm", "power", "junction", "storage", "timing"] as LabId[])
  test(`${id}: controls, graphs and guidance fit without overlap and pass accessible UI checks`, async ({
    page,
  }) => {
    await openLab(page, id);
    const bounds = await page.evaluate(() => {
      const r = (q: string) => {
        const b = document.querySelector(q)!.getBoundingClientRect();
        return { top: b.top, bottom: b.bottom, left: b.left, right: b.right };
      };
      return {
        scope: r(".scope"),
        guide: r(".lab-narration"),
        footer: r(".lab-footer"),
        header: r(".lab-location"),
        close: r("dialog[open] .dialog-close"),
        controls: r(".lab-controls"),
      };
    });
    expect(bounds.scope.bottom).toBeLessThanOrEqual(bounds.guide.top);
    expect(bounds.guide.bottom).toBeLessThan(bounds.footer.top);
    expect(bounds.header.right).toBeLessThan(bounds.close.left);
    expect(bounds.controls.bottom).toBeLessThan(bounds.footer.top);
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      audit.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
  });
test("RC playback pauses with the panel closed and supports explicit stepping and resume", async ({
  page,
}) => {
  await openLab(page, "timing");
  await page
    .getByRole("button", { name: "Reset equipment", exact: true })
    .click();
  await page.getByRole("button", { name: "Charge", exact: true }).click();
  await page.waitForTimeout(350);
  await page.keyboard.press("Escape");
  const read = () =>
    page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).labs.timing.rc.time,
      SAVE_KEY,
    );
  const t = await read();
  expect(t).toBeGreaterThan(0);
  await page.waitForTimeout(400);
  expect(await read()).toBe(t);
  await page.keyboard.press("e");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const t2 = await read();
  await page.waitForTimeout(250);
  expect(await read()).toBe(t2);
  await page.getByRole("button", { name: "+1 s", exact: true }).click();
  expect(await read()).toBeCloseTo(t2 + 1, 5);
});
test("practice changes do not overwrite commissioned records or lose progress on reload", async ({
  page,
}) => {
  await openLab(page, "storage", true);
  const before = await page.evaluate(
    (key) => localStorage.getItem(key),
    SAVE_KEY,
  );
  await page.getByRole("button", { name: "Single", exact: true }).click();
  await page
    .getByRole("button", { name: "Test & record", exact: true })
    .click();
  await page.keyboard.press("Escape");
  const after = await page.evaluate(
    (key) => localStorage.getItem(key),
    SAVE_KEY,
  );
  expect(after).toBe(before);
});
