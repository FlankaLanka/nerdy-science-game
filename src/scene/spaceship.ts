import * as THREE from "three";
import { rounded, rng } from "./art";
import { DECK, DOORWAYS, FURNITURE, SHIP_SITES } from "./shipLayout";
import type { MissionId } from "../missions";
import type { Obstacle, Player } from "./navigation";

const UP = new THREE.Vector3(0, 1, 0);

export function buildSpaceship(scene: THREE.Scene) {
  const root = new THREE.Group();
  root.name = "Asterion / deck 07";
  scene.add(root);
  const obstacles: Obstacle[] = FURNITURE.map((item) => ({ ...item }));
  const mat = (color: string, metalness = 0.5, roughness = 0.45) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const hull = mat("#334451", 0.55, 0.48);
  const dark = mat("#101a24", 0.6, 0.4);
  const rim = mat("#69818f", 0.72, 0.34);
  const white = mat("#a1b2bd", 0.42, 0.36);
  const floor = mat("#253341", 0.6, 0.38);
  const black = mat("#070f19", 0.3, 0.6);
  const amber = mat("#c87d36", 0.45, 0.46);
  const glow = (color: string, strength = 2) =>
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: strength,
      metalness: 0.1,
      roughness: 0.3,
    });
  const cyan = glow("#63f4e2", 2.5);
  const orange = glow("#ffae5e", 2.5);
  const violet = glow("#b5b0ff", 2.2);
  const softWhite = glow("#bcdae3", 1.8);

  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
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
    const mesh = new THREE.Mesh(boxGeometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
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
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function rod(
    a: THREE.Vector3,
    b: THREE.Vector3,
    radius: number,
    material: THREE.Material,
    parent: THREE.Object3D = root,
  ) {
    const delta = b.clone().sub(a);
    const object = mesh(
      new THREE.CylinderGeometry(radius, radius, delta.length(), 8),
      material,
      0,
      0,
      0,
      parent,
    );
    object.position.copy(a).add(b).multiplyScalar(0.5);
    object.quaternion.setFromUnitVectors(UP, delta.normalize());
    return object;
  }
  function textPanel(
    text: string,
    sub: string,
    w: number,
    h: number,
    color = "#9beee7",
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#0a1822";
    c.fillRect(0, 0, 1024, 256);
    c.strokeStyle = color;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(0, 2);
    c.lineTo(1024, 2);
    c.stroke();
    c.fillStyle = color;
    c.font = '500 65px "Space Grotesk", sans-serif';
    c.fillText(text, 35, 116, 954);
    c.globalAlpha = 0.65;
    c.font = '400 28px "IBM Plex Mono", monospace';
    c.fillText(sub, 37, 183, 950);
    for (let y = 0; y < 256; y += 4) {
      c.fillStyle = "#020911";
      c.globalAlpha = 0.14;
      c.fillRect(0, y, 1024, 1);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map, toneMapped: false }),
    );
  }
  function panelAt(
    text: string,
    sub: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    color?: string,
    rotation = 0,
  ) {
    const p = textPanel(text, sub, w, h, color);
    p.position.set(x, y, z);
    p.rotation.y = rotation;
    root.add(p);
    return p;
  }
  const powerMaterials: {
    id: MissionId;
    material?: THREE.MeshStandardMaterial;
    light?: THREE.PointLight;
    strength: number;
    level: number;
  }[] = [];
  function poweredStrip(
    id: MissionId,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) {
    const material = glow(SHIP_SITES[id].color, 0.12);
    box(x, y, z, w, h, d, material);
    powerMaterials.push({ id, material, strength: 3, level: 0.12 });
  }

  for (const room of DECK) {
    const passage = room.width === 6;
    const color = passage
      ? cyan
      : room.id === "relay"
        ? orange
        : room.id === "command"
          ? violet
          : cyan;
    const id: MissionId =
      room.id === "command" || room.id === "forward-passage"
        ? "beacon"
        : room.id === "relay"
          ? "harbor"
          : "workshop";
    box(0, -0.22, room.z, room.width, 0.44, room.depth, black);
    // Individual inset deck plates give useful scale, seams, and reflected light.
    for (let x = -room.width / 2 + 1; x < room.width / 2; x += 2)
      for (
        let z = room.z - room.depth / 2 + 1;
        z < room.z + room.depth / 2;
        z += 2
      ) {
        const depth = Math.min(1.95, room.z + room.depth / 2 - (z - 1));
        box(x, -0.035, z - 1 + depth / 2, 1.95, 0.06, depth, floor);
        if (Math.abs(x) > 2.5) box(x, 0.001, z - 0.65, 0.45, 0.006, 0.035, rim);
      }
    for (const side of [-1, 1]) {
      const x = (side * room.width) / 2;
      box(x, 0.46, room.z, 0.32, 0.92, room.depth, hull);
      box(x, room.height - 0.42, room.z, 0.32, 0.84, room.depth, hull);
      box(x - side * 0.17, 0.94, room.z, 0.09, 0.04, room.depth, color);
      // Observation glazing is clear; structural ribs and mullions frame real space outside.
      const isWindow = !passage && (side === 1 || room.id === "command");
      if (!isWindow)
        box(x, room.height / 2, room.z, 0.3, room.height, room.depth, hull);
      else {
        const glass = new THREE.MeshPhysicalMaterial({
          color: "#81b9cf",
          transparent: true,
          opacity: 0.055,
          roughness: 0.1,
          metalness: 0.1,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        box(
          x,
          room.height / 2,
          room.z,
          0.035,
          room.height - 1.7,
          room.depth,
          glass,
        );
      }
      for (
        let z = room.z - room.depth / 2 + 0.22;
        z <= room.z + room.depth / 2;
        z += passage ? 2.5 : 3.3
      ) {
        box(x - side * 0.22, room.height / 2, z, 0.35, room.height, 0.18, dark);
        box(x - side * 0.42, 1.55, z, 0.08, 0.48, 0.22, color);
        if (!isWindow && !passage) {
          box(x - side * 0.19, 2.25, z + 1.45, 0.045, 2.2, 2.5, dark);
          for (let k = 0; k < 4; k++)
            box(
              x - side * 0.23,
              2.8 - k * 0.27,
              z + 1.45,
              0.04,
              0.05,
              1.8,
              rim,
            );
        }
      }
      poweredStrip(
        id,
        side * (room.width / 2 - 0.7),
        0.01,
        room.z,
        0.065,
        0.018,
        room.depth - 0.4,
      );
      box(side * 1.7, 0.012, room.z, 0.035, 0.02, room.depth, color);
    }
    box(0, room.height + 0.15, room.z, room.width, 0.3, room.depth, dark);
    for (
      let z = room.z - room.depth / 2 + 0.4;
      z < room.z + room.depth / 2;
      z += 3.3
    ) {
      box(0, room.height - 0.1, z, room.width, 0.28, 0.28, hull);
      box(0, room.height - 0.27, z, passage ? 3 : 6, 0.06, 0.18, softWhite);
      for (const side of [-1, 1]) {
        rod(
          new THREE.Vector3(
            side * (room.width / 2 - 0.15),
            room.height - 1.2,
            z,
          ),
          new THREE.Vector3(
            side * (room.width / 2 - 1.4),
            room.height - 0.15,
            z,
          ),
          0.12,
          rim,
        );
      }
    }
    for (const x of [-0.85, 0.85])
      rod(
        new THREE.Vector3(x, room.height - 0.4, room.z - room.depth / 2),
        new THREE.Vector3(x, room.height - 0.4, room.z + room.depth / 2),
        0.08,
        rim,
      );
    if (!passage) {
      const light = new THREE.PointLight(room.color, 35, 18, 2);
      light.position.set(0, 3.9, room.z);
      root.add(light);
      const restored = new THREE.PointLight("#bdedff", 0, 19, 2);
      restored.position.set(0, 3.4, room.z + 3);
      root.add(restored);
      powerMaterials.push({
        id,
        light: restored,
        strength: 1,
        level: 0,
      });
    }
  }

  // Solid bulkheads meet the passage walls, with a 5.2 m opening down the deck axis.
  for (const [z, width, height] of [
    [7, 16, 5.4],
    [4, 16, 5.4],
    [-10, 16, 5.4],
    [-14, 20, 6],
  ] as const) {
    const sideWidth = (width - 5.2) / 2;
    for (const side of [-1, 1]) {
      const x = side * (2.6 + sideWidth / 2);
      box(x, height / 2, z, sideWidth, height, 0.36, hull);
      obstacles.push({ x, z, width: sideWidth, depth: 0.36 });
      box(side * 2.7, 1.9, z + 0.23, 0.17, 3.8, 0.22, rim);
      box(side * 2.57, 1.8, z + 0.36, 0.035, 3.6, 0.045, cyan);
    }
    box(0, (height + 3.6) / 2, z, 5.2, height - 3.6, 0.36, hull);
    box(0, 3.64, z + 0.18, 5.3, 0.12, 0.18, rim);
  }
  box(0, 2.7, 24, 16, 5.4, 0.4, hull);
  panelAt(
    "ASTERION",
    "DEEP SPACE RESEARCH / DECK 07",
    0,
    3,
    23.77,
    6,
    1.5,
    "#95c5d5",
    Math.PI,
  );
  // The forward observation wall has a broad, uninterrupted view of the planet.
  box(0, 0.52, -29, 20, 1.04, 0.3, hull);
  box(0, 5.65, -29, 20, 0.7, 0.3, hull);
  box(0, 1.07, -28.82, 19.8, 0.045, 0.06, violet);
  for (const x of [-10, -5, 0, 5, 10]) box(x, 3.1, -29, 0.14, 4.4, 0.2, rim);
  panelAt(
    "02  /  POWER RELAY",
    "DISTRIBUTION BUS  •  FORWARD",
    0,
    4.4,
    7.22,
    4.8,
    0.82,
    "#ffb568",
  );
  panelAt(
    "03  /  COMMAND",
    "LONG-RANGE COMMUNICATIONS",
    0,
    4.5,
    -9.78,
    4.8,
    0.82,
    "#b5b0ff",
  );

  const doors = DOORWAYS.map((z) => {
    const leaves: { mesh: THREE.Mesh; obstacle: Obstacle; side: number }[] = [];
    for (const side of [-1, 1]) {
      // Initialize open so a valid saved position in the aperture can resume.
      // The first world update closes unoccupied doors before play.
      const leaf = box(side * 3.85, 1.8, z, 2.5, 3.6, 0.2, hull);
      const stripe = box(0, 0, 0, 0.05, 2.4, 0.25, cyan, leaf);
      stripe.position.set(-side * 0.46, 0, 0);
      stripe.scale.set(0.02, 0.67, 1.2);
      const obstacle = { x: side * 3.85, z, width: 2.5, depth: 0.2 };
      obstacles.push(obstacle);
      leaves.push({ mesh: leaf, obstacle, side });
    }
    return { z, leaves, open: 1 };
  });

  const indicators: Record<string, THREE.MeshStandardMaterial> = {};
  for (const [id, site] of Object.entries(SHIP_SITES)) {
    const group = new THREE.Group();
    group.position.set(site.x, 0, site.z);
    root.add(group);
    mesh(rounded(1.7, 0.25, 1.1), dark, 0, 0.13, 0, group);
    mesh(rounded(1.2, 0.85, 0.68), hull, 0, 0.65, 0, group);
    mesh(rounded(1.85, 1.02, 0.5), dark, 0, 1.5, 0, group);
    box(0, 1.48, 0.27, 1.64, 0.8, 0.035, black, group);
    const display = textPanel(
      site.system.toUpperCase(),
      `${id === "workshop" ? "01" : id === "harbor" ? "02" : "03"} / MANUAL OVERRIDE`,
      1.53,
      0.4,
      site.color,
    );
    display.position.set(0, 1.66, 0.3);
    group.add(display);
    const indicator = glow(site.color, 0.35);
    indicators[id] = indicator;
    for (let i = 0; i < 8; i++)
      box(
        -0.62 + i * 0.17,
        1.18,
        0.3,
        0.1,
        0.065,
        0.02,
        i < 2 ? indicator : rim,
        group,
      );
    box(0, 2.04, 0, 1.75, 0.04, 0.43, indicator, group);
    obstacles.push({ x: site.x, z: site.z, width: 1.85, depth: 0.8 });
    // Ground brackets visually anchor the console to its station.
    for (const side of [-1, 1]) {
      box(
        site.x + side * 1.1,
        0.015,
        site.z + 0.1,
        0.045,
        0.025,
        1.4,
        indicator,
      );
      box(
        site.x + side * 0.87,
        0.015,
        site.z + 0.8,
        0.5,
        0.025,
        0.045,
        indicator,
      );
    }
  }
  panelAt(
    "01 / ENGINEERING",
    "AUXILIARY POWER  •  MANUAL REPAIR",
    -4,
    3,
    10.75,
    3.2,
    0.8,
  );
  // Cryogenic equipment, secured freight, and command workstations inhabit the deck.
  for (const z of [15.5, 20.5]) {
    mesh(rounded(1.25, 2.5, 3.4, 0.3), white, -6.9, 1.3, z);
    box(-6.23, 1.45, z, 0.06, 1.3, 2.6, dark);
    box(-6.19, 2.25, z, 0.04, 0.06, 2.6, cyan);
    for (let i = 0; i < 5; i++)
      box(-6.18, 1.9 - i * 0.21, z - 0.9, 0.05, 0.055, 0.35, rim);
  }
  for (const [x, y, z, size] of [
    [6.4, 0.65, 21.5, 1.3],
    [6.4, 1.76, 21.5, 0.85],
    [5.1, 0.4, 21.6, 0.8],
  ]) {
    mesh(rounded(size, size, size, 0.06), hull, x, y, z);
    box(x, y, z + size / 2 + 0.012, size * 0.16, size * 0.84, 0.03, amber);
  }
  for (const x of [-7, 7]) {
    box(x, 0.58, -20, 2.6, 1.16, 1.3, dark);
    const display = panelAt(
      "NAV // OFFLINE",
      "RESERVE SYSTEMS ACTIVE",
      x,
      1.42,
      -19.55,
      2.35,
      0.6,
      "#b5b0ff",
    );
    display.rotation.x = -0.3;
    box(x, 1.04, -19.3, 2.6, 0.07, 0.06, violet);
  }

  function instrument(
    x: number,
    z: number,
    color: THREE.MeshStandardMaterial,
    hologram: boolean,
  ) {
    mesh(new THREE.CylinderGeometry(1.5, 1.65, 0.35, 64), dark, x, 0.18, z);
    mesh(new THREE.CylinderGeometry(1.25, 1.5, 0.65, 64), hull, x, 0.62, z);
    mesh(new THREE.CylinderGeometry(1.38, 1.38, 0.06, 64), dark, x, 0.96, z);
    const projectorRim = mesh(
      new THREE.TorusGeometry(1.31, 0.025, 8, 80),
      color,
      x,
      1,
      z,
    );
    projectorRim.rotation.x = Math.PI / 2;
    const pivot = new THREE.Group();
    pivot.position.set(x, 2.2, z);
    root.add(pivot);
    const holo = new THREE.MeshBasicMaterial({
      color: color.color,
      transparent: true,
      opacity: 0.22,
      wireframe: true,
      depthWrite: false,
    });
    mesh(
      new THREE.IcosahedronGeometry(hologram ? 0.8 : 0.6, 2),
      hologram ? holo : color,
      0,
      0,
      0,
      pivot,
    );
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const ring = mesh(
        new THREE.TorusGeometry(
          1.15 + i * 0.18,
          hologram ? 0.012 : 0.045,
          8,
          80,
          Math.PI * 1.65,
        ),
        hologram ? color : rim,
        0,
        0,
        0,
        pivot,
      );
      ring.rotation.set(0.45 + i * 0.65, i * 0.8, i * 0.35);
      rings.push(ring);
    }
    if (!hologram) {
      mesh(new THREE.CylinderGeometry(0.35, 0.35, 3.8, 24), dark, x, 2.8, z);
      for (let i = 0; i < 7; i++)
        mesh(
          new THREE.CylinderGeometry(0.5, 0.5, 0.07, 32),
          color,
          x,
          1.3 + i * 0.44,
          z,
        );
      for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5])
        rod(
          new THREE.Vector3(x + Math.cos(a) * 1.3, 1, z + Math.sin(a) * 1.3),
          new THREE.Vector3(x + Math.cos(a) * 1.3, 4.7, z + Math.sin(a) * 1.3),
          0.09,
          rim,
        );
    }
    const light = new THREE.PointLight(color.color, 24, 10, 2);
    light.position.set(x, 2.5, z);
    root.add(light);
    return { pivot, rings };
  }
  const hologram = instrument(4.6, 13, cyan, true);
  const reactor = instrument(-4.7, -3, orange, false);
  panelAt(
    "REACTOR  /  02",
    "AUXILIARY FEED REQUIRED",
    -4.7,
    4.65,
    -3.1,
    2.6,
    0.55,
    "#ffb568",
  );

  // Procedural space: no downloaded sky, terrain maps, or decorative image payloads.
  const stars = new Float32Array(1700 * 3);
  const starColors = new Float32Array(stars.length);
  for (let i = 0; i < 1700; i++) {
    const a = rng(i * 3 + 1) * Math.PI * 2,
      y = rng(i * 3 + 2) * 2 - 1,
      r = 280 + rng(i * 3 + 3) * 150;
    stars.set(
      [
        Math.cos(a) * Math.sqrt(1 - y * y) * r,
        y * r,
        Math.sin(a) * Math.sqrt(1 - y * y) * r,
      ],
      i * 3,
    );
    const color = new THREE.Color().setHSL(
      0.54 + rng(i + 700) * 0.12,
      0.2,
      0.5 + rng(i + 600) * 0.5,
    );
    color.toArray(starColors, i * 3);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(stars, 3));
  starGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
  scene.add(
    new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        size: 0.55,
        vertexColors: true,
        sizeAttenuation: true,
        toneMapped: false,
        fog: false,
      }),
    ),
  );
  const planet = new THREE.Group();
  planet.position.set(55, 14, -150);
  planet.scale.setScalar(0.84);
  scene.add(planet);
  const planetMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vP; void main(){vN=normal;vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 vN; varying vec3 vP; uniform float time;
      float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float fbm(vec3 p){float v=0.;float a=.5;for(int i=0;i<5;i++){v+=noise(p)*a;p=p*2.07+vec3(3.1,1.7,2.4);a*=.5;}return v;}
      void main(){
        vec3 n=normalize(vN),p=normalize(vP);
        float warp=fbm(p*8.);
        float bands=sin(p.y*105.+warp*9.+sin(p.x*5.+p.z*3.)*1.1)*.5+.5;
        float detail=fbm(p*70.);
        vec3 c=mix(vec3(.045,.13,.25),vec3(.23,.42,.53),smoothstep(.1,.9,bands));
        c=mix(c,vec3(.49,.62,.65),smoothstep(.51,.72,fbm(vec3(p.x*22.,p.y*70.,p.z*22.)+warp))*.65);
        c+=detail*.055;
        float day=pow(max(dot(n,normalize(vec3(-1.,.65,1.))),0.),.8);
        c*=.045+day*.95;
        gl_FragColor=vec4(c,1.);
      }`,
  });
  mesh(new THREE.SphereGeometry(47, 80, 48), planetMaterial, 0, 0, 0, planet);
  const atmosphere = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vN; varying vec3 vV;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
    fragmentShader: `varying vec3 vN;varying vec3 vV;void main(){float rim=pow(1.-abs(dot(normalize(vN),normalize(vV))),3.);gl_FragColor=vec4(.16,.63,.9,rim*.55);}`,
  });
  mesh(new THREE.SphereGeometry(48.2, 80, 48), atmosphere, 0, 0, 0, planet);
  const planetRing = mesh(
    new THREE.RingGeometry(60, 81, 160),
    new THREE.MeshBasicMaterial({
      color: "#8eaabf",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      fog: false,
    }),
    0,
    0,
    0,
    planet,
  );
  planetRing.rotation.set(1.05, 0.2, -0.3);
  for (const radius of [61, 63, 68, 74, 79]) {
    const ring = mesh(
      new THREE.RingGeometry(radius, radius + 0.6, 160),
      new THREE.MeshBasicMaterial({
        color: "#cad7df",
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        fog: false,
      }),
      0,
      0,
      0,
      planet,
    );
    ring.rotation.copy(planetRing.rotation);
  }
  // Hull spars seen through the windows establish that the room belongs to a larger ship.
  for (const z of [-35, -5, 24]) {
    for (const side of [-1, 1]) {
      box(side * 15, -2, z, 1.5, 2, 12, hull);
      rod(
        new THREE.Vector3(side * 8, -1, z),
        new THREE.Vector3(side * 15, -2, z),
        0.3,
        rim,
      );
      box(side * 15, -0.9, z, 0.1, 0.06, 11, cyan);
    }
  }

  return {
    root,
    obstacles,
    update(
      dt: number,
      time: number,
      player: Player,
      completed: MissionId[],
      reduced: boolean,
    ) {
      for (const door of doors) {
        const target =
          Math.abs(player.z - door.z) < 5.5 && Math.abs(player.x) < 4 ? 1 : 0;
        door.open = reduced
          ? target
          : THREE.MathUtils.damp(door.open, target, 4.8, dt);
        for (const leaf of door.leaves) {
          const x = leaf.side * (1.25 + door.open * 2.6);
          leaf.mesh.position.x = x;
          leaf.obstacle.x = x;
        }
      }
      for (const item of powerMaterials) {
        const target = completed.includes(item.id) ? item.strength : 0.08;
        item.level = reduced
          ? target
          : THREE.MathUtils.damp(item.level, target, 2.4, dt);
        if (item.material) item.material.emissiveIntensity = item.level;
        if (item.light) item.light.intensity = item.level * 65;
      }
      const next = (["workshop", "harbor", "beacon"] as MissionId[]).find(
        (id) => !completed.includes(id),
      );
      for (const [id, material] of Object.entries(indicators)) {
        material.emissive.set(
          completed.includes(id as MissionId)
            ? "#67ffb8"
            : id === next
              ? SHIP_SITES[id as MissionId].color
              : "#536776",
        );
        material.emissiveIntensity = completed.includes(id as MissionId)
          ? 2
          : id === next
            ? 1.7 + Math.sin(time * 1.8) * 0.25
            : 0.3;
      }
      hologram.pivot.rotation.y = time * 0.16;
      hologram.rings.forEach((ring, i) => {
        ring.rotation.z = i * 0.35 + time * (i % 2 ? -0.13 : 0.12);
      });
      reactor.rings.forEach((ring, i) => {
        ring.rotation.y =
          i * 0.8 + time * (completed.includes("harbor") ? 0.45 : 0.08);
      });
      planet.rotation.y = time * 0.0015;
    },
  };
}
