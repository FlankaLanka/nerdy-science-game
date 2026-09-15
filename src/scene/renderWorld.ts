import * as THREE from "three";
import { spatialMix } from "../soundscape";
import type { EnvironmentSound, SoundMix } from "../soundscape";
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
import { CHAMBERS } from "../chambers";
import {
  BENCH_HEIGHT,
  KIT_SCALE,
  benchFraming,
  benchWorldPoint,
} from "./benchView";
import type { BenchInteraction, BenchPoint, BenchView } from "./benchView";
import { focusedFormula, formulaFraming, formulaScreen, projectFormulaScreen } from "./formulaView";
import type { FormulaView } from "./formulaView";

export type Telemetry = {
  focus: MissionId | null;
  formula: number | null;
  room: number;
  section: string;
};
export type WorldState = {
  playing: boolean;
  completed: MissionId[];
  powered: MissionId[];
  godMode: boolean;
  reducedMotion: boolean;
  sensitivity: number;
  circuits: Circuit[];
  preview: boolean;
  activeBench: number | null;
  activeFormula: number | null;
};
type Options = {
  container: HTMLDivElement;
  state: () => WorldState;
  ready: () => void;
  error: () => void;
  telemetry: (data: Telemetry) => void;
  interact: (id: MissionId) => void;
  pause: () => void;
  environment: (sound: EnvironmentSound, mix: SoundMix) => void;
  benchView: (view: BenchView | null) => void;
  inspectFormula: (index: number) => void;
  formulaViewed: (index: number) => void;
  formulaView: (view: FormulaView | null) => void;
  cameraMoving: (moving: boolean) => void;
};
const empty = {
  capture() {},
  release() {},
  reset() {},
  position: () => ({ ...SPAWN }),
  interact() {},
  stick(_x: number, _y: number) {},
  setBenchInteraction(_interaction: BenchInteraction | null) {},
  benchPoint(_x: number, _y: number): BenchPoint | null {
    return null;
  },
  projectBench(_point: BenchPoint, _elevation = 0): BenchPoint | null {
    return null;
  },
  pickBench(_x: number, _y: number): string | null {
    return null;
  },
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
    "First-person view of the research ship Asterion. WASD to move, mouse or arrow keys to look, E to use a circuit bench or inspect a formula screen.",
  );
  canvas.setAttribute("role", "img");
  canvas.tabIndex = -1;
  o.container.prepend(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#020605");
  // Cool standby light reveals the room; its circuit supplies the overhead lights.
  scene.add(new THREE.HemisphereLight("#cfdeed", "#435869", 0.32));
  const sun = new THREE.DirectionalLight("#e2ecf3", 0.45);
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
  scene.add(sun, sun.target);
  let shadowX = 0, shadowZ = 0;
  const fill = new THREE.DirectionalLight("#b7d3e7", 0.14);
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
    const firstIncomplete = CHAMBERS.findIndex(c => !o.state().completed.includes(c.id));
    const reachedStage = firstIncomplete < 0 ? CHAMBERS.length : firstIncomplete;
    if (!o.state().godMode && progressionStageAt(player.x, player.z) > reachedStage)
      player = { ...SPAWN };
  } catch {
    /* Session-only play. */
  }
  const camera = new THREE.PerspectiveCamera(68, 1, 0.08, 650);
  camera.rotation.order = "YXZ";
  scene.add(camera);
  // A work light travels with the close-up; the room and its original kit stay mounted.
  const workLight = new THREE.PointLight("#e5efdd", 0, 5, 2);
  scene.add(workLight);
  let activeBench: number | null = null;
  let activeFormula: number | null = null;
  let formulaReported = false;
  let interaction: BenchInteraction | null = null;
  let interactionRevision = 0;
  let cameraTravel: {
    position: THREE.Vector3;
    rotation: THREE.Quaternion;
    fov: number;
    offsetX: number;
    offsetY: number;
    elapsed: number;
  } | null = null;
  let publishedView = "";
  let publishedFormulaView = "";
  const raycaster = new THREE.Raycaster();
  const boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BENCH_HEIGHT);
  const rayPoint = new THREE.Vector3();
  function benchRay(x: number, y: number) {
    if (
      activeBench === null ||
      cameraTravel ||
      o.state().activeBench !== activeBench
    )
      return false;
    const r = canvas.getBoundingClientRect();
    raycaster.setFromCamera(
      new THREE.Vector2(
        ((x - r.left) / r.width) * 2 - 1,
        1 - ((y - r.top) / r.height) * 2,
      ),
      camera,
    );
    return true;
  }
  function publishBenchView(view: BenchView | null) {
    const key = JSON.stringify(view);
    if (key === publishedView) return;
    publishedView = key;
    o.benchView(view);
  }
  function publishFormulaView(view: FormulaView | null) {
    const key = JSON.stringify(view);
    if (key === publishedFormulaView) return;
    publishedFormulaView = key;
    o.formulaView(view);
  }
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
  occlusion.kernelRadius = 0.25;
  occlusion.minDistance = 0.0002;
  occlusion.maxDistance = 0.009;
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
    lastSave = 0;
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
    if (disposed || o.state().activeBench !== null || o.state().activeFormula !== null || cameraTravel) return;
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
  function availableSite() {
    return focusedSite(player, model.obstacles);
  }
  function interact() {
    if (!o.state().playing || cameraTravel) return;
    const formula = focusedFormula(player, model.obstacles);
    if (formula !== null) {
      clear();
      o.inspectFormula(formula);
      return;
    }
    const id = availableSite();
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
    if (state.activeBench !== activeBench || state.activeFormula !== activeFormula) {
      activeBench = state.activeBench;
      activeFormula = state.activeFormula;
      formulaReported = false;
      cameraTravel = {
        position: camera.position.clone(),
        rotation: camera.quaternion.clone(),
        fov: camera.fov,
        offsetX: camera.view?.enabled ? camera.view.offsetX : 0,
        offsetY: camera.view?.enabled ? camera.view.offsetY : 0,
        elapsed: 0,
      };
      o.cameraMoving(true);
      publishFormulaView(null);
      clear();
      if (activeBench === null) interaction = null;
      publishBenchView({
        index: activeBench,
        ready: false,
        left: 0,
        top: 0,
        width: 0,
        height: 0,
      });
    }
    if (wasPlaying && !state.playing) release();
    wasPlaying = state.playing;
    if (circuits !== state.circuits) {
      circuits = state.circuits;
      revision++;
    }
    const frameKey = `${width}:${height}:${renderer.getPixelRatio()}:${state.preview}:${state.powered.join()}:${state.godMode}:${state.reducedMotion}:${revision}:${model.root.userData.textureRevision}:${activeBench}:${activeFormula}:${interactionRevision}`;
    if (
      !state.playing &&
      !cameraTravel &&
      (activeBench === null || state.reducedMotion) &&
      (!state.preview || state.reducedMotion) &&
      ready &&
      stillFrame === frameKey
    )
      return;
    stillFrame = state.playing ? "" : frameKey;
    let walking = false;
    if (state.playing && !cameraTravel && activeBench === null && activeFormula === null) {
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
      const framing = benchFraming(width, height);
      let offsetX = 0,
        offsetY = 0;
      if (activeBench !== null) {
        const bench = CHAMBERS[activeBench].bench;
        camera.position.set(bench.x, BENCH_HEIGHT + framing.distance, bench.z);
        camera.rotation.set(-Math.PI / 2, 0, 0, "YXZ");
        camera.fov = framing.fov;
        offsetX = framing.offsetX;
        offsetY = framing.offsetY;
        workLight.position.set(
          bench.x - 0.65,
          BENCH_HEIGHT + 1.25,
          bench.z - 0.35,
        );
      }
      if (activeFormula !== null) {
        const screen = formulaScreen(CHAMBERS[activeFormula]);
        const view = formulaFraming(width, height);
        camera.position.set(screen.x - view.distance, screen.y, screen.z);
        camera.rotation.set(0, -Math.PI / 2, 0, "YXZ");
        camera.fov = view.fov;
      }
      if (cameraTravel) {
        cameraTravel.elapsed += dt;
        const progress = state.reducedMotion
          ? 1
          : Math.min(1, cameraTravel.elapsed / 0.8);
        const eased = progress * progress * (3 - 2 * progress);
        camera.position.lerpVectors(
          cameraTravel.position,
          camera.position,
          eased,
        );
        // slerpQuaternions copies its start into `this`; preserve the destination.
        camera.quaternion.slerpQuaternions(
          cameraTravel.rotation,
          camera.quaternion.clone(),
          eased,
        );
        camera.fov = THREE.MathUtils.lerp(cameraTravel.fov, camera.fov, eased);
        offsetX = THREE.MathUtils.lerp(cameraTravel.offsetX, offsetX, eased);
        offsetY = THREE.MathUtils.lerp(cameraTravel.offsetY, offsetY, eased);
        if (progress === 1) {
          cameraTravel = null;
          o.cameraMoving(false);
          if (activeBench === null && activeFormula === null) canvas.focus({ preventScroll: true });
        }
      }
      camera.setViewOffset(width, height, offsetX, offsetY, width, height);
      workLight.intensity = state.reducedMotion
        ? activeBench === null
          ? 0
          : 2.6
        : THREE.MathUtils.damp(
            workLight.intensity,
            activeBench === null ? 0 : 2.6,
            6,
            dt,
          );
      camera.updateMatrixWorld();
      if (!cameraTravel) {
        if (activeFormula !== null && !formulaReported) {
          formulaReported = true;
          o.formulaViewed(activeFormula);
        }
        publishBenchView(
          activeBench === null
            ? null
            : {
                index: activeBench,
                ready: true,
                left: framing.left,
                top: framing.top,
                width: framing.width,
                height: framing.height,
              },
        );
      }
    }
    camera.updateProjectionMatrix();
    canvas.dataset.cameraMode = state.preview
      ? "preview"
      : cameraTravel
        ? "transition"
        : activeBench !== null
          ? "bench"
          : activeFormula !== null ? "formula" : "walk";
    // Warm the station passes before enabling Begin, then omit them in space.
    occlusion.enabled = !coarse && (!state.preview || !ready);
    const editing = activeBench !== null && !state.preview;
    bloom.enabled = (!state.preview || !ready) && !editing;
    renderer.toneMappingExposure = editing ? 0.85 : 1;
    titleSatellite.update(time, state.preview);
    camera.updateMatrixWorld();
    publishFormulaView(activeFormula !== null && !cameraTravel && !state.preview
      ? projectFormulaScreen(activeFormula, camera, width, height) : null);
    for (const event of model.update(
      dt,
      time,
      player,
      state.powered,
      state.reducedMotion,
      state.playing,
      state.circuits,
      state.preview,
      activeBench,
      interaction,
      state.godMode,
    ))
      o.environment(event.kind, spatialMix(event, player));
    // Preserve local shadow resolution as the player reaches the larger habitat.
    // Recenter in coarse steps so the shadow map remains cached during ordinary frames.
    const sx = !state.preview && player.z >= 35 ? Math.round(player.x / 12) * 12 : 0;
    const sz = !state.preview && player.z >= 35 ? Math.round(player.z / 12) * 12 : 0;
    const shadowMoved = sx !== shadowX || sz !== shadowZ;
    if (shadowMoved) {
      shadowX = sx; shadowZ = sz;
      sun.position.set(sx + 30, 18, sz - 30);
      sun.target.position.set(sx, 0, sz);
      sun.target.updateMatrixWorld(true);
    }
    renderer.shadowMap.needsUpdate = shadowMoved || !!model.root.userData.shadowsDirty;
    composer.render();
    if (!ready) {
      ready = true;
      stillFrame = ""; // Redraw the reduced-motion title without the warmed passes.
      o.ready();
    }
    if (now - lastHud > 100) {
      lastHud = now;
      o.telemetry({
        focus: state.playing ? availableSite() : null,
        formula: state.playing ? focusedFormula(player, model.obstacles) : null,
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
    setBenchInteraction(value: BenchInteraction | null) {
      interaction = value;
      interactionRevision++;
    },
    benchPoint(x: number, y: number): BenchPoint | null {
      if (
        !benchRay(x, y) ||
        !raycaster.ray.intersectPlane(boardPlane, rayPoint)
      )
        return null;
      const bench = CHAMBERS[activeBench!].bench;
      return {
        x: (rayPoint.x - bench.x) / KIT_SCALE + 450,
        y: (rayPoint.z - bench.z) / KIT_SCALE + 250,
      };
    },
    projectBench(point: BenchPoint, elevation = 0): BenchPoint | null {
      if (activeBench === null || cameraTravel) return null;
      const p = benchWorldPoint(
        CHAMBERS[activeBench].bench,
        point,
        elevation,
      ).project(camera);
      const r = canvas.getBoundingClientRect();
      return {
        x: r.left + ((p.x + 1) * r.width) / 2,
        y: r.top + ((1 - p.y) * r.height) / 2,
      };
    },
    pickBench(x: number, y: number): string | null {
      if (!benchRay(x, y)) return null;
      return model.pickBench(activeBench!, raycaster);
    },
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
