import { test, expect } from "@playwright/test";

test("surface audit distinguishes overlapping interiors from seams and occluded faces", async ({ page }) => {
  await page.goto("/tests/browser/fixture.html");
  const result = await page.evaluate(async () => {
    const threeUrl = "/node_modules/.vite/deps/three.js";
    const auditUrl = "/tests/browser/surface-audit.js";
    const THREE = await import(threeUrl);
    const { scanSurfaces, visibleConflicts } = await import(auditUrl);
    const root = new THREE.Group();
    const material = new THREE.MeshBasicMaterial();
    const a = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    const b = a.clone();
    b.position.x = 0.5;
    root.add(a, b);
    const overlap = scanSurfaces(root).candidates;
    const visible = visibleConflicts(root, overlap, [[0, 0, 2]]).length;
    const cover = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), material);
    cover.position.z = 0.1;
    root.add(cover);
    root.updateMatrixWorld(true);
    const hidden = visibleConflicts(root, overlap, [[0, 0, 2]]).length;
    cover.removeFromParent();
    b.position.x = 2;
    const seam = scanSurfaces(root).candidates.length;
    b.position.x = 0.5;
    b.position.z = 0.002;
    const separated = scanSurfaces(root).candidates.length;
    // Instance transforms must participate in the test, not just matrixWorld.
    const instances = new THREE.InstancedMesh(a.geometry, material, 2);
    instances.setMatrixAt(0, new THREE.Matrix4());
    instances.setMatrixAt(1, new THREE.Matrix4().makeTranslation(0.5, 0, 0));
    const instanced = scanSurfaces(instances).candidates.length;
    return { overlap: overlap.length, visible, hidden, seam, separated, instanced };
  });
  expect(result.overlap).toBeGreaterThan(0);
  expect(result.visible).toBeGreaterThan(0);
  expect(result.instanced).toBeGreaterThan(0);
  expect(result.hidden).toBe(0);
  expect(result.seam).toBe(0);
  expect(result.separated).toBe(0);
});

test("circuit kit surfaces stay separated in starter, solved and open-switch states", async ({ page }) => {
  await page.goto("/tests/browser/fixture.html");
  const failures = await page.evaluate(async () => {
    const kitUrl = "/src/scene/kitArt.ts";
    const viewUrl = "/src/scene/benchView.ts";
    const chambersUrl = "/src/chambers.ts";
    const circuitUrl = "/src/circuitKit.ts";
    const fixtureUrl = "/tests/chamber-fixtures.ts";
    const auditUrl = "/tests/browser/surface-audit.js";
    const { buildKit } = await import(kitUrl);
    const { KIT_SCALE, BENCH_HEIGHT } = await import(viewUrl);
    const { CHAMBERS } = await import(chambersUrl);
    const { simulate, cloneCircuit } = await import(circuitUrl);
    const { solvedCircuit } = await import(fixtureUrl);
    const { scanSurfaces, visibleConflicts } = await import(auditUrl);
    const failures: object[] = [];
    const eyes: number[][] = [[0, BENCH_HEIGHT + 1.9, 0]];
    for (const x of [-1.5, 0, 1.5])
      for (const z of [-1.5, 1.5]) eyes.push([x, 1.68, z]);
    for (let i = 0; i < CHAMBERS.length; i++) {
      const kit = buildKit();
      kit.root.scale.setScalar(KIT_SCALE);
      kit.root.position.y = BENCH_HEIGHT;
      const solved = solvedCircuit(i);
      const open = cloneCircuit(solved);
      for (const part of open.parts)
        if (part.kind === "switch") part.closed = false;
      for (const [state, circuit] of Object.entries({
        starter: CHAMBERS[i].initial, solved, open,
      })) {
        kit.sync(circuit, simulate(circuit));
        // Apply the same update as the world so current markers are positioned
        // and hidden while walking, rather than piled up at their initial origin.
        kit.interact(null, 0, true);
        const scan = scanSurfaces(kit.root);
        const visible = visibleConflicts(kit.root, scan.candidates, eyes);
        if (visible.length) failures.push({
          room: i + 1, state, count: visible.length, samples: visible.slice(0, 5),
        });
      }
      kit.dispose();
    }
    return failures;
  });
  expect(failures).toEqual([]);
});

test("station, window joints and circuit parts have no visible coplanar interiors", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/tests/browser/fixture.html");
  const result = await page.evaluate(async () => {
    const threeUrl = "/node_modules/.vite/deps/three.js";
    const shipUrl = "/src/scene/spaceship.ts";
    const layoutUrl = "/src/scene/shipLayout.ts";
    const chambersUrl = "/src/chambers.ts";
    const fixtureUrl = "/tests/chamber-fixtures.ts";
    const auditUrl = "/tests/browser/surface-audit.js";
    const navigationUrl = "/src/scene/navigation.ts";
    const viewUrl = "/src/scene/benchView.ts";
    const artUrl = "/src/scene/art.ts";
    const THREE = await import(threeUrl);
    const { buildSpaceship } = await import(shipUrl);
    const { DECK, PORTALS } = await import(layoutUrl);
    const { CHAMBERS } = await import(chambersUrl);
    const { solvedCircuit } = await import(fixtureUrl);
    const { scanSurfaces, visibleConflicts } = await import(auditUrl);
    const { canWalk } = await import(navigationUrl);
    const { BENCH_HEIGHT } = await import(viewUrl);
    const { disposeScene } = await import(artUrl);
    const scene = new THREE.Scene();
    const model = buildSpaceship(scene);
    model.update(0, 0, { x: 0, z: 0, yaw: 0, pitch: 0 }, [], true, true,
      CHAMBERS.map((_: unknown, i: number) => solvedCircuit(i)));
    const eyes: number[][] = [];
    const eye = (x: number, z: number) => {
      if (canWalk(x, z, model.obstacles)) eyes.push([x, 1.68, z]);
    };
    for (const room of DECK)
      for (const dx of [-0.3, 0, 0.3])
        for (const dz of [-0.3, 0, 0.3])
          eye(room.x + dx * room.width, room.z + dz * room.depth);
    for (const portal of PORTALS)
      for (const side of [-1, 1])
        for (const across of [-1.2, 0, 1.2])
          for (const distance of [0.8, 2.4, 4.5]) {
            const p = new THREE.Vector3(across, 0, side * distance)
              .applyAxisAngle(new THREE.Vector3(0, 1, 0), portal.rotation);
            eye(portal.x + p.x, portal.z + p.z);
          }
    for (const chamber of CHAMBERS)
      eyes.push([chamber.bench.x, BENCH_HEIGHT + 1.9, chamber.bench.z]);
    const scan = scanSurfaces(model.root);
    const visible = visibleConflicts(model.root, scan.candidates, eyes);
    model.dispose();
    disposeScene(scene);
    return {
      triangles: scan.triangleCount, viewpoints: eyes.length,
      count: visible.length, samples: visible.slice(0, 20),
    };
  });
  expect(result.triangles).toBeGreaterThan(100000);
  expect(result.viewpoints).toBeGreaterThan(150);
  expect(result.count, JSON.stringify(result.samples, null, 2)).toBe(0);
  expect(result.samples).toEqual([]);
});

test("exterior solar panels and relay frames do not duplicate surface interiors", async ({ page }) => {
  await page.goto("/tests/browser/fixture.html");
  const result = await page.evaluate(async () => {
    const threeUrl = "/node_modules/.vite/deps/three.js";
    const spaceUrl = "/src/scene/space.ts";
    const satelliteUrl = "/src/scene/titleSatellite.ts";
    const auditUrl = "/tests/browser/surface-audit.js";
    const artUrl = "/src/scene/art.ts";
    const THREE = await import(threeUrl);
    const { buildSpace } = await import(spaceUrl);
    const { buildTitleSatellite } = await import(satelliteUrl);
    const { scanSurfaces } = await import(auditUrl);
    const { disposeScene } = await import(artUrl);
    const scene = new THREE.Scene();
    buildSpace(scene, () => {});
    const exterior = scanSurfaces(scene).candidates;
    disposeScene(scene);
    const relay = new THREE.Scene();
    buildTitleSatellite(relay);
    const satellite = scanSurfaces(relay).candidates;
    disposeScene(relay);
    return { exterior, satellite };
  });
  expect(result).toEqual({ exterior: [], satellite: [] });
});
