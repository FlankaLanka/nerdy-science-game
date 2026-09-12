import * as THREE from "three";
import { rng } from "./art";
import { shipArt } from "./shipArt";

export function buildSpace(scene: THREE.Scene) {
  const root = new THREE.Group();
  scene.add(root);
  const { mesh } = shipArt(root);

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
  planet.position.set(27, 24, -134);
  planet.scale.setScalar(1.1);
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

  return planet;
}
