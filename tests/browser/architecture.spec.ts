import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Resolve Vite's graphics dependencies before isolated scene imports can
  // trigger a dependency reload in the middle of a geometry audit.
  await page.goto("/");
  await expect(page.getByRole("button", { name: /^(Begin|Continue)$/ })).toBeEnabled();
});

test("doorway faces remain separated on both approaches and during door travel", async ({
  page,
}) => {
  await page.goto("/tests/browser/fixture.html");
  const collisions = await page.evaluate(async () => {
    const threeUrl = "/node_modules/.vite/deps/three.js";
    const shipUrl = "/src/scene/spaceship.ts";
    const layoutUrl = "/src/scene/shipLayout.ts";
    const THREE = (await import(threeUrl)) as typeof import("three");
    const { buildSpaceship } = (await import(
      shipUrl
    )) as typeof import("../../src/scene/spaceship");
    const { PORTALS } = (await import(
      layoutUrl
    )) as typeof import("../../src/scene/shipLayout");
    const model = buildSpaceship(new THREE.Scene());
    const player = { x: -10, z: 15.5, yaw: 0, pitch: 0 };
    const ray = new THREE.Raycaster();
    ray.far = 5;
    const failures: object[] = [];
    const xs = [-2.025, -1.76, -1.49, -0.9, 0.137, 0.9, 1.49, 1.76, 2.025];
    const ys = [
      0.17, 0.43, 0.92, 1.17, 1.6, 2.16, 2.67, 2.773, 2.91, 3.013, 3.175, 3.4,
      3.8,
    ];
    function inspect(
      portals: readonly (typeof PORTALS)[number][],
      state: string,
    ) {
      model.root.updateMatrixWorld(true);
      for (const portal of portals) {
        const transform = new THREE.Matrix4().makeRotationY(portal.rotation);
        transform.setPosition(portal.x, 0, portal.z);
        for (const side of [-1, 1])
          for (const offset of [-1.07, 1.07]) {
            const origin = new THREE.Vector3(
              offset,
              1.7,
              side * 2.4,
            ).applyMatrix4(transform);
            for (const x of xs)
              for (const y of ys) {
                const target = new THREE.Vector3(x, y, 0).applyMatrix4(
                  transform,
                );
                ray.set(origin, target.sub(origin).normalize());
                const hits = ray
                  .intersectObject(model.root, true)
                  .filter((hit) => {
                    const mesh = hit.object as import("three").Mesh;
                    return (
                      !Array.isArray(mesh.material) &&
                      !mesh.material.transparent
                    );
                  });
                const first = hits[0];
                if (!first?.face) continue;
                const normal = first.face.normal
                  .clone()
                  .applyNormalMatrix(
                    new THREE.Matrix3().getNormalMatrix(
                      first.object.matrixWorld,
                    ),
                  );
                for (const next of hits.slice(1)) {
                  if (next.distance - first.distance > 0.0005) break;
                  if (!next.face) continue;
                  const nextNormal = next.face.normal
                    .clone()
                    .applyNormalMatrix(
                      new THREE.Matrix3().getNormalMatrix(
                        next.object.matrixWorld,
                      ),
                    );
                  if (Math.abs(normal.dot(nextNormal)) > 0.99999) {
                    const color = (hit: typeof first) =>
                      (
                        (hit.object as import("three").Mesh)
                          .material as import("three").MeshStandardMaterial
                      ).color?.getHexString();
                    failures.push({
                      portal: portal.name,
                      state,
                      side,
                      offset,
                      x,
                      y,
                      gap: next.distance - first.distance,
                      materials: [color(first), color(next)],
                      point: first.point.toArray(),
                    });
                  }
                }
              }
          }
      }
    }
    model.update(0, 0, player, [], true, true);
    inspect(PORTALS, "closed");
    for (const portal of PORTALS) {
      const approach = {
        x: portal.x + Math.sin(portal.rotation) * 2.4,
        z: portal.z + Math.cos(portal.rotation) * 2.4,
        yaw: 0,
        pitch: 0,
      };
      for (const amount of [0.08, 0.3, 0.6, 1]) {
        model.update(0, 0, approach, [], true, true);
        model.update(
          amount === 1 ? 0 : -Math.log(1 - amount) / 8,
          0,
          approach,
          [portal.system],
          amount === 1,
          true,
        );
        inspect([portal], `open ${amount}`);
      }
    }
    return { count: failures.length, samples: failures.slice(0, 20) };
  });
  expect(collisions).toEqual({ count: 0, samples: [] });
});

test("low wall lights leave both transfer passage entrances clear", async ({ page }) => {
  await page.goto("/tests/browser/fixture.html");
  const result = await page.evaluate(async () => {
    const threeUrl = "/node_modules/.vite/deps/three.js", shipUrl = "/src/scene/spaceship.ts";
    const THREE = await import(threeUrl) as typeof import("three");
    const { buildSpaceship } = await import(shipUrl);
    const model = buildSpaceship(new THREE.Scene());
    model.root.updateMatrixWorld(true);
    const hits: { x: number; z: number; color: string }[] = [];
    for (const side of [-1, 1]) for (const z of [-9.4, -8.7, -8, -7.3, -6.6]) {
      const ray = new THREE.Raycaster(new THREE.Vector3(side * 5, 0.25, z), new THREE.Vector3(-side, 0, 0), 0, 1.25);
      for (const hit of ray.intersectObject(model.root, true)) {
        const material = (hit.object as import("three").Mesh).material as import("three").MeshStandardMaterial;
        if (!material.transparent) hits.push({ x: hit.point.x, z, color: material.color.getHexString() });
      }
    }
    let wallLights = 0;
    for (const side of [-1, 1]) for (const z of [-11, -5]) {
      const ray = new THREE.Raycaster(new THREE.Vector3(side * 5, 0.25, z), new THREE.Vector3(-side, 0, 0), 0, 1.25);
      if (ray.intersectObject(model.root, true).some(hit => {
        const material = (hit.object as import("three").Mesh).material as import("three").MeshStandardMaterial;
        return material.emissive?.getHex() > 0;
      })) wallLights++;
    }
    model.dispose();
    return { blocked: hits, wallLights };
  });
  expect(result).toEqual({ blocked: [], wallLights: 4 });
});

test("every pressure window opens onto the exterior while the hull blocks escape", async ({
  page,
}) => {
  await page.goto("/tests/browser/fixture.html");
  const windows = await page.evaluate(async () => {
    const threeUrl = "/node_modules/.vite/deps/three.js";
    const shipUrl = "/src/scene/spaceship.ts";
    const navigationUrl = "/src/scene/navigation.ts";
    const THREE = (await import(threeUrl)) as typeof import("three");
    const { buildSpaceship } = (await import(
      shipUrl
    )) as typeof import("../../src/scene/spaceship");
    const { canWalk } = (await import(
      navigationUrl
    )) as typeof import("../../src/scene/navigation");
    const model = buildSpaceship(new THREE.Scene());
    model.root.updateMatrixWorld(true);
    const panes: import("three").Object3D[] = [];
    model.root.traverse((o) => {
      if (o.name === "pressure glass") panes.push(o);
    });
    return panes.map((pane) => {
      const center = pane.getWorldPosition(new THREE.Vector3());
      const inward = new THREE.Vector3(0, 0, 1).transformDirection(
        pane.matrixWorld,
      );
      const ray = new THREE.Raycaster(
        center.clone().addScaledVector(inward, 1.2),
        inward.clone().negate(),
        0,
        2.4,
      );
      const blocking = ray.intersectObject(model.root, true).filter((hit) => {
        const mesh = hit.object as import("three").Mesh;
        return !Array.isArray(mesh.material) && !mesh.material.transparent;
      });
      const outside = center.clone().addScaledVector(inward, -0.5);
      return {
        bank: pane.parent!.name,
        blocked: blocking.length > 0,
        canEscape: canWalk(outside.x, outside.z, model.obstacles),
      };
    });
  });
  expect(windows.length).toBeGreaterThanOrEqual(30);
  expect(new Set(windows.map((w) => w.bank)).size).toBe(11);
  expect(windows.filter((w) => w.blocked || w.canEscape)).toEqual([]);
});

test("orbital shader textures are released when the scene is disposed", async ({
  page,
}) => {
  await page.goto("/tests/browser/fixture.html");
  const disposed = await page.evaluate(async () => {
    const threeUrl = "/node_modules/.vite/deps/three.js";
    const spaceUrl = "/src/scene/space.ts";
    const artUrl = "/src/scene/art.ts";
    const THREE = (await import(threeUrl)) as typeof import("three");
    const { buildSpace } = (await import(
      spaceUrl
    )) as typeof import("../../src/scene/space");
    const { disposeScene } = (await import(
      artUrl
    )) as typeof import("../../src/scene/art");
    const scene = new THREE.Scene();
    buildSpace(scene, () => {});
    const maps = new Map<import("three").Texture, number>();
    scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      for (const material of Array.isArray(o.material)
        ? o.material
        : [o.material]) {
        for (const value of Object.values(material))
          if (value instanceof THREE.Texture) maps.set(value, 0);
        if (material instanceof THREE.ShaderMaterial)
          for (const uniform of Object.values(material.uniforms))
            if (uniform.value instanceof THREE.Texture)
              maps.set(uniform.value, 0);
      }
    });
    maps.forEach((_, map) =>
      map.addEventListener("dispose", () => maps.set(map, maps.get(map)! + 1)),
    );
    disposeScene(scene);
    return [...maps.values()];
  });
  expect(disposed).toHaveLength(7);
  expect(disposed.every((count) => count === 1)).toBe(true);
});

test("the complete chamber route and its return path remain walkable through all six powered gates", async ({
  page,
}) => {
  await page.goto("/tests/browser/fixture.html");
  const result = await page.evaluate(async () => {
    const threeUrl = "/node_modules/.vite/deps/three.js",
      shipUrl = "/src/scene/spaceship.ts",
      navUrl = "/src/scene/navigation.ts";
    const THREE = (await import(threeUrl)) as typeof import("three");
    const { buildSpaceship } = (await import(
      shipUrl
    )) as typeof import("../../src/scene/spaceship");
    const { movePlayer, SPAWN } = (await import(
      navUrl
    )) as typeof import("../../src/scene/navigation");
    const scene = new THREE.Scene(),
      model = buildSpaceship(scene);
    let player = { ...SPAWN };
    const completed: import("../../src/chambers").ChamberId[] = [];
    const route: [number, number][] = [];
    function go(x: number, z: number) {
      route.push([x, z]);
      for (let step = 0; step < 1000; step++) {
        const dx = x - player.x,
          dz = z - player.z,
          d = Math.hypot(dx, dz);
        if (d < 0.01) return;
        const dt = Math.min(1 / 60, d / 3.5);
        model.update(dt, 0, player, completed, true, true);
        player = movePlayer(
          player,
          dx / d,
          -dz / d,
          dt,
          false,
          model.obstacles,
        );
      }
      throw new Error(
        `Route blocked at ${player.x.toFixed(2)},${player.z.toFixed(2)} heading to ${x},${z}`,
      );
    }
    go(-10, 21.5);
    completed.push("wake");
    go(-7.4, 21.5);
    go(-7.4, 15.6);
    go(-10, 15.6);
    go(-10, 7.5);
    completed.push("contact");
    go(-7.4, 7.5);
    go(-7.4, 1.6);
    go(-10, 1.6);
    go(-10, -6.5);
    completed.push("build");
    go(-6.5, -6.5);
    go(-6.5, -8);
    go(6.5, -8);
    go(6.5, -6.5);
    go(10, -6.5);
    completed.push("resist");
    go(10, -3.6);
    go(10, 2.1);
    go(12.6, 2.1);
    go(12.6, 7.5);
    go(10, 7.5);
    completed.push("share");
    go(10, 10.4);
    go(10, 16.1);
    go(12.6, 16.1);
    go(12.6, 21.5);
    go(10, 21.5);
    completed.push("branch");
    go(10, 31);
    const waypoints = [...route].reverse();
    for (const [x, z] of waypoints) go(x, z);
    const p = player;
    model.dispose();
    return {
      completed: completed.length,
      position: p,
      legs: waypoints.length * 2,
    };
  });
  expect(result.completed).toBe(6);
  expect(result.position.x).toBeCloseTo(-10, 1);
  expect(result.position.z).toBeCloseTo(21.5, 1);
  expect(result.legs).toBeGreaterThan(40);
});
