import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildKit } from "./scene/kitArt";
import type { Circuit, CircuitResult } from "./circuitKit";

export default function KitScene({
  circuit,
  result,
  onError,
}: {
  circuit: Circuit;
  result: CircuitResult;
  onError: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const current = useRef({ circuit, result, onError });
  current.current = { circuit, result, onError };
  const update = useRef<(() => void) | null>(null);
  useEffect(() => {
    const container = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      current.current.onError();
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.setAttribute("aria-hidden", "true");
    container.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight("#e1ede2", "#243436", 2));
    const light = new THREE.DirectionalLight("#fff3d8", 3.6);
    light.position.set(-180, 650, -200);
    light.castShadow = true;
    Object.assign(light.shadow.camera, {
      left: -490,
      right: 490,
      top: 300,
      bottom: -300,
      near: 1,
      far: 1400,
    });
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.normalBias = 0.8;
    scene.add(light);
    const fill = new THREE.DirectionalLight("#98c9d4", 1.2);
    fill.position.set(400, 280, 350);
    scene.add(fill);
    const pmrem = new THREE.PMREMGenerator(renderer),
      room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.04);
    room.dispose();
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.6;
    const camera = new THREE.OrthographicCamera(-450, 450, 250, -250, 1, 1500);
    camera.position.set(0, 800, 0);
    camera.up.set(0, 0, -1);
    camera.lookAt(0, 0, 0);
    const kit = buildKit();
    scene.add(kit.root);
    const render = () => {
      kit.sync(current.current.circuit, current.current.result);
      renderer.render(scene, camera);
    };
    const resize = () => {
      const r = container.getBoundingClientRect();
      renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false);
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    update.current = render;
    resize();
    const lost = (e: Event) => {
      e.preventDefault();
      current.current.onError();
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      observer.disconnect();
      update.current = null;
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      kit.dispose();
      light.shadow.dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);
  useEffect(() => update.current?.(), [circuit, result]);
  return <div ref={host} className="kit-scene" />;
}
