import * as THREE from "three";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { Water } from "three/addons/objects/Water.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { disposeScene } from "./art";
import { buildIsland } from "./island";
import {
  focusedSite,
  groundHeight,
  movePlayer,
  PLAYER_KEY,
  restorePlayer,
  SITES,
  SPAWN,
} from "./navigation";
import type { MissionId } from "../missions";
import { gamePixelRatio } from "../viewport";
import { projectWaypoint } from "./waypoint";
import type { Waypoint } from "./waypoint";
import { WATER_LEVEL } from "./islandLayout";

export type Telemetry = {
  focus: MissionId | null;
  distance: number;
  heading: number;
  moved: boolean;
  locked: boolean;
};
export type WorldState = {
  playing: boolean;
  completed: MissionId[];
  reducedMotion: boolean;
  sensitivity: number;
  distressSent: boolean;
};
type Options = {
  container: HTMLDivElement;
  state: () => WorldState;
  ready: () => void;
  error: () => void;
  telemetry: (data: Telemetry) => void;
  waypoint: (point: Waypoint) => void;
  interact: (id: MissionId) => void;
  pause: () => void;
  step: () => void;
};
const empty = {
  capture() {},
  release() {},
  reset() {},
  position: () => ({ ...SPAWN }),
  interact() {},
  stick(_x: number, _y: number) {},
  dispose() {},
};

export function renderWorld(o: Options) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch {
    o.error();
    return empty;
  }
  const coarse = matchMedia("(pointer: coarse)").matches;
  renderer.setPixelRatio(gamePixelRatio(coarse ? 1.35 : 1.65));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  const canvas = renderer.domElement;
  canvas.setAttribute(
    "aria-label",
    "First-person view of Bramble Island. WASD to move, mouse or arrow keys to look, E to interact.",
  );
  canvas.setAttribute("role", "img");
  canvas.tabIndex = -1;
  o.container.prepend(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#758a91");
  scene.fog = new THREE.FogExp2("#7c9293", 0.006);
  scene.add(new THREE.HemisphereLight("#c4d8e0", "#373d2b", 1.45));
  const sun = new THREE.DirectionalLight("#ffcf95", 2.6);
  sun.position.set(-30, 35, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -42;
  sun.shadow.camera.right = 42;
  sun.shadow.camera.top = 44;
  sun.shadow.camera.bottom = -40;
  sun.shadow.camera.far = 140;
  sun.shadow.normalBias = 0.045;
  sun.shadow.bias = -0.0002;
  scene.add(sun);
  const fill = new THREE.DirectionalLight("#a2bed0", 0.55);
  fill.position.set(20, 20, -30);
  scene.add(fill);
  const manager = new THREE.LoadingManager();
  const texturesReady = new Promise<void>((resolve) => {
    manager.onLoad = resolve;
  });
  manager.itemStart("island-setup");
  const model = buildIsland(scene, manager);
  let player = { ...SPAWN };
  try {
    player = restorePlayer(localStorage.getItem(PLAYER_KEY), model.obstacles);
  } catch {
    /* Session-only play. */
  }
  const camera = new THREE.PerspectiveCamera(68, 1, 0.08, 650);
  camera.rotation.order = "YXZ";
  const normal = new THREE.TextureLoader(manager).load(
    "/art/water-normal.webp",
  );
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  const water = new Water(new THREE.PlaneGeometry(1500, 1500), {
    textureWidth: coarse ? 256 : 512,
    textureHeight: coarse ? 256 : 512,
    waterNormals: normal,
    sunDirection: sun.position.clone().normalize(),
    sunColor: 0xd8b486,
    waterColor: 0x274b50,
    distortionScale: 3.2,
    fog: true,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.y = WATER_LEVEL;
  scene.add(water);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.12, 0.4, 2.5);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const pmrem = new THREE.PMREMGenerator(renderer);
  let sky: THREE.DataTexture | null = null,
    environment: THREE.WebGLRenderTarget | null = null;
  let disposed = false,
    frame = 0,
    last = performance.now(),
    time = 0,
    lastHud = 0,
    lastSave = 0,
    lastStep = 0;
  let stillFrame = "";
  let ready = false,
    moved = false,
    wasPlaying = false,
    ignoreUnlock = false;
  const keys = new Set<string>();
  let stickX = 0,
    stickY = 0;
  let drag: { id: number; x: number; y: number } | null = null;
  const clear = () => {
    keys.clear();
    stickX = stickY = 0;
    drag = null;
  };
  function save() {
    try {
      localStorage.setItem(PLAYER_KEY, JSON.stringify(player));
    } catch {
      /* Main save status reports unavailable storage. */
    }
  }
  function release() {
    clear();
    if (document.pointerLockElement === canvas) {
      ignoreUnlock = true;
      document.exitPointerLock();
    }
    save();
  }
  function capture() {
    if (disposed) return;
    canvas.focus({ preventScroll: true });
    if (!coarse && document.pointerLockElement !== canvas) {
      try {
        const task = canvas.requestPointerLock();
        if (task) void task.catch(() => {});
      } catch {
        /* Drag-to-look works where pointer lock is unavailable. */
      }
    }
  }
  function interact() {
    if (!o.state().playing) return;
    const id = focusedSite(player, model.obstacles);
    if (id) {
      clear();
      o.interact(id);
    }
  }
  function keydown(e: KeyboardEvent) {
    if (!o.state().playing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (
      [
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "PageUp",
        "PageDown",
        "ShiftLeft",
        "ShiftRight",
      ].includes(e.code)
    ) {
      e.preventDefault();
      keys.add(e.code);
    }
    if (e.code === "KeyE" && !e.repeat) {
      e.preventDefault();
      interact();
    }
  }
  const keyup = (e: KeyboardEvent) => keys.delete(e.code);
  function look(dx: number, dy: number) {
    if (!o.state().playing) return;
    const amount = 0.0021 * o.state().sensitivity;
    player.yaw -= dx * amount;
    player.pitch = THREE.MathUtils.clamp(
      player.pitch - dy * amount,
      -1.25,
      1.25,
    );
  }
  const mouse = (e: MouseEvent) => {
    if (document.pointerLockElement === canvas) look(e.movementX, e.movementY);
  };
  const down = (e: PointerEvent) => {
    if (!o.state().playing || e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
    if (e.pointerType === "mouse") capture();
  };
  const move = (e: PointerEvent) => {
    if (drag?.id !== e.pointerId || document.pointerLockElement === canvas)
      return;
    look(e.clientX - drag.x, e.clientY - drag.y);
    drag.x = e.clientX;
    drag.y = e.clientY;
  };
  const up = () => {
    drag = null;
  };
  const lockChange = () => {
    if (document.pointerLockElement !== canvas) {
      clear();
      if (!ignoreUnlock && o.state().playing) o.pause();
      ignoreUnlock = false;
    }
  };
  const blur = () => {
    clear();
    if (o.state().playing) o.pause();
    save();
  };
  const visibility = () => {
    if (document.hidden) blur();
  };
  const lost = (event: Event) => {
    event.preventDefault();
    release();
    o.error();
  };
  document.addEventListener("keydown", keydown);
  document.addEventListener("keyup", keyup);
  document.addEventListener("mousemove", mouse);
  document.addEventListener("pointerlockchange", lockChange);
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("blur", blur);
  window.addEventListener("pagehide", save);
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("webglcontextlost", lost);
  let width = 1,
    height = 1;
  const resize = () => {
    width = Math.max(1, o.container.clientWidth);
    height = Math.max(1, o.container.clientHeight);
    const ratio = gamePixelRatio(coarse ? 1.35 : 1.65);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height);
    composer.setPixelRatio(ratio);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(o.container);
  window.addEventListener("resize", resize);
  resize();
  const targetPoint = new THREE.Vector3();
  const ids: MissionId[] = ["workshop", "harbor", "beacon"];
  function animate(now: number) {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    const dt = Math.min((now - last) / 1000, 0.06);
    last = now;
    const state = o.state();
    if (document.hidden) return;
    if (wasPlaying && !state.playing) release();
    wasPlaying = state.playing;
    const frameKey = `${width}:${height}:${renderer.getPixelRatio()}:${state.completed.join()}:${state.reducedMotion}`;
    if (!state.playing && ready && stillFrame === frameKey) return;
    stillFrame = state.playing ? "" : frameKey;
    let walking = false;
    if (state.playing) {
      player.yaw +=
        ((keys.has("ArrowLeft") ? 1 : 0) - (keys.has("ArrowRight") ? 1 : 0)) *
        dt *
        1.65;
      player.pitch = THREE.MathUtils.clamp(
        player.pitch +
          ((keys.has("PageUp") ? 1 : 0) - (keys.has("PageDown") ? 1 : 0)) * dt,
        -1.25,
        1.25,
      );
      const right =
        (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0) + stickX;
      const forward =
        (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) -
        (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) -
        stickY;
      const previous = player;
      player = movePlayer(
        player,
        right,
        forward,
        dt,
        keys.has("ShiftLeft") || keys.has("ShiftRight"),
        model.obstacles,
      );
      walking =
        Math.hypot(player.x - previous.x, player.z - previous.z) > 0.002;
      if (walking) moved = true;
      if (
        walking &&
        now - lastStep >
          (keys.has("ShiftLeft") || keys.has("ShiftRight") ? 290 : 460)
      ) {
        lastStep = now;
        o.step();
      }
    }
    if (!state.reducedMotion) time += dt;
    model.wind.value = time;
    camera.position.set(
      player.x,
      groundHeight(player.x, player.z) +
        1.68 +
        (walking && !state.reducedMotion ? Math.sin(time * 11) * 0.022 : 0),
      player.z,
    );
    camera.rotation.set(player.pitch, player.yaw, 0, "YXZ");
    camera.updateMatrixWorld();
    for (const g of model.lightGroups) {
      const target = state.completed.includes(g.id) ? 1 : 0;
      g.material.emissiveIntensity = THREE.MathUtils.lerp(
        g.material.emissiveIntensity,
        target * 5,
        state.reducedMotion || !state.playing ? 1 : Math.min(1, dt * 1.6),
      );
      if (g.light)
        g.light.intensity =
          (g.material.emissiveIntensity / 5) * g.light.userData.power;
    }
    const next = ids.find((id) => !state.completed.includes(id)) ?? "beacon";
    for (const id of ids) {
      const mat = model.indicators[id],
        complete = state.completed.includes(id);
      mat.emissive.set(
        complete ? "#89dfb4" : id === next ? "#ffd393" : "#634e3d",
      );
      mat.emissiveIntensity = complete
        ? 1.5
        : id === next
          ? 1.3 + Math.sin(time * 2) * 0.25
          : 0.1;
    }
    model.beamMaterial.opacity = state.completed.includes("beacon") ? 0.035 : 0;
    model.beamPivot.rotation.y = time * 0.16;
    model.boat.position.y = -0.3 + Math.sin(time * 0.8) * 0.09;
    model.boat.rotation.z = Math.sin(time * 0.65) * 0.025;
    model.pip.rotation.y = Math.sin(time * 0.45) * 0.1;
    water.material.uniforms.time.value = time * 0.42;
    composer.render();
    const site = SITES[next];
    const distance = Math.hypot(site.x - player.x, site.z - player.z);
    targetPoint.set(site.x, groundHeight(site.x, site.z) + 2.45, site.z);
    o.waypoint(
      projectWaypoint(
        camera,
        targetPoint,
        width,
        height,
        distance,
        state.playing && !state.distressSent,
      ),
    );
    if (!ready) {
      ready = true;
      o.ready();
    }
    if (now - lastHud > 100) {
      lastHud = now;
      o.telemetry({
        focus: state.playing ? focusedSite(player, model.obstacles) : null,
        distance,
        heading: ((((-player.yaw * 180) / Math.PI) % 360) + 360) % 360,
        moved,
        locked: document.pointerLockElement === canvas,
      });
    }
    if (state.playing && now - lastSave > 1500) {
      lastSave = now;
      save();
    }
  }
  const skyTask = new Promise<void>((resolve) => {
    new HDRLoader(manager).load(
      "/art/coastal-sunset.hdr",
      (texture) => {
        if (disposed) {
          texture.dispose();
          resolve();
          return;
        }
        sky = texture;
        texture.mapping = THREE.EquirectangularReflectionMapping;
        environment = pmrem.fromEquirectangular(texture);
        scene.environment = environment.texture;
        scene.environmentIntensity = 0.55;
        scene.background = texture;
        scene.backgroundIntensity = 0.28;
        scene.backgroundBlurriness = 0.035;
        scene.backgroundRotation.y = 4.1;
        scene.environmentRotation.y = 4.1;
        resolve();
      },
      undefined,
      () => resolve(),
    );
  });
  manager.itemEnd("island-setup");
  void Promise.all([skyTask, texturesReady])
    .then(async () => {
      if (disposed) return;
      await renderer.compileAsync(scene, camera);
      if (!disposed) frame = requestAnimationFrame(animate);
    })
    .catch(() => {
      if (!disposed) o.error();
    });
  return {
    position: () => ({ ...player }),
    capture,
    release,
    interact,
    stick(x: number, y: number) {
      stickX = x;
      stickY = y;
    },
    reset() {
      clear();
      player = { ...SPAWN };
      moved = false;
      save();
    },
    dispose() {
      disposed = true;
      release();
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("keyup", keyup);
      document.removeEventListener("mousemove", mouse);
      document.removeEventListener("pointerlockchange", lockChange);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", blur);
      window.removeEventListener("pagehide", save);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("webglcontextlost", lost);
      disposeScene(scene);
      environment?.dispose();
      sky?.dispose();
      normal.dispose();
      pmrem.dispose();
      water.material.uniforms.mirrorSampler.value?.dispose();
      composer.dispose();
      bloom.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
