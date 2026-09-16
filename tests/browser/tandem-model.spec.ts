import { test, expect } from "@playwright/test";

test("Tandem has a complete articulated model with bounded rendering cost", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/tests/browser/fixture.html");
  await page.setViewportSize({ width: 1200, height: 900 });
  const result = await page.evaluate(async () => {
    const u = "/src/scene/tandemModel.ts",
      t = "/node_modules/.vite/deps/three.js",
      e = "/node_modules/three/examples/jsm/environments/RoomEnvironment.js";
    const THREE = (await import(t)) as typeof import("three");
    const { buildTandemModel } = (await import(
      u
    )) as typeof import("../../src/scene/tandemModel");
    const { RoomEnvironment } = await import(e);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(1200, 900);
    renderer.setPixelRatio(1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    document.body.style.margin = "0";
    document.body.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#a9b5b6");
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;
    scene.environmentIntensity = 0.65;
    scene.add(new THREE.HemisphereLight("#e9f2f3", "#506574", 2));
    const light = new THREE.DirectionalLight("#fff1d8", 3);
    light.position.set(-3, 5, 4);
    scene.add(light);
    const guide = buildTandemModel(scene);
    guide.root.visible = true;
    const camera = new THREE.PerspectiveCamera(35, 1200 / 900, 0.05, 20);
    camera.position.set(2.2, 1.8, 3.7);
    camera.lookAt(0, 0.83, 0);
    renderer.render(scene, camera);
    let triangles = 0,
      meshes = 0;
    guide.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        meshes++;
        triangles +=
          (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
      }
    });
    const bounds = new THREE.Box3().setFromObject(guide.root);
    const stationary = new THREE.Vector3();
    guide.arm.getWorldPosition(stationary);
    guide.body.rotation.x = 0.04;
    guide.root.updateMatrixWorld(true);
    const suspended = new THREE.Vector3();
    guide.arm.getWorldPosition(suspended);
    guide.body.rotation.x = 0;
    const rig = window as unknown as { reviewTandem: (angle: number) => void };
    rig.reviewTandem = (angle) => {
      guide.root.rotation.y = angle;
      renderer.render(scene, camera);
    };
    return {
      meshes,
      triangles,
      bottom: bounds.min.y,
      height: bounds.max.y - bounds.min.y,
      attached: stationary.distanceTo(suspended) > 0.005,
      headParent: guide.head.parent === guide.body,
      wheelChildren: guide.wheel.children.length,
    };
  });
  expect(errors).toEqual([]);
  expect(result.meshes).toBeLessThan(55);
  expect(result.triangles).toBeLessThan(50000);
  expect(result.bottom).toBeCloseTo(0, 3);
  expect(result.height).toBeLessThan(1.75);
  expect(result.attached).toBe(true);
  expect(result.headParent).toBe(true);
  expect(result.wheelChildren).toBeGreaterThan(1);
  console.log("Tandem geometry", result);
  await page.screenshot({
    path: "artifacts/tandem-polish/front-three-quarter.png",
  });
  await page.evaluate(() =>
    (window as unknown as { reviewTandem: (a: number) => void }).reviewTandem(
      2.3,
    ),
  );
  await page.screenshot({
    path: "artifacts/tandem-polish/rear-three-quarter.png",
  });
});

test("Tandem panels and joints have no visible coplanar faces in rest or pointing poses", async ({
  page,
}) => {
  await page.goto("/tests/browser/fixture.html");
  const failures = await page.evaluate(async () => {
    const t = "/node_modules/.vite/deps/three.js",
      g = "/src/scene/tandem.ts",
      a = "/tests/browser/surface-audit.js";
    const THREE = (await import(t)) as typeof import("three");
    const { buildTandem } = (await import(
      g
    )) as typeof import("../../src/scene/tandem");
    const { scanSurfaces, visibleConflicts } = await import(a);
    const guide = buildTandem(new THREE.Scene()),
      failures: object[] = [];
    const player = { x: -10, z: 21.5, yaw: 0, pitch: 0 };
    for (const bench of [null, 0]) {
      guide.update(1 / 60, player, [], [], bench, false, false, true, "listen");
      const p = guide.position(),
        eyes: number[][] = [];
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4)
        for (const h of [0.5, 1.68, 2.6])
          eyes.push([p.x + Math.cos(a) * 2, h, p.z + Math.sin(a) * 2]);
      const scan = scanSurfaces(guide.root);
      const visible = visibleConflicts(guide.root, scan.candidates, eyes);
      if (visible.length)
        failures.push({
          bench,
          count: visible.length,
          samples: visible.slice(0, 10),
        });
    }
    return failures;
  });
  expect(failures).toEqual([]);
});
