import { useEffect, useRef } from "react";
import * as THREE from "three";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { rounded, surface, disposeScene } from "./scene/art";
import type { Mission } from "./missions";
import type { Progress } from "./game";
import type { CircuitResult } from "./circuit";
import { FULL_POWER } from "./circuit";
import { gamePixelRatio } from "./viewport";

type Props = {
  mission: Mission;
  progress: Progress;
  result: CircuitResult | null;
  removed: boolean;
  onReady: (ready: boolean) => void;
};

/** The camera shares the exact 720×460 coordinate system of the accessible socket layer. */
export function BenchScene(props: Props) {
  const host = useRef<HTMLDivElement>(null),
    current = useRef(props);
  current.current = props;
  useEffect(() => {
    performance.mark("signal-kit-build");
    const container = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }
    let disposed = false;
    renderer.setPixelRatio(gamePixelRatio(1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true");
    container.append(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(
      -360,
      360,
      230,
      -230,
      0.1,
      1500,
    );
    camera.position.set(0, 900, 0);
    camera.up.set(0, 0, -1);
    camera.lookAt(0, 0, 0);
    const pmrem = new THREE.PMREMGenerator(renderer);
    let environment: THREE.WebGLRenderTarget | null = null;
    scene.environmentIntensity = 0.75;
    const lighting = new Promise<void>((resolve) =>
      new HDRLoader().load(
        "/art/coastal-sunset.hdr",
        (t) => {
          if (disposed) {
            t.dispose();
            return;
          }
          environment = pmrem.fromEquirectangular(t);
          scene.environment = environment.texture;
          t.dispose();
          resolve();
        },
        undefined,
        () => resolve(),
      ),
    );
    scene.add(new THREE.HemisphereLight("#cce1ec", "#182222", 1.35));
    const key = new THREE.DirectionalLight("#ffe2b2", 3.0);
    key.position.set(-230, 400, -150);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -450;
    key.shadow.camera.right = 450;
    key.shadow.camera.top = 380;
    key.shadow.camera.bottom = -380;
    key.shadow.camera.far = 1200;
    key.shadow.normalBias = 0.4;
    key.shadow.bias = -0.0001;
    key.shadow.radius = 3;
    scene.add(key);
    const fill = new THREE.DirectionalLight("#9bc3e3", 1.2);
    fill.position.set(330, 200, 200);
    scene.add(fill);
    const mat = (
      color: string,
      extra: THREE.MeshStandardMaterialParameters = {},
    ) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, ...extra });
    const brass = mat("#bb8d43", { metalness: 0.85, roughness: 0.3 });
    const nickel = mat("#aeb9b6", { metalness: 0.88, roughness: 0.3 });
    const dark = mat("#101d20", { metalness: 0.35, roughness: 0.4 });
    const ceramic = new THREE.MeshPhysicalMaterial({
      color: "#ddd8c4",
      roughness: 0.2,
      clearcoat: 0.8,
      clearcoatRoughness: 0.15,
    });
    const enamel = surface("metal", 1, "#638389", 0.42);
    enamel.roughness = 0.62;
    enamel.normalScale.set(0.13, 0.13);
    const timber = surface("wood", 1, "#c39b63");
    function mesh(
      g: THREE.BufferGeometry,
      m: THREE.Material,
      x: number,
      y: number,
      z: number,
      parent: THREE.Object3D = scene,
    ) {
      const v = new THREE.Mesh(g, m);
      v.position.set(x - 360, y, z - 230);
      v.castShadow = v.receiveShadow = true;
      parent.add(v);
      return v;
    }
    const box = (
      w: number,
      h: number,
      d: number,
      m: THREE.Material,
      x: number,
      y: number,
      z: number,
      r = 3,
    ) => mesh(rounded(w, h, d, r), m, x, y, z);
    const cyl = (
      r: number,
      h: number,
      m: THREE.Material,
      x: number,
      y: number,
      z: number,
    ) => mesh(new THREE.CylinderGeometry(r, r, h, 48), m, x, y, z);
    box(718, 16, 458, dark, 360, -12, 230, 9);
    box(696, 8, 436, enamel, 360, -2, 230, 7);
    for (const x of [22, 698])
      for (const z of [20, 438]) {
        cyl(6, 2, nickel, x, 4, z);
        box(6, 1, 1, dark, x, 5.1, z, 0.2);
      }
    // Four rubber feet and a folded leather carrying handle establish the kit as an object.
    for (const x of [96, 624])
      for (const z of [36, 424]) box(27, 2, 9, dark, x, 3, z, 2);
    box(96, 3, 3, brass, 360, 4, 33, 1);
    // Battery: recessed panel, ribbed end caps, retaining straps and binding posts.
    box(96, 13, 145, dark, 130, 10, 235, 10);
    box(80, 42, 118, brass, 130, 34, 235, 13);
    box(66, 3, 68, ceramic, 130, 57, 236, 3);
    for (const z of [184, 286]) {
      box(84, 44, 8, dark, 130, 32, z, 3);
      for (let i = 0; i < 7; i++)
        box(2, 3, 9, nickel, 100 + i * 10, 56, z, 0.5);
    }
    for (const z of [160, 310]) {
      box(13, 7, 35, brass, 130, 7, z, 2);
      cyl(9, 8, nickel, 130, 8, z);
    }
    // Ceramic sockets and lamp glass are actual illuminated meshes.
    const bulbs: {
      id: "a" | "b";
      group: THREE.Group;
      filament: THREE.MeshStandardMaterial;
      glass: THREE.MeshPhysicalMaterial;
      light: THREE.PointLight;
      glow: THREE.Sprite;
      level: number;
    }[] = [];
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = 128;
    glowCanvas.height = 128;
    const c = glowCanvas.getContext("2d")!;
    const gradient = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,216,148,.6)");
    gradient.addColorStop(0.2, "rgba(255,190,85,.18)");
    gradient.addColorStop(1, "rgba(255,150,40,0)");
    c.fillStyle = gradient;
    c.fillRect(0, 0, 128, 128);
    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    for (const lamp of props.mission.lamps) {
      const { x, y: z } = lamp;
      box(152, 6, 14, brass, x, 6, z, 3);
      box(103, 5, 90, dark, x, 5, z, 16);
      cyl(42, 12, ceramic, x, 15, z);
      cyl(33, 6, ceramic, x, 24, z);
      cyl(24, 7, brass, x, 30, z);
      cyl(18, 4, dark, x, 34, z);
      for (const dx of [-29, 29]) {
        cyl(3.6, 2, nickel, x + dx, 27, z);
        box(4, 1, 1, dark, x + dx, 28.2, z, 0.2);
      }
      const group = new THREE.Group();
      group.position.set(x - 360, 33, z - 230);
      group.rotation.x = -0.55;
      scene.add(group);
      const local = (
        g: THREE.BufferGeometry,
        m: THREE.Material,
        yy: number,
      ) => {
        const b = new THREE.Mesh(g, m);
        b.position.y = yy;
        b.castShadow = true;
        group.add(b);
        return b;
      };
      local(new THREE.CylinderGeometry(14, 14, 19, 48), nickel, 8);
      for (let i = 0; i < 5; i++) {
        const ring = local(
          new THREE.TorusGeometry(14, 1.6, 6, 48),
          brass,
          i * 3 + 1,
        );
        ring.rotation.x = Math.PI / 2;
      }
      const glass = new THREE.MeshPhysicalMaterial({
        color: "#b9d1ce",
        metalness: 0,
        roughness: 0.09,
        transmission: 0.85,
        thickness: 2,
        ior: 1.46,
        transparent: true,
        opacity: 0.32,
        clearcoat: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const profile = [
        [0, 16],
        [12, 16],
        [14, 22],
        [15, 28],
        [21, 35],
        [27, 43],
        [29, 52],
        [27, 63],
        [20, 71],
        [10, 76],
        [0, 78],
      ].map(([r, y]) => new THREE.Vector2(r, y));
      const envelope = local(new THREE.LatheGeometry(profile, 64), glass, 0);
      envelope.castShadow = false;
      const filament = mat("#eace9d", {
        emissive: "#ffb44d",
        emissiveIntensity: 0,
        metalness: 0.5,
        roughness: 0.28,
      });
      const points = [
        new THREE.Vector3(-7, 17, 0),
        new THREE.Vector3(-7, 45, 0),
        new THREE.Vector3(-4, 41, 0),
        new THREE.Vector3(0, 47, 0),
        new THREE.Vector3(4, 41, 0),
        new THREE.Vector3(7, 45, 0),
        new THREE.Vector3(7, 17, 0),
      ];
      const path = new THREE.CatmullRomCurve3(points);
      local(new THREE.TubeGeometry(path, 38, 0.7, 5, false), filament, 0);
      const light = new THREE.PointLight("#ffb852", 0, 330, 2);
      light.position.set(x - 360, 85, z - 260);
      scene.add(light);
      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTexture,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      glow.position.set(x - 360, 95, z - 260);
      glow.scale.set(220, 220, 1);
      scene.add(glow);
      bulbs.push({
        id: lamp.id,
        group,
        filament,
        glass,
        light,
        glow,
        level: 0,
      });
    }
    let strip: THREE.Mesh | undefined;
    const copper = mat("#cc9159", { metalness: 0.92, roughness: 0.26 });
    const bridgeGlass = new THREE.MeshPhysicalMaterial({
      color: "#b2d1d5",
      roughness: 0.16,
      transmission: 0.55,
      thickness: 8,
      transparent: true,
      opacity: 0.7,
    });
    if (props.mission.id === "workshop") {
      box(160, 9, 55, dark, 480, 8, 330, 7);
      strip = box(117, 9, 29, timber, 480, 19, 330, 2);
      for (const x of [418, 542]) {
        box(12, 7, 38, brass, x, 19, 330, 2);
        cyl(4, 2, nickel, x, 24, 330);
      }
    }
    for (const terminal of props.mission.terminals) {
      cyl(12, 4, dark, terminal.x, 7, terminal.y);
      cyl(8, 7, brass, terminal.x, 11, terminal.y);
      cyl(4, 1, dark, terminal.x, 15, terminal.y);
    }
    function resize() {
      renderer.setPixelRatio(gamePixelRatio(1.75));
      renderer.setSize(container.clientWidth, container.clientHeight);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    window.addEventListener("resize", resize);
    resize();
    const textures = new Set<THREE.Texture>();
    scene.traverse((n) => {
      if (n instanceof THREE.Mesh)
        for (const m of Array.isArray(n.material) ? n.material : [n.material])
          for (const t of Object.values(m))
            if (t instanceof THREE.Texture) textures.add(t);
    });
    let frame = 0,
      last = 0,
      signature = "",
      lastPaint = 0;
    const warmUntil = performance.now() + 3500;
    function render(now: number) {
      frame = requestAnimationFrame(render);
      const dt = Math.min((now - last) / 1000, 0.06);
      last = now;
      if (document.hidden) return;
      const p = current.current;
      const reduced = document.documentElement.dataset.motion === "reduce";
      const nextSignature = JSON.stringify([
        p.progress.material,
        p.result,
        p.removed,
        container.clientWidth,
        container.clientHeight,
        renderer.getPixelRatio(),
        reduced,
        [...textures].map((t) => t.version),
      ]);
      if (
        reduced &&
        signature === nextSignature &&
        (now > warmUntil || now - lastPaint < 240)
      )
        return;
      signature = nextSignature;
      lastPaint = now;
      for (const bulb of bulbs) {
        const target = p.result?.lamps[bulb.id].on
          ? Math.sqrt(p.result.lamps[bulb.id].power / FULL_POWER)
          : 0;
        bulb.level = THREE.MathUtils.lerp(
          bulb.level,
          target,
          reduced ? 1 : Math.min(1, dt * 8),
        );
        bulb.group.visible = !(p.removed && bulb.id === "a");
        bulb.filament.emissiveIntensity = bulb.level * 12;
        bulb.light.intensity = bulb.level * 22000;
        bulb.glass.emissive.set("#ffbb55");
        bulb.glass.emissiveIntensity = bulb.level * 0.65;
        (bulb.glow.material as THREE.SpriteMaterial).opacity =
          bulb.level * 0.78;
      }
      if (strip)
        strip.material =
          p.progress.material === "copper"
            ? copper
            : p.progress.material === "glass"
              ? bridgeGlass
              : timber;
      renderer.render(scene, camera);
    }
    const lost = (e: Event) => {
      e.preventDefault();
      current.current.onReady(false);
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    void lighting
      .then(async () => {
        if (disposed) return;
        await renderer.compileAsync(scene, camera);
        if (disposed) return;
        render(performance.now());
        current.current.onReady(true);
        performance.mark("signal-kit-ready");
      })
      .catch(() => {
        if (!disposed) current.current.onReady(false);
      });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      disposeScene(scene);
      [copper, bridgeGlass, timber].forEach((m) => m.dispose());
      glowTexture.dispose();
      environment?.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [props.mission.id]);
  return <div ref={host} className="bench-scene" aria-hidden="true" />;
}
