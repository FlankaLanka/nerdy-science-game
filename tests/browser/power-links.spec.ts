import { test, expect } from "@playwright/test";

test("each conduit stays inside the ship and connects its bench to its own exit", async ({ page }) => {
  await page.goto("/credits.html");
  const failures = await page.evaluate(async () => {
    const linkUrl = "/src/scene/powerLink.ts", layoutUrl = "/src/scene/shipLayout.ts", chambersUrl = "/src/chambers.ts";
    const { powerLinkCurve } = await import(linkUrl);
    const { PORTALS, insideDeck } = await import(layoutUrl);
    const { CHAMBERS } = await import(chambersUrl);
    const failures: string[] = [];
    for (const chamber of CHAMBERS) {
      const gate = PORTALS.find((p: { system: string }) => p.system === chamber.id);
      const points = powerLinkCurve(chamber, gate).getSpacedPoints(600);
      for (const point of points) {
        const p = point.toArray();
        if (!p.every(Number.isFinite)) failures.push(`${chamber.id}: invalid bend`);
        if (p[1] < 0.036) failures.push(`${chamber.id}: cable sinks into floor`);
        if (!insideDeck(p[0], p[2])) failures.push(`${chamber.id}: outside hull`);
        const approach = (p[0] - gate.x) * Math.sin(gate.rotation) + (p[2] - gate.z) * Math.cos(gate.rotation);
        if (approach < 0.4) failures.push(`${chamber.id}: crosses locked gate`);
        if (p[1] < 0.2 && CHAMBERS.some((c: { bench: { x: number; z: number } }) =>
          Math.abs(p[0] - c.bench.x) < 1.5 && Math.abs(p[2] - c.bench.z) < 0.79))
          failures.push(`${chamber.id}: through bench base`);
      }
    }
    return [...new Set(failures)];
  });
  expect(failures).toEqual([]);
});

test("validated repairs light only their linked checkmarks and survive further experimentation", async ({ page }) => {
  await page.goto("/credits.html");
  const result = await page.evaluate(async () => {
    const threeUrl = "/node_modules/.vite/deps/three.js", shipUrl = "/src/scene/spaceship.ts";
    const fixtureUrl = "/tests/chamber-fixtures.ts", campaignUrl = "/src/chamberCampaign.ts";
    const layoutUrl = "/src/scene/shipLayout.ts", chambersUrl = "/src/chambers.ts", artUrl = "/src/scene/art.ts";
    const THREE = await import(threeUrl);
    const { buildSpaceship } = await import(shipUrl);
    const { chamberFixture } = await import(fixtureUrl);
    const { campaignReducer, completedIds, serializeCampaign, restoreCampaign } = await import(campaignUrl);
    const { PORTALS } = await import(layoutUrl);
    const { CHAMBERS } = await import(chambersUrl);
    const { disposeScene } = await import(artUrl);
    const scene = new THREE.Scene(), model = buildSpaceship(scene);
    const failures: string[] = [];
    model.root.updateMatrixWorld(true);
    const ray = new THREE.Raycaster();
    for (const chamber of CHAMBERS) {
      const panel = model.root.getObjectByName(`Power link ${chamber.id}`).getObjectByName("Door power indicator");
      const target = panel.localToWorld(new THREE.Vector3(0, 0, 0.074));
      for (const offset of [-1.2, 0, 1.2]) {
        const eye = new THREE.Vector3(chamber.bench.x + offset, 1.68, chamber.bench.z + 2.5);
        ray.set(eye, target.clone().sub(eye).normalize());
        const hit = ray.intersectObject(model.root, true)[0];
        if (hit && hit.distance < eye.distanceTo(target) - 0.1)
          failures.push(`${chamber.id}: door symbol hidden from bench approach ${offset}`);
      }
    }
    for (let i = 0; i < CHAMBERS.length; i++) {
      const gate = PORTALS[i];
      const player = { x: gate.x + Math.sin(gate.rotation) * 2.4, z: gate.z + Math.cos(gate.rotation) * 2.4, yaw: 0, pitch: 0 };
      function verify(state: ReturnType<typeof chamberFixture>, count: number, stage: string) {
        model.update(0, 0, player, completedIds(state), true, true, state.rooms);
        for (let j = 0; j < CHAMBERS.length; j++) {
          const link = model.root.getObjectByName(`Power link ${CHAMBERS[j].id}`);
          let checked = 0, pending = 0;
          link.traverse((node: import("three").Object3D) => {
            if (node.visible && node.name === "Powered checkmark") checked++;
            if (node.visible && node.name === "Unpowered indicator") pending++;
          });
          if (checked !== (j < count ? 3 : 0) || pending !== (j < count ? 0 : 3))
            failures.push(`${stage}: wrong indicators in ${CHAMBERS[j].id}`);
        }
        const leaf = model.root.getObjectByName(`Door ${gate.system}`).children[0];
        if (Math.abs(Math.abs(leaf.position.x) - (i < count ? 2.6 : 0.8)) > 0.001)
          failures.push(`${stage}: indicator and gate disagree`);
      }
      verify(chamberFixture(i), i, "locked");
      let state = chamberFixture(i + 1);
      verify(state, i + 1, "restored");
      state = campaignReducer(state, { type: "RESET_CIRCUIT", room: i });
      verify(state, i + 1, "practice");
      verify(restoreCampaign(serializeCampaign(state)), i + 1, "reload");
      verify(campaignReducer(state, { type: "NEW_GAME" }), 0, "new run");
    }
    model.dispose();
    disposeScene(scene);
    return failures;
  });
  expect(result).toEqual([]);
});

test("power flows away from the bench and reduced motion retains a steady checked state", async ({ page }) => {
  await page.goto("/credits.html");
  const result = await page.evaluate(async () => {
    const threeUrl = "/node_modules/.vite/deps/three.js", linkUrl = "/src/scene/powerLink.ts";
    const layoutUrl = "/src/scene/shipLayout.ts", chambersUrl = "/src/chambers.ts", artUrl = "/src/scene/art.ts";
    const THREE = await import(threeUrl);
    const { buildPowerLink, powerLinkCurve } = await import(linkUrl);
    const { PORTALS } = await import(layoutUrl);
    const { CHAMBERS } = await import(chambersUrl);
    const { disposeScene } = await import(artUrl);
    const link = buildPowerLink(CHAMBERS[0], PORTALS[0]);
    const curve = powerLinkCurve(CHAMBERS[0], PORTALS[0]);
    link.update(true, 0, false, true);
    const before = curve.getPointAt(link.flow.cableTravel.value / curve.getLength());
    link.update(true, 0.05, false, true);
    const after = curve.getPointAt(link.flow.cableTravel.value / curve.getLength());
    link.update(true, 1, true, true);
    const reduced = link.flow.cableMotion.value === 0 && link.flow.cablePower.value === 1 && link.root.getObjectByName("Powered checkmark").visible;
    link.update(true, 2, false, false);
    const paused = link.flow.cableMotion.value === 0;
    link.update(false, 3, false, true);
    const disconnected = link.flow.cableMotion.value === 0 && link.flow.cablePower.value === 0;
    link.update(true, 4, false, true);
    const restarted = link.flow.cableTravel.value === 0 && link.flow.cableMotion.value === 1;
    const scene = new THREE.Scene();
    scene.add(link.root);
    disposeScene(scene);
    return { flowsDownFromRelay: after.y < before.y, reduced, paused, disconnected, restarted };
  });
  expect(result).toEqual({ flowsDownFromRelay: true, reduced: true, paused: true, disconnected: true, restarted: true });
});


test("cable shaders render moving power and a steady reduced-motion signal", async ({ page }) => {
  await page.goto("/credits.html");
  const errors: string[] = [];
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  const result = await page.evaluate(async () => {
    const threeUrl = "/node_modules/.vite/deps/three.js", cableUrl = "/src/scene/cable.ts";
    const THREE = await import(threeUrl);
    const { buildCable } = await import(cableUrl);
    const cable = buildCable(new THREE.LineCurve3(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(1, 0, 0)), {
      radius: 0.08, color: "#35454c", signal: "#70dce6", standby: "#c18b4c", spacing: 1, pulseWidth: 0.12,
    });
    const scene = new THREE.Scene();
    scene.add(cable.root, new THREE.HemisphereLight(0xffffff, 0x333333, 2));
    const camera = new THREE.OrthographicCamera(-1.3, 1.3, 0.3, -0.3, 0.1, 10);
    camera.position.set(0, 0.6, 2);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
    renderer.setSize(320, 96);
    function render(power: boolean, time: number, reduced: boolean, direction = 1) {
      cable.update(power, time, reduced, true, 0.8, direction);
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL();
    }
    const off = render(false, 0, false);
    const on = render(true, 0, false);
    const moving = render(true, 0.6, false);
    const reverse = render(true, 0.6, false, -1);
    const steady = render(true, 1, true);
    const steadyLater = render(true, 5, true);
    const steadyReverse = render(true, 5, true, -1);
    const offAgain = render(false, 6, false);
    const runnable = renderer.info.programs.every((program: { diagnostics?: { runnable: boolean } }) => program.diagnostics?.runnable !== false);
    cable.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    return { powered: off !== on, moves: moving !== on, reverses: reverse !== moving, steady: steady === steadyLater, staticDirection: steady !== steadyReverse, disconnects: off === offAgain, runnable };
  });
  expect(result).toEqual({ powered: true, moves: true, reverses: true, steady: true, staticDirection: true, disconnects: true, runnable: true });
  expect(errors).toEqual([]);
});
