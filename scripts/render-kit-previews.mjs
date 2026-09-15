import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

// Static tray images use the same meshes and materials as the playable kit.
// Run against the local dev server; no extra renderer runs inside the HUD.
const output = "public/assets/kit";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  args: process.platform === "darwin" ? ["--use-angle=metal"] : [],
});
try {
  const page = await browser.newPage();
  await page.goto(`${process.env.REVIEW_URL ?? "http://127.0.0.1:5176"}/credits.html`);
  for (const kind of ["wire", "battery", "bulb", "resistor", "switch"]) {
    const data = await page.evaluate(async kind => {
      const THREE = await import("/node_modules/.vite/deps/three.js");
      const { buildKit } = await import("/src/scene/kitArt.ts");
      const { simulate } = await import("/src/circuitKit.ts");
      const { disposeScene } = await import("/src/scene/art.ts");
      const kit = buildKit();
      const part = (id, kind, x, y) => ({ id, kind, x, y, angle: 0, value: 6, rating: 6, closed: false });
      const circuit = kind === "wire"
        ? { parts: [part("a", "bulb", 260, 275), part("b", "bulb", 640, 225)], wires: [{ id: "lead", a: "a:b", b: "b:a" }], serial: 1 }
        : { parts: [part("preview", kind, 450, 250)], wires: [], serial: 1 };
      kit.sync(circuit, simulate(circuit));
      const scene = new THREE.Scene();
      const subject = new THREE.Group();
      scene.add(subject);
      if (kind === "wire") {
        let lead;
        kit.root.traverse(node => { if (node.userData.kitId === "lead") lead = node; });
        subject.add(lead);
        // Keep the actual contact rings at both ends so the cable reads at tray size.
        for (const [id, end] of [["a", "b"], ["b", "a"]]) {
          const component = kit.root.children.find(node => node.userData.kitId === id);
          component.updateWorldMatrix(true, true);
          for (const contact of component.children.filter(node => node.userData.kitId === `${id}:${end}`)) {
            const copy = contact.clone();
            copy.position.copy(contact.getWorldPosition(new THREE.Vector3()));
            subject.add(copy);
          }
        }
      } else {
        subject.add(kit.root.children.find(node => node.userData.kitId === "preview"));
      }
      const bounds = new THREE.Box3().setFromObject(subject);
      const center = bounds.getCenter(new THREE.Vector3());
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000);
      camera.position.copy(center).add(new THREE.Vector3(100, 170, 220));
      camera.lookAt(center);
      camera.updateMatrixWorld(true);
      const projected = new THREE.Box3();
      for (const x of [bounds.min.x, bounds.max.x])
        for (const y of [bounds.min.y, bounds.max.y])
          for (const z of [bounds.min.z, bounds.max.z])
            projected.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
      const size = projected.getSize(new THREE.Vector3());
      const halfHeight = Math.max(size.y, size.x / 1.5) * 0.56;
      camera.left = -halfHeight * 1.5;
      camera.right = halfHeight * 1.5;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
      scene.add(new THREE.HemisphereLight("#e3f4ff", "#6b7470", 3));
      const key = new THREE.DirectionalLight("#fff1d3", 4);
      key.position.set(-150, 250, 200);
      scene.add(key);
      const rim = new THREE.DirectionalLight("#a5d5ed", 2);
      rim.position.set(100, 140, -200);
      scene.add(rim);
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
      renderer.setSize(288, 192);
      renderer.setClearColor(0, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.render(scene, camera);
      const data = renderer.domElement.toDataURL("image/png").split(",")[1];
      kit.dispose();
      disposeScene(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      return data;
    }, kind);
    await fs.writeFile(`${output}/${kind}.png`, Buffer.from(data, "base64"));
    process.stdout.write(`${kind}.png\n`);
  }
} finally {
  await browser.close();
}
