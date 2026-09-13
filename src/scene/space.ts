import * as THREE from "three";

export const EARTH = { x: -170, y: 22, z: 60, radius: 48 } as const;

/** One continuous exterior. Planet positions are art-directed, not an orbital-scale model. */
export function buildSpace(scene: THREE.Scene, loaded: () => void) {
  const root = new THREE.Group();
  root.name = "Orbital exterior";
  scene.add(root);
  const loader = new THREE.TextureLoader();
  const texture = (file: string, color = true) => {
    const map = loader.load(`/space/${file}`, loaded);
    if (color) map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.RepeatWrapping;
    map.anisotropy = 2;
    return map;
  };
  const stars = new THREE.Mesh(
    new THREE.SphereGeometry(540, 40, 24),
    new THREE.MeshBasicMaterial({
      map: texture("stars.jpg"),
      side: THREE.BackSide,
      color: "#9caaa9",
      toneMapped: false,
      fog: false,
    }),
  );
  stars.name = "Star field";
  stars.rotation.set(0.4, 0.8, 0.3);
  root.add(stars);
  const sun = new THREE.Vector3(0.35, 0.45, 0.82).normalize();
  const vertexShader = `
    varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorld;
    void main() {
      vUv=uv; vNormal=normalize(mat3(modelMatrix)*normal);
      vWorld=(modelMatrix*vec4(position,1.)).xyz;
      gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);
    }`;
  const earthDay = texture("earth-day.jpg"),
    earthNight = texture("earth-night.jpg"),
    clouds = texture("earth-clouds.jpg", false);
  const surface = (map: THREE.Texture, earth = false) =>
    new THREE.ShaderMaterial({
      uniforms: {
        dayMap: { value: map },
        nightMap: { value: earthNight },
        cloudMap: { value: clouds },
        sunlight: { value: sun },
        earth: { value: earth ? 1 : 0 },
        cloudOffset: { value: 0 },
      },
      vertexShader,
      fragmentShader: `
      uniform sampler2D dayMap, nightMap, cloudMap;
      uniform vec3 sunlight; uniform float earth, cloudOffset;
      varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorld;
      void main() {
        vec3 n=normalize(vNormal);
        float ndl=dot(n,sunlight);
        float day=smoothstep(-.12,.25,ndl);
        vec3 albedo=texture2D(dayMap,vUv).rgb;
        if(earth>.5) {
          float cloud=smoothstep(.08,.85,texture2D(cloudMap,vUv+vec2(cloudOffset,0.)).r);
          albedo=mix(albedo,vec3(.91,.96,1.),cloud*.92);
        }
        vec3 color=albedo*(.015+max(ndl,0.)*.98);
        if(earth>.5) {
          color+=texture2D(nightMap,vUv).rgb*(1.-day)*.8;
          vec3 viewDir=normalize(cameraPosition-vWorld);
          float limb=pow(1.-max(dot(n,viewDir),0.),3.);
          color+=vec3(.025,.11,.27)*limb*day*.6;
        }
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    });
  function body(
    name: string,
    x: number,
    y: number,
    z: number,
    radius: number,
    material: THREE.Material,
    detail = 56,
  ) {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, y, z);
    root.add(g);
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(radius, detail, 32),
      material,
    );
    g.add(sphere);
    return g;
  }
  const earthMaterial = surface(earthDay, true);
  const earth = body(
    "Earth",
    EARTH.x,
    EARTH.y,
    EARTH.z,
    EARTH.radius,
    earthMaterial,
    72,
  );
  earth.rotation.set(0.12, 0.65, -0.16);
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH.radius + 0.65, 64, 40),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: { sunlight: { value: sun } },
      vertexShader,
      fragmentShader: `
      uniform vec3 sunlight; varying vec3 vNormal; varying vec3 vWorld;
      void main(){
        vec3 n=normalize(vNormal),v=normalize(cameraPosition-vWorld);
        float rim=pow(1.-abs(dot(n,v)),4.);
        float lit=.1+.8*smoothstep(-.25,.55,dot(n,sunlight));
        gl_FragColor=vec4(.12,.38,.82,rim*lit*.48);
      }`,
    }),
  );
  earth.add(atmosphere);
  const moon = body("Moon", -30, 9, -155, 11, surface(texture("moon.jpg")), 40);
  moon.rotation.y = 1.3;
  const saturn = body(
    "Saturn",
    170,
    26,
    -15,
    27,
    surface(texture("saturn.jpg")),
  );
  saturn.rotation.set(0.18, 0, -0.28);
  const ringGeometry = new THREE.RingGeometry(34, 61, 128);
  const pos = ringGeometry.attributes.position,
    uv = ringGeometry.attributes.uv;
  for (let i = 0; i < pos.count; i++)
    uv.setXY(i, (Math.hypot(pos.getX(i), pos.getY(i)) - 34) / 27, 0.5);
  const rings = new THREE.Mesh(
    ringGeometry,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      forceSinglePass: true,
      uniforms: {
        ringMap: { value: texture("saturn-ring.png") },
        sunlight: { value: sun },
        center: { value: saturn.position.clone() },
        radius: { value: 27 },
      },
      vertexShader,
      fragmentShader: `
      uniform sampler2D ringMap; uniform vec3 sunlight,center; uniform float radius;
      varying vec2 vUv; varying vec3 vNormal,vWorld;
      void main(){
        vec4 tex=texture2D(ringMap,vUv);
        vec3 p=vWorld-center;
        float b=dot(p,sunlight),closest=dot(p,p)-b*b;
        float shadow=(1.-smoothstep(radius*radius*.97,radius*radius*1.04,closest))*step(b,0.);
        gl_FragColor=vec4(tex.rgb*(.68-shadow*.62),tex.a*.94);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    }),
  );
  rings.rotation.x = Math.PI / 2 - 0.22;
  saturn.add(rings);

  // Nearby solar wings supply parallax and a recognizable station silhouette.
  const alloy = new THREE.MeshStandardMaterial({
    color: "#63777a",
    metalness: 0.75,
    roughness: 0.5,
  });
  const cells = new THREE.MeshStandardMaterial({
    color: "#162c48",
    metalness: 0.6,
    roughness: 0.36,
  });
  const mount = new THREE.BoxGeometry(1, 1, 1);
  function box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
  ) {
    const mesh = new THREE.Mesh(mount, m);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    root.add(mesh);
    return mesh;
  }
  const panels = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1.38, 0.055, 1.68),
    cells,
    96,
  );
  const transform = new THREE.Matrix4();
  let index = 0;
  for (const side of [-1, 1]) {
    box(side * 23, -0.8, 10, 10, 0.22, 0.24, alloy);
    box(side * 27, -1.35, 4, 9.3, 0.17, 15, alloy);
    for (let x = 0; x < 6; x++)
      for (let z = 0; z < 8; z++) {
        transform.makeTranslation(
          side * (23.25 + x * 1.5),
          -1.22,
          -2.3 + z * 1.8,
        );
        panels.setMatrixAt(index++, transform);
      }
  }
  root.add(panels);
  let previousTime = 0;
  return {
    update(time: number, reduced: boolean, preview = false) {
      if (!reduced) {
        const elapsed = Math.max(0, time - previousTime);
        // Starting title speeds: a visible continental turn with slower cloud shear.
        earth.rotation.y += elapsed * (preview ? 0.028 : 0.00035);
        earthMaterial.uniforms.cloudOffset.value +=
          elapsed * (preview ? 0.0008 : 0.000025);
      }
      previousTime = time;
    },
  };
}
