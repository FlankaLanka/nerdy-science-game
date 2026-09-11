import * as THREE from "three";
import { rng, rounded, rockGeometry, surface as loadSurface } from "./art";
import {
  SITES,
  terrainHeight,
  groundHeight,
  workshopFloorHeight,
} from "./navigation";
import { buildWorkshop } from "./workshop";
import { WORKSHOP } from "./workshopLayout";
import type { Obstacle } from "./navigation";
import type { MissionId } from "../missions";

export function buildIsland(
  scene: THREE.Scene,
  manager?: THREE.LoadingManager,
) {
  const surface = (
    name: string,
    repeat = 1,
    color = "#ffffff",
    metalness = 0,
  ) => loadSurface(name, repeat, color, metalness, manager);
  const obstacles: Obstacle[] = [];
  const root = new THREE.Group();
  scene.add(root);
  const wood = surface("wood", 1.2, "#9a8870");
  const stone = surface("rock", 2, "#98998c");
  const plaster = surface("plaster", 2, "#b9b6a0");
  const roof = surface("metal", 2, "#465b56", 0.45);
  const iron = new THREE.MeshStandardMaterial({
    color: "#2a3938",
    roughness: 0.58,
    metalness: 0.75,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: "#bf9b5a",
    roughness: 0.4,
    metalness: 0.75,
  });
  const red = surface("metal", 1, "#9f4b32", 0.3);
  const glass = new THREE.MeshStandardMaterial({
    color: "#233b3a",
    roughness: 0.18,
    metalness: 0.5,
  });
  const lightGroups: {
    id: MissionId;
    material: THREE.MeshStandardMaterial;
    light?: THREE.PointLight;
  }[] = [];
  function mesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = root,
  ) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    material: THREE.Material,
    parent: THREE.Object3D = root,
  ) {
    return mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z, parent);
  }
  function pole(
    a: THREE.Vector3,
    b: THREE.Vector3,
    radius: number,
    material: THREE.Material,
    parent: THREE.Object3D = root,
  ) {
    const delta = b.clone().sub(a);
    const p = mesh(
      new THREE.CylinderGeometry(radius, radius, delta.length(), 8),
      material,
      ...a.clone().add(b).multiplyScalar(0.5).toArray(),
      parent,
    );
    p.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      delta.normalize(),
    );
    return p;
  }
  function label(
    text: string,
    width: number,
    height: number,
    color = "#e7dcb9",
    background = "#253c38",
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeRect(18, 18, 988, 220);
    ctx.font = "600 83px Georgia";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.fillText(text, 512, 132, 920);
    // Painted wear belongs to the world object, not the game HUD.
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 1200; i++)
      ctx.clearRect(rng(i) * 1024, rng(i + 98) * 256, rng(i + 12) * 6, 1);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshStandardMaterial({ map, roughness: 0.9 }),
    );
  }
  function lamp(
    id: MissionId,
    x: number,
    y: number,
    z: number,
    intensity = 55,
  ) {
    const material = new THREE.MeshStandardMaterial({
      color: "#a99969",
      emissive: "#ffc470",
      emissiveIntensity: 0,
      roughness: 0.35,
    });
    mesh(new THREE.SphereGeometry(0.105, 12, 8), material, x, y, z);
    mesh(new THREE.ConeGeometry(0.31, 0.15, 16, 1, true), iron, x, y + 0.18, z);
    const light = new THREE.PointLight("#ffc578", 0, 11, 2);
    light.position.set(x, y - 0.05, z);
    root.add(light);
    light.userData.power = intensity;
    lightGroups.push({ id, material, light });
    return material;
  }
  // A continuous, textured surface: the same height function is used by walking physics.
  const ground = new THREE.PlaneGeometry(72, 80, 140, 156);
  ground.rotateX(-Math.PI / 2);
  ground.translate(0, 0, -2);
  const positions = ground.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const grass = new THREE.Color("#778268"),
    sand = new THREE.Color("#aaa08a");
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      z = positions.getZ(i);
    positions.setY(i, terrainHeight(x, z));
    const c = grass
      .clone()
      .lerp(
        sand,
        Math.max(0, Math.min(1, (Math.hypot(x / 34, (z + 2) / 38) - 0.66) * 4)),
      );
    c.multiplyScalar(0.87 + rng(i + 7) * 0.2);
    c.toArray(colors, i * 3);
  }
  ground.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  ground.computeVertexNormals();
  const groundMat = surface("ground", 22, "#c3bda5");
  groundMat.vertexColors = true;
  mesh(ground, groundMat, 0, 0, 0);

  const paths = [
    [
      [-3, 24],
      [-3, 14],
      [-3, 4],
    ],
    [
      [-3, 8],
      [5, 10],
      [13, 12],
      [23, 14],
    ],
    [
      [1, 8],
      [6, 2],
      [10, -6],
      [11, -15],
    ],
  ];
  const pathMat = surface("ground", 2, "#b1a289");
  for (const points of paths) {
    const curve = new THREE.CatmullRomCurve3(
      points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    );
    const vertices: number[] = [],
      uvs: number[] = [],
      indices: number[] = [];
    for (let i = 0; i <= 100; i++) {
      const t = i / 100,
        p = curve.getPoint(t),
        dir = curve.getTangent(t);
      const w = 1.05 + rng(i) * 0.17;
      for (const side of [-1, 1]) {
        const x = p.x + dir.z * w * side,
          z = p.z - dir.x * w * side;
        vertices.push(x, terrainHeight(x, z) + 0.018, z);
        uvs.push(side === -1 ? 0 : 1, t * 9);
      }
      if (i < 100) {
        const k = i * 2;
        indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mat = pathMat.clone();
    mat.side = THREE.DoubleSide;
    mesh(geo, mat, 0, 0, 0);
  }

  // Keeper’s workshop: open doorway, work surfaces, joinery, gutters and a sheltered repair cabinet.
  const workshop = buildWorkshop(workshopFloorHeight(), {
    wood,
    stone,
    plaster,
    roof,
    iron,
  });
  root.add(workshop.root);
  obstacles.push(...workshop.obstacles);
  const workshopSign = label("KEEPER’S WORKSHOP", 4.2, 0.46);
  workshopSign.position.set(-6, workshop.signY, 2.68);
  root.add(workshopSign);
  lamp("workshop", -6, workshop.porchLampY, workshop.porchLampZ, 80);
  lamp("workshop", -6, workshop.interiorLampY, -1, 65);

  // Every puzzle lives in a physical cabinet with a power indicator.
  const indicators: Record<string, THREE.MeshStandardMaterial> = {};
  for (const [id, site] of Object.entries(SITES)) {
    const y = groundHeight(site.x, site.z),
      group = new THREE.Group();
    group.position.set(site.x, y, site.z);
    root.add(group);
    box(0, 0.43, 0, 0.75, 0.9, 0.36, iron, group);
    mesh(
      rounded(1.05, 1.15, 0.5, 0.06),
      id === "workshop" ? roof : red,
      0,
      1.32,
      0,
      group,
    );
    box(0, 1.32, 0.27, 0.89, 0.96, 0.055, iron, group);
    const plate = label(
      id === "workshop"
        ? "POWER / 01"
        : id === "harbor"
          ? "RELAY / 02"
          : "BEACON / 03",
      0.79,
      0.18,
      "#e4d3a4",
      "#29332f",
    );
    plate.position.set(0, 1.65, 0.306);
    group.add(plate);
    for (const x of [-0.36, 0.36])
      for (const h of [0.92, 1.73])
        mesh(new THREE.SphereGeometry(0.023, 6, 4), brass, x, h, 0.312, group);
    for (let i = 0; i < 4; i++)
      box(-0.13, 1.29 - i * 0.085, 0.31, 0.37, 0.025, 0.02, roof, group);
    box(0.31, 1.25, 0.34, 0.045, 0.22, 0.09, brass, group);
    const indicator = new THREE.MeshStandardMaterial({
      color: "#ceae74",
      emissive: "#f6c268",
      emissiveIntensity: 0.7,
    });
    mesh(
      new THREE.SphereGeometry(0.058, 12, 8),
      indicator,
      0.25,
      1.51,
      0.32,
      group,
    );
    indicators[id] = indicator;
    pole(
      new THREE.Vector3(-0.36, 0, 0),
      new THREE.Vector3(-0.36, 0.8, 0),
      0.035,
      iron,
      group,
    );
    obstacles.push({ x: site.x, z: site.z, width: 1.05, depth: 0.6 });
  }

  // Weathered jetty, mooring ropes and paired harbor lamps.
  for (let x = 22; x <= 34; x += 0.33)
    box(x, 0.82, 14.5, 0.31, 0.26, 4.2, wood);
  for (let x = 22; x <= 34; x += 3)
    for (const z of [12.4, 16.6]) {
      box(x, -0.1, z, 0.25, 4.2, 0.25, wood);
      mesh(
        new THREE.TorusGeometry(0.18, 0.04, 5, 12),
        wood,
        x,
        1.52,
        z,
      ).rotation.x = Math.PI / 2;
      if (x < 34)
        pole(
          new THREE.Vector3(x, 1.65, z),
          new THREE.Vector3(x + 3, 1.65, z),
          0.024,
          wood,
        );
    }
  for (const x of [23, 31]) {
    box(x, 2.3, 16.5, 0.09, 3.3, 0.09, iron);
    pole(
      new THREE.Vector3(x, 3.9, 16.5),
      new THREE.Vector3(x, 3.9, 15.9),
      0.06,
      iron,
    );
    lamp("harbor", x, 3.75, 15.9, 80);
  }
  const dockSign = label("HARBOR →", 1.8, 0.48);
  dockSign.position.set(18.4, terrainHeight(18.4, 13) + 1.6, 13);
  root.add(dockSign);
  box(18.4, terrainHeight(18.4, 13) + 0.8, 12.98, 0.13, 1.6, 0.13, wood);
  const boat = new THREE.Group();
  root.add(boat);
  boat.position.set(30, -0.3, 20.5);
  boat.rotation.y = Math.PI / 2;
  const hull = mesh(
    new THREE.SphereGeometry(
      1,
      24,
      12,
      0,
      Math.PI * 2,
      Math.PI / 2,
      Math.PI / 2,
    ),
    red,
    0,
    0.15,
    0,
    boat,
  );
  hull.scale.set(1.2, 0.8, 3.1);
  box(0, 0.14, 0, 2.12, 0.09, 4.7, wood, boat);
  for (const z of [-1.3, 0, 1.3]) box(0, 0.35, z, 2.05, 0.12, 0.3, wood, boat);
  pole(
    new THREE.Vector3(-0.85, 0.6, -2),
    new THREE.Vector3(0.85, 0.6, 2),
    0.06,
    wood,
    boat,
  );

  // Full scale lighthouse, with masonry bands, gallery railings, glass and an animated lens.
  const ly = terrainHeight(11, -21);
  mesh(
    new THREE.CylinderGeometry(3.15, 3.45, 0.5, 48),
    stone,
    11,
    ly + 0.1,
    -21,
  );
  mesh(
    new THREE.CylinderGeometry(1.72, 2.65, 16, 48),
    plaster,
    11,
    ly + 8.2,
    -21,
  );
  obstacles.push({ x: 11, z: -21, radius: 2.75 });
  for (let h = 1.7; h < 16; h += 2.2) {
    const radius = 2.65 - (h / 16) * 0.93;
    mesh(
      new THREE.CylinderGeometry(radius + 0.035, radius + 0.075, 0.14, 48),
      stone,
      11,
      ly + h,
      -21,
    );
  }
  box(11, ly + 1.3, -18.45, 1.2, 2.6, 0.15, wood);
  const lighthouseSign = label("NORTH POINT", 2.4, 0.52);
  lighthouseSign.position.set(11, ly + 3.15, -18.38);
  root.add(lighthouseSign);
  for (const h of [5, 9, 13])
    box(11, ly + h, -21 + (2.65 - (h / 16) * 0.93), 0.55, 1.15, 0.09, glass);
  mesh(
    new THREE.CylinderGeometry(2.6, 2.3, 0.3, 48),
    stone,
    11,
    ly + 16.3,
    -21,
  );
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    box(
      11 + Math.sin(a) * 2.5,
      ly + 16.95,
      -21 + Math.cos(a) * 2.5,
      0.055,
      1.2,
      0.055,
      iron,
    );
  }
  for (const y of [16.7, 17.5])
    mesh(
      new THREE.TorusGeometry(2.5, 0.045, 6, 48),
      iron,
      11,
      ly + y,
      -21,
    ).rotation.x = Math.PI / 2;
  const lanternGlass = new THREE.MeshStandardMaterial({
    color: "#b1d1c4",
    transparent: true,
    opacity: 0.19,
    roughness: 0.12,
    metalness: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  mesh(
    new THREE.CylinderGeometry(1.62, 1.62, 2.6, 12, 1, true),
    lanternGlass,
    11,
    ly + 17.85,
    -21,
  );
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    box(
      11 + Math.sin(a) * 1.64,
      ly + 17.85,
      -21 + Math.cos(a) * 1.64,
      0.07,
      2.6,
      0.07,
      iron,
    );
  }
  mesh(new THREE.ConeGeometry(2.1, 1.3, 32), roof, 11, ly + 19.8, -21);
  pole(
    new THREE.Vector3(11, ly + 20.3, -21),
    new THREE.Vector3(11, ly + 22, -21),
    0.07,
    brass,
  );
  const lens = new THREE.MeshStandardMaterial({
    color: "#bcc1a8",
    emissive: "#ffd69a",
    emissiveIntensity: 0,
    roughness: 0.2,
    metalness: 0.3,
  });
  mesh(
    new THREE.CylinderGeometry(0.65, 0.65, 1.6, 32),
    lens,
    11,
    ly + 17.85,
    -21,
  );
  for (let h = -0.7; h <= 0.7; h += 0.14)
    mesh(
      new THREE.TorusGeometry(0.68, 0.045, 8, 32),
      brass,
      11,
      ly + 17.85 + h,
      -21,
    ).rotation.x = Math.PI / 2;
  lightGroups.push({ id: "beacon", material: lens });
  lamp("beacon", 11, ly + 3.8, -18.1, 95);
  const beamPivot = new THREE.Group();
  beamPivot.position.set(11, ly + 17.85, -21);
  root.add(beamPivot);
  const beamMaterial = new THREE.MeshBasicMaterial({
    color: "#ffe4b5",
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const beam = mesh(
    new THREE.ConeGeometry(12, 120, 48, 1, true),
    beamMaterial,
    0,
    0,
    -60,
    beamPivot,
  );
  beam.rotation.x = Math.PI / 2;

  // Low stone boundaries give the paths a readable silhouette at eye level.
  const rockMat = surface("rock", 1, "#8d9287");
  const rockGeos = [0, 1, 2, 3].map((i) => rockGeometry(i * 6, 1));
  for (let i = 0; i < 190; i++) {
    const a = rng(i + 11) * Math.PI * 2,
      r = 0.75 + rng(i + 700) * 0.29;
    const x = Math.sin(a) * 33 * r,
      z = Math.cos(a) * 37 * r - 2;
    if (x > 18 && z > 10 && z < 18) continue;
    const scale = 0.5 + rng(i + 71) * 2.4;
    const rock = mesh(
      rockGeos[i % 4],
      rockMat,
      x,
      terrainHeight(x, z) - 0.2,
      z,
    );
    rock.scale.set(scale, scale * (0.4 + rng(i + 13) * 0.7), scale * 0.8);
    rock.rotation.y = i * 1.9;
    if (r < 0.87 && scale > 0.8) obstacles.push({ x, z, radius: scale * 0.65 });
  }
  for (let i = 0; i < 28; i++) {
    const z = 5 + i * 0.54,
      x = i % 2 === 0 ? -4.7 : -1.3;
    const rock = mesh(
      rockGeos[i % 4],
      rockMat,
      x,
      terrainHeight(x, z) + 0.05,
      z,
    );
    rock.scale.set(0.28, 0.16, 0.27);
    rock.rotation.y = i;
  }

  // Layered pine boughs use photographic alpha cutouts instead of cone silhouettes.
  const textureLoader = new THREE.TextureLoader(manager);
  const pineMap = textureLoader.load("/art/pine-color.webp");
  pineMap.colorSpace = THREE.SRGBColorSpace;
  const pineAlpha = textureLoader.load("/art/pine-alpha.webp");
  pineMap.anisotropy = 4;
  pineAlpha.anisotropy = 4;
  const foliage = new THREE.MeshStandardMaterial({
    map: pineMap,
    alphaMap: pineAlpha,
    alphaTest: 0.38,
    side: THREE.DoubleSide,
    color: "#b3c19b",
    roughness: 0.93,
  });
  const bough = new THREE.PlaneGeometry(0.7, 1.4);
  const twigUV = bough.attributes.uv;
  for (let i = 0; i < twigUV.count; i++)
    twigUV.setXY(
      i,
      0.025 + twigUV.getX(i) * 0.205,
      0.56 + twigUV.getY(i) * 0.415,
    );
  const needles = new THREE.InstancedMesh(bough, foliage, 6500);
  const leafTransform = new THREE.Object3D();
  let leafCount = 0;
  const treeSpots = [
    [-15, 8],
    [-17, 1],
    [-14, -9],
    [-19, -12],
    [-10, -13],
    [-4, -12],
    [-19, 15],
    [-12, 20],
    [6, 18],
    [11, 18],
    [18, 3],
    [21, -4],
    [23, -12],
    [1, -20],
    [-6, -23],
    [18, -27],
    [6, -30],
  ];
  for (let i = 0; i < treeSpots.length; i++) {
    const [x, z] = treeSpots[i],
      y = terrainHeight(x, z),
      h = 6 + rng(i + 80) * 5;
    mesh(new THREE.CylinderGeometry(0.1, 0.3, h, 9), wood, x, y + h / 2, z);
    obstacles.push({ x, z, radius: 0.38 });
    for (let branch = 0; branch < 26; branch++) {
      const angle = branch * 2.399 + i,
        level = branch / 26;
      const reach = (1 - level * 0.82) * h * 0.29;
      const start = new THREE.Vector3(x, y + h * (0.29 + level * 0.65), z);
      const end = start
        .clone()
        .add(
          new THREE.Vector3(
            Math.cos(angle) * reach,
            0.2 + level * 0.35,
            Math.sin(angle) * reach,
          ),
        );
      pole(start, end, 0.035 * (1 - level * 0.6), wood);
      for (let spray = 0; spray < 14; spray++) {
        const along = 0.35 + rng(i * 400 + branch * 14 + spray) * 0.8;
        leafTransform.position
          .copy(start)
          .lerp(end, along)
          .add(
            new THREE.Vector3(
              (rng(spray + branch) - 0.5) * 0.75,
              (rng(spray * 5 + i) - 0.3) * 0.5,
              (rng(branch + spray * 7) - 0.5) * 0.75,
            ),
          );
        leafTransform.rotation.set(
          0.2 + spray * 0.33,
          angle + spray * 1.1,
          -0.8 + (spray % 4) * 0.5,
        );
        leafTransform.scale.setScalar(
          (0.7 + rng(branch + spray + i) * 0.55) * (1 - level * 0.4),
        );
        leafTransform.updateMatrix();
        needles.setMatrixAt(leafCount++, leafTransform.matrix);
      }
    }
  }
  needles.count = leafCount;
  needles.castShadow = true;
  needles.receiveShadow = true;
  root.add(needles);
  // Instanced grass blades and wildflowers supply close-range detail cheaply.
  const blade = new THREE.BufferGeometry();
  blade.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        -0.016, 0, 0, 0.016, 0, 0, -0.002, 0.18, 0.015, 0.02, 0.18, 0.015,
        0.045, 0.33, 0.045,
      ],
      3,
    ),
  );
  blade.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
  blade.computeVertexNormals();
  const bladeMat = new THREE.MeshStandardMaterial({
    color: "#71825e",
    roughness: 1,
    side: THREE.DoubleSide,
  });
  const wind = { value: 0 };
  bladeMat.onBeforeCompile = (shader) => {
    shader.uniforms.islandWind = wind;
    shader.vertexShader = "uniform float islandWind;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      float gust = sin(islandWind * 1.1 + instanceMatrix[3].x * .35 + instanceMatrix[3].z * .28);
      transformed.x += gust * position.y * position.y * .48;
      transformed.z += gust * position.y * position.y * .22;`,
    );
  };
  const blades = new THREE.InstancedMesh(blade, bladeMat, 50000);
  const dummy = new THREE.Object3D(),
    grassTint = new THREE.Color();
  let count = 0;
  for (let i = 0; i < 75000 && count < 50000; i++) {
    const x = (rng(i + 3000) - 0.5) * 57,
      z = (rng(i + 17000) - 0.5) * 64 - 2;
    if (Math.hypot(x / 34, (z + 2) / 38) > 0.8) continue;
    if (
      Math.abs(x - WORKSHOP.x) < WORKSHOP.width / 2 + 0.8 &&
      z > WORKSHOP.z - WORKSHOP.depth / 2 - 0.6 &&
      z < WORKSHOP.z + WORKSHOP.depth / 2 + WORKSHOP.porchDepth + 0.4
    )
      continue;
    if (Math.abs(x + 3) < 1.4 && z > 3) continue;
    if (Math.abs(z - (x + 3) * 0.2 - 8) < 1.6 && x > -4 && x < 24) continue;
    if (Math.abs(x - (7 - z * 0.35)) < 2 && z > -17 && z < 9) continue;
    if (Math.hypot(x - 11, z + 21) < 4) continue;
    dummy.position.set(x, terrainHeight(x, z), z);
    dummy.rotation.set(0, rng(i + 34) * 6.28, (rng(i + 90) - 0.5) * 0.55);
    dummy.scale.setScalar(0.5 + rng(i + 888) * 0.9);
    dummy.updateMatrix();
    blades.setMatrixAt(count, dummy.matrix);
    grassTint.setHSL(0.18 + rng(i) * 0.08, 0.16, 0.3 + rng(i + 66) * 0.24);
    blades.setColorAt(count++, grassTint);
  }
  blades.count = count;
  blades.receiveShadow = true;
  root.add(blades);
  // Utility poles and drooping copper cables visually connect the repairs.
  const wirePoints: THREE.Vector3[] = [];
  for (const [x, z] of [
    [-0.5, 6],
    [8, 10],
    [17, 13],
    [13, 0],
    [13, -10],
  ]) {
    const y = terrainHeight(x, z);
    box(x, y + 3.4, z, 0.2, 6.8, 0.2, wood);
    box(x, y + 6.3, z, 1.2, 0.12, 0.12, wood);
    obstacles.push({ x, z, radius: 0.18 });
    wirePoints.push(new THREE.Vector3(x, y + 6.4, z));
  }
  for (const [a, b] of [
    [0, 1],
    [1, 2],
    [1, 3],
    [3, 4],
  ]) {
    const mid = wirePoints[a].clone().add(wirePoints[b]).multiplyScalar(0.5);
    mid.y -= 0.8;
    const curve = new THREE.CatmullRomCurve3([
      wirePoints[a],
      mid,
      wirePoints[b],
    ]);
    mesh(new THREE.TubeGeometry(curve, 24, 0.022, 5, false), iron, 0, 0, 0);
  }
  // A small field companion, waiting beside the first repair.
  const pip = new THREE.Group();
  pip.position.set(-4.55, groundHeight(-4.55, 4.3), 4.3);
  root.add(pip);
  for (const x of [-0.19, 0.19]) {
    mesh(rounded(0.2, 0.2, 0.32), iron, x, 0.13, 0.08, pip);
    box(x, 0.3, 0, 0.08, 0.3, 0.08, brass, pip);
  }
  mesh(rounded(0.66, 0.5, 0.38), brass, 0, 0.67, 0, pip);
  box(0, 0.72, 0.21, 0.53, 0.18, 0.04, iron, pip);
  const eyes = new THREE.MeshBasicMaterial({ color: "#a3e7d8" });
  for (const x of [-0.14, 0.14])
    mesh(new THREE.SphereGeometry(0.045, 12, 8), eyes, x, 0.72, 0.245, pip);
  pole(
    new THREE.Vector3(0.21, 0.88, 0),
    new THREE.Vector3(0.3, 1.15, 0),
    0.017,
    iron,
    pip,
  );
  mesh(new THREE.SphereGeometry(0.036, 8, 6), eyes, 0.3, 1.15, 0, pip);
  obstacles.push({ x: -4.55, z: 4.3, radius: 0.35 });
  return {
    wind,
    obstacles,
    lightGroups,
    indicators,
    beamPivot,
    beamMaterial,
    boat,
    pip,
  };
}
