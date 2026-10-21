import * as THREE from "three";

const noise = `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm2(vec2 p) {
  float value = 0.0;
  float weight = 0.5;
  for (int i = 0; i < 5; i++) {
    value += weight * noise2(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    weight *= 0.5;
  }
  return value;
}
`;

const light = `
uniform vec3 sunDir;
uniform vec3 sunColor;
uniform vec3 ambient;
uniform vec3 fogColor;
uniform vec3 carPos;
uniform vec3 carDir;
uniform float fogNear;
uniform float fogFar;
uniform float head;
uniform float night;
vec3 shade(vec3 albedo, vec3 normal, vec3 world) {
  float wrap = clamp(dot(normalize(normal), normalize(sunDir)) * 0.55 + 0.45, 0.0, 1.0);
  float rim = pow(1.0 - clamp(dot(normalize(normal), vec3(0.0, 1.0, 0.0)), 0.0, 1.0), 2.0);
  vec3 color = albedo * (ambient + sunColor * wrap) + albedo * rim * 0.04;
  vec3 toFrag = world - carPos;
  float ahead = dot(toFrag, carDir);
  float side = length(toFrag - carDir * ahead);
  float beam = smoothstep(10.0, 0.4, side) * smoothstep(0.2, 3.0, ahead) * smoothstep(46.0, 10.0, ahead);
  color += vec3(1.0, 0.9, 0.72) * beam * head * 0.85;
  float dist = length(world - cameraPosition);
  float fog = smoothstep(fogNear, fogFar, dist);
  return mix(color, fogColor, fog);
}
`;

const groundVertex = `
attribute vec2 aInfo;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vRoad;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vRoad = aInfo.x;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const groundFragment = `
varying vec3 vWorld;
varying vec3 vNormal;
varying float vRoad;
uniform vec3 grassA;
uniform vec3 grassB;
uniform vec3 rockColor;
uniform vec3 dirtColor;
uniform float snow;
uniform float wet;
${noise}
${light}
void main() {
  float slope = clamp(1.0 - normalize(vNormal).y, 0.0, 1.0);
  float macro = fbm2(vWorld.xz * 0.035);
  float tuft = fbm2(vWorld.xz * 0.55);
  float speckle = noise2(vWorld.xz * 2.4);
  vec3 grass = mix(grassA, grassB, macro);
  grass = mix(grass, grass * vec3(1.15, 1.05, 0.7), smoothstep(0.58, 0.82, tuft));
  grass *= 0.86 + speckle * 0.28;
  float rock = smoothstep(0.22, 0.62, slope + (1.0 - macro) * 0.08);
  vec3 albedo = mix(grass, rockColor * (0.75 + speckle * 0.35), rock);
  float shoulder = (1.0 - smoothstep(2.2, 14.0, vRoad)) * (1.0 - rock);
  albedo = mix(albedo, dirtColor * (0.8 + tuft * 0.35), shoulder);
  float snowMask = snow * smoothstep(0.08, 0.45, normalize(vNormal).y) * (1.0 - shoulder * 0.35);
  albedo = mix(albedo, vec3(0.9, 0.93, 0.96), snowMask);
  albedo = mix(albedo, albedo * vec3(0.62, 0.66, 0.72), wet * (1.0 - snowMask));
  gl_FragColor = vec4(shade(albedo, vNormal, vWorld), 1.0);
}
`;

const roadVertex = `
attribute vec3 aRoad;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vRoad;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vRoad = aRoad;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const roadFragment = `
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vRoad;
uniform float wet;
${noise}
${light}
void main() {
  float lat = abs(vRoad.x);
  float along = vRoad.y;
  float paved = vRoad.z;
  float grain = fbm2(vWorld.xz * 1.7);
  float grit = noise2(vWorld.xz * 7.0);
  vec3 asphalt = mix(vec3(0.055, 0.058, 0.062), vec3(0.11, 0.115, 0.12), grain);
  asphalt *= 0.82 + grit * 0.28;
  vec3 gravel = vec3(0.28, 0.24, 0.18) * (0.75 + grain * 0.4);
  vec3 base = mix(gravel, asphalt, paved);
  base = mix(base, gravel * 0.85, smoothstep(0.78, 1.0, lat));
  float dash = step(0.55, fract(along * 0.055));
  float center = (1.0 - smoothstep(0.012, 0.02, lat)) * dash * paved;
  float edge = smoothstep(0.9, 0.93, lat) * (1.0 - smoothstep(0.975, 0.995, lat)) * paved;
  vec3 paint = vec3(0.78, 0.76, 0.68);
  vec3 albedo = mix(base, paint, max(center, edge));
  float gloss = wet * paved * (0.35 + center);
  albedo = mix(albedo, albedo * vec3(0.45, 0.5, 0.55), wet * paved * 0.75);
  vec3 viewDir = normalize(cameraPosition - vWorld);
  vec3 halfDir = normalize(viewDir + normalize(sunDir));
  float spec = pow(max(dot(normalize(vNormal), halfDir), 0.0), 48.0) * gloss;
  gl_FragColor = vec4(shade(albedo, vNormal, vWorld) + sunColor * spec, 1.0);
}
`;

const foliageVertex = `
attribute vec3 color;
varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  #ifdef USE_INSTANCING
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix * instanceMatrix) * normal);
  #else
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
  #endif
  vWorld = world.xyz;
  #ifdef USE_INSTANCING_COLOR
    vColor = color * instanceColor;
  #else
    vColor = color;
  #endif
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const foliageFragment = `
varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vWorld;
${light}
void main() {
  gl_FragColor = vec4(shade(vColor, vNormal, vWorld), 1.0);
}
`;

const grassVertex = `
varying vec3 vColor;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
uniform float time;
void main() {
  vUv = uv;
  vec3 p = position;
  #ifdef USE_INSTANCING
    float sway = sin(time * 1.7 + instanceMatrix[3].x * 0.35 + instanceMatrix[3].z * 0.2) * p.y * 0.22;
    p.x += sway;
    vec4 world = modelMatrix * instanceMatrix * vec4(p, 1.0);
    vNormal = normalize(mat3(modelMatrix * instanceMatrix) * normal);
  #else
    vec4 world = modelMatrix * vec4(p, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
  #endif
  vWorld = world.xyz;
  #ifdef USE_INSTANCING_COLOR
    vColor = instanceColor;
  #else
    vColor = vec3(0.35, 0.55, 0.25);
  #endif
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const grassFragment = `
varying vec3 vColor;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
${light}
void main() {
  float blade = 0.5 - abs(vUv.x - 0.5);
  float width = mix(0.22, 0.04, vUv.y);
  if (blade < width || vUv.y > 0.96) discard;
  vec3 albedo = vColor * mix(0.75, 1.15, vUv.y);
  gl_FragColor = vec4(shade(albedo, vec3(0.0, 1.0, 0.15), vWorld), 1.0);
}
`;

const skyVertex = `
varying vec3 vDir;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vDir = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const skyFragment = `
varying vec3 vDir;
uniform vec3 zenith;
uniform vec3 horizon;
uniform vec3 sunDir;
uniform vec3 sunColor;
uniform float night;
uniform float time;
${noise}
void main() {
  vec3 dir = normalize(vDir);
  float height = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 color = mix(horizon, zenith, pow(height, 0.72));
  float sunDot = max(dot(dir, normalize(sunDir)), 0.0);
  color += sunColor * pow(sunDot, 1400.0) * 2.4;
  color += sunColor * pow(sunDot, 18.0) * 0.35 * (1.0 - night);
  vec2 cloudUv = dir.xz / max(dir.y, 0.12) * 0.22 + vec2(time * 0.008, 0.0);
  float clouds = fbm2(cloudUv);
  float cloud = smoothstep(0.56, 0.78, clouds) * smoothstep(0.02, 0.2, dir.y);
  color = mix(color, mix(vec3(0.75, 0.78, 0.82), vec3(1.0), 0.65), cloud * (1.0 - night * 0.85) * 0.72);
  float stars = step(0.998, hash12(floor(dir.xy * 1600.0 + dir.z * 400.0)));
  color += vec3(0.85, 0.9, 1.0) * stars * night * step(0.18, dir.y);
  gl_FragColor = vec4(color, 1.0);
}
`;

const waterVertex = `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const waterFragment = `
varying vec3 vWorld;
uniform vec3 waterColor;
uniform vec3 horizon;
uniform vec3 sunDir;
uniform vec3 sunColor;
uniform float time;
${noise}
void main() {
  float wave = fbm2(vWorld.xz * 0.08 + vec2(time * 0.05, time * 0.03));
  vec3 normal = normalize(vec3(wave - 0.5, 1.4, wave - 0.45));
  vec3 viewDir = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
  vec3 color = mix(waterColor, horizon, fres);
  float spec = pow(max(dot(reflect(-normalize(sunDir), normal), viewDir), 0.0), 60.0);
  color += sunColor * spec * 0.45;
  gl_FragColor = vec4(color, mix(0.62, 0.9, fres));
}
`;

export type SurfaceUniforms = {
  sunDir: { value: THREE.Vector3 };
  sunColor: { value: THREE.Color };
  ambient: { value: THREE.Color };
  fogColor: { value: THREE.Color };
  carPos: { value: THREE.Vector3 };
  carDir: { value: THREE.Vector3 };
  fogNear: { value: number };
  fogFar: { value: number };
  head: { value: number };
  night: { value: number };
  time: { value: number };
  wet: { value: number };
  snow: { value: number };
  grassA: { value: THREE.Color };
  grassB: { value: THREE.Color };
  rockColor: { value: THREE.Color };
  dirtColor: { value: THREE.Color };
  zenith: { value: THREE.Color };
  horizon: { value: THREE.Color };
  waterColor: { value: THREE.Color };
};

export const createLook = (): SurfaceUniforms => ({
  sunDir: { value: new THREE.Vector3(0.35, 0.82, 0.25) },
  sunColor: { value: new THREE.Color("#fff3d8") },
  ambient: { value: new THREE.Color("#8ea4b8") },
  fogColor: { value: new THREE.Color("#c5ddf5") },
  carPos: { value: new THREE.Vector3() },
  carDir: { value: new THREE.Vector3(0, 0, 1) },
  fogNear: { value: 50 },
  fogFar: { value: 560 },
  head: { value: 0 },
  night: { value: 0 },
  time: { value: 0 },
  wet: { value: 0 },
  snow: { value: 0 },
  grassA: { value: new THREE.Color("#3f6b34") },
  grassB: { value: new THREE.Color("#8eae58") },
  rockColor: { value: new THREE.Color("#8b8174") },
  dirtColor: { value: new THREE.Color("#6a5136") },
  zenith: { value: new THREE.Color("#7eb6ef") },
  horizon: { value: new THREE.Color("#d7ecff") },
  waterColor: { value: new THREE.Color("#1b6478") },
});

const material = (
  uniforms: SurfaceUniforms,
  vertexShader: string,
  fragmentShader: string,
  transparent = false,
): THREE.ShaderMaterial =>
  new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent,
    depthWrite: !transparent,
  });

export const createGroundMaterial = (uniforms: SurfaceUniforms): THREE.ShaderMaterial =>
  material(uniforms, groundVertex, groundFragment);

export const createRoadMaterial = (uniforms: SurfaceUniforms): THREE.ShaderMaterial =>
  material(uniforms, roadVertex, roadFragment);

export const createFoliageMaterial = (uniforms: SurfaceUniforms): THREE.ShaderMaterial =>
  material(uniforms, foliageVertex, foliageFragment);

export const createGrassMaterial = (uniforms: SurfaceUniforms): THREE.ShaderMaterial => {
  const grass = material(uniforms, grassVertex, grassFragment);
  grass.side = THREE.DoubleSide;
  return grass;
};

export const createSkyMaterial = (uniforms: SurfaceUniforms): THREE.ShaderMaterial => {
  const sky = material(uniforms, skyVertex, skyFragment);
  sky.side = THREE.BackSide;
  sky.depthWrite = false;
  return sky;
};

export const createWaterMaterial = (uniforms: SurfaceUniforms): THREE.ShaderMaterial => {
  const water = material(uniforms, waterVertex, waterFragment, true);
  water.depthWrite = false;
  return water;
};
