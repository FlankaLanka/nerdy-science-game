import test from "node:test";
import assert from "node:assert/strict";
import { chartPoint, COASTLINE, CHART } from "../src/cartography.ts";
import { terrainHeight, SITES } from "../src/scene/navigation.ts";
import { WATER_LEVEL } from "../src/scene/islandLayout.ts";
import { TRAILS, distanceToTrail } from "../src/scene/trails.ts";

test("the chart's coastline meets the actual world waterline", () => {
  assert.equal(COASTLINE.length, 240);
  for (const [x, z] of COASTLINE)
    assert.ok(Math.abs(terrainHeight(x, z) - WATER_LEVEL) < 0.0001);
  for (const site of Object.values(SITES))
    assert.ok(terrainHeight(site.x, site.z) > WATER_LEVEL);
});
test("the chart preserves north, east, distance and landmark coordinates", () => {
  const origin = chartPoint(0, 0),
    east = chartPoint(10, 0),
    north = chartPoint(0, -10);
  assert.ok(Math.abs(east[0] - origin[0] - 10 * CHART.scale) < 1e-9);
  assert.ok(Math.abs(origin[1] - north[1] - 10 * CHART.scale) < 1e-9);
  assert.ok(
    chartPoint(SITES.workshop.x, SITES.workshop.z)[0] <
      chartPoint(SITES.harbor.x, SITES.harbor.z)[0],
  );
  assert.ok(
    chartPoint(SITES.beacon.x, SITES.beacon.z)[1] <
      chartPoint(SITES.workshop.x, SITES.workshop.z)[1],
  );
});
test("the surveyed paths reach the three physical interaction zones", () => {
  for (const [i, id] of ["workshop", "harbor", "beacon"].entries()) {
    const site = SITES[id as keyof typeof SITES],
      end = TRAILS[i].at(-1)!;
    assert.ok(Math.hypot(end.x - site.x, end.z - site.z) < 2.9);
  }
  assert.ok(distanceToTrail(-3, 15) < 0.001);
  assert.ok(distanceToTrail(-20, 10) > 2);
});
