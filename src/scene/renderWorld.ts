import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { disposeScene } from "./art";
import { buildSpaceship } from "./spaceship";
import { deckSection, roomAt, progressionStageAt } from "./shipLayout";
import {
  focusedSite,
  groundHeight,
  movePlayer,
  PLAYER_KEY,
  restorePlayer,
  SPAWN,
} from "./navigation";
import type { ChamberId as MissionId } from "../chambers";
import type { Circuit } from "../circuitKit";
import { gamePixelRatio } from "../viewport";
import { buildTitleSatellite } from "./titleSatellite";

export type Telemetry = {
  focus: MissionId | null;
  room: number;
  section: string;
};
export type WorldState = {
  playing: boolean;
  completed: MissionId[];
  reducedMotion: boolean;
  sensitivity: number;
  circuits: Circuit[];
  preview: boolean;
};
type Options = {
  container: HTMLDivElement;
  state: () => WorldState;
  ready: () => void;
  error: () => void;
  telemetry: (data: Telemetry) => void;
  interact: (id: MissionId) => void;
  pause: () => void;
  step: () => void;
  environment: (sound: "door" | "power") => void;
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
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const canvas = renderer.domElement;
  canvas.setAttribute(
    "aria-label",
    "First-person view of the research ship Asterion. WASD to move, mouse or arrow keys to look, E to use the circuit bench.",
  );
  canvas.setAttribute("role", "img");
  canvas.tabIndex = -1;
  o.container.prepend(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#020605");
  scene.add(new THREE.HemisphereLight("#bac8b8", "#161915", 0.27));
  const sun = new THREE.DirectionalLight("#a7ccdc", 0.75);
  sun.position.set(30, 18, -30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -26,
    right: 26,
    top: 45,
    bottom: -35,
    far: 140,
  });
  sun.shadow.normalBias = 0.035;
  sun.shadow.bias = -0.0002;
  scene.add(sun);
  const fill = new THREE.DirectionalLight("#b1c4c9", 0.18);
  fill.position.set(-10, 12, 20);
  scene.add(fill);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnvironment = new RoomEnvironment();
  const environment = pmrem.fromScene(roomEnvironment, 0.04);
  roomEnvironment.dispose();
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.2;
  const model = buildSpaceship(scene);
  let player = { ...SPAWN };
  try {
    player = restorePlayer(localStorage.getItem(PLAYER_KEY), model.obstacles);
    if (progressionStageAt(player.x, player.z) > o.state().completed.length)
      player = { ...SPAWN };
  } catch {
    /* Session-only play. */
  }
  const camera = new THREE.PerspectiveCamera(68, 1, 0.08, 650);
  camera.rotation.order = "YXZ";
  scene.add(camera);
  const titleSatellite = buildTitleSatellite(scene);
  const previewAim = new THREE.Vector2(),
    previewTarget = new THREE.Vector2();
  const previewPointer = (e: PointerEvent) => {
    if (
      !o.state().preview ||
      o.state().reducedMotion ||
      e.pointerType !== "mouse"
    )
      return;
    previewTarget.set(
      (e.clientX / innerWidth) * 2 - 1,
      (e.clientY / innerHeight) * 2 - 1,
    );
  };
  const previewLeave = (e: PointerEvent) => {
    if (!e.relatedTarget) previewTarget.set(0, 0);
  };
  window.addEventListener("pointermove", previewPointer, { passive: true });
  window.addEventListener("pointerout", previewLeave, { passive: true });
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const occlusion = new SSAOPass(scene, camera, 1, 1, 12);
  occlusion.kernelRadius = 0.45;
  occlusion.minDistance = 0.0002;
  occlusion.maxDistance = 0.018;
  occlusion.enabled = !coarse;
  composer.addPass(occlusion);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.16, 0.32, 2.1);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let disposed = false,
    frame = 0,
    last = performance.now(),
    time = 0,
    lastHud = 0,
    lastSave = 0,
    lastStep = 0;
  let stillFrame = "";
  let ready = false,
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
    occlusion.setSize(
      Math.max(1, Math.round(width * 0.75)),
      Math.max(1, Math.round(height * 0.75)),
    );
  };
  const observer = new ResizeObserver(resize);
  observer.observe(o.container);
  window.addEventListener("resize", resize);
  resize();
  let circuits: Circuit[] | null = null,
    revision = 0;

  function animate(now: number) {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    const dt = Math.min((now - last) / 1000, 0.06);
    last = now;
    const state = o.state();
    if (document.hidden) return;
    if (wasPlaying && !state.playing) release();
    wasPlaying = state.playing;
    if (circuits !== state.circuits) {
      circuits = state.circuits;
      revision++;
    }
    const frameKey = `${width}:${height}:${renderer.getPixelRatio()}:${state.preview}:${state.completed.join()}:${state.reducedMotion}:${revision}:${model.root.userData.textureRevision}`;
    if (
      !state.playing &&
      (!state.preview || state.reducedMotion) &&
      ready &&
      stillFrame === frameKey
    )
      return;
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

    camera.position.set(
      player.x,
      groundHeight(player.x, player.z) +
        1.68 +
        (walking && !state.reducedMotion ? Math.sin(time * 11) * 0.022 : 0),
      player.z,
    );
    if (state.preview) {
      // A separate orbital composition, using the existing exterior and textures.
      // Its pose never enters player navigation, progression, or the save file.
      const portrait = camera.aspect <= 0.85;
      previewAim.x = THREE.MathUtils.damp(previewAim.x, previewTarget.x, 4, dt);
      previewAim.y = THREE.MathUtils.damp(previewAim.y, previewTarget.y, 4, dt);
      const aimX = state.reducedMotion ? 0 : previewAim.x,
        aimY = state.reducedMotion ? 0 : previewAim.y;
      camera.fov = portrait
        ? Math.max(
            82,
            THREE.MathUtils.radToDeg(
              2 *
                Math.atan(
                  Math.tan(THREE.MathUtils.degToRad(21)) / camera.aspect,
                ),
            ),
          )
        : 54 + (state.reducedMotion ? 0 : Math.exp(-time * 1.8) * 5);
      camera.position.set(
        -37 + aimX * 0.6,
        12 + Math.sin(time * 0.14) * 0.24 + aimY * 0.25,
        82,
      );
      camera.lookAt(-170, 22, 60);
      camera.rotation.z = -0.12;
      camera.setViewOffset(
        width,
        height,
        -width * ((portrait ? 0.2 : 0.25) + aimX * 0.008),
        height * ((portrait ? 0.16 : 0.02) + aimY * 0.006),
        width,
        height,
      );
    } else {
      camera.fov = 68;
      camera.clearViewOffset();
      camera.rotation.set(player.pitch, player.yaw, 0, "YXZ");
    }
    // Warm the station passes before enabling Begin, then omit them in space.
    occlusion.enabled = !coarse && (!state.preview || !ready);
    bloom.enabled = !state.preview || !ready;
    titleSatellite.update(time, state.preview);
    camera.updateMatrixWorld();
    for (const event of model.update(
      dt,
      time,
      player,
      state.completed,
      state.reducedMotion,
      state.playing,
      state.circuits,
      state.preview,
    ))
      o.environment(event);
    renderer.shadowMap.needsUpdate = !!model.root.userData.shadowsDirty;
    composer.render();
    if (!ready) {
      ready = true;
      stillFrame = ""; // Redraw the reduced-motion title without the warmed passes.
      o.ready();
    }
    if (now - lastHud > 100) {
      lastHud = now;
      o.telemetry({
        focus: state.playing ? focusedSite(player, model.obstacles) : null,
        room: roomAt(player.x, player.z),
        section: deckSection(player.z, player.x),
      });
    }
    if (state.playing && now - lastSave > 1500) {
      lastSave = now;
      save();
    }
  }
  void Promise.resolve()
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
      window.removeEventListener("pointermove", previewPointer);
      window.removeEventListener("pointerout", previewLeave);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("webglcontextlost", lost);
      model.dispose();
      disposeScene(scene);
      environment.dispose();
      pmrem.dispose();
      composer.dispose();
      bloom.dispose();
      occlusion.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
