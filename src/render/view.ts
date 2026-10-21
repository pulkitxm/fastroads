import * as THREE from "three";
import { SCENES, type SceneSpec, VEHICLES, type WeatherSpec, weatherAt } from "../game/catalog";
import { IDLE_PAD } from "../game/drive";
import { clamp } from "../game/math";
import type { Session } from "../game/session";
import type { CameraMode, PadState, Quality } from "../game/types";
import { CarModel } from "./car";
import {
  broadleafGeometry,
  crystalGeometry,
  grassGeometry,
  palmGeometry,
  pineGeometry,
  rockGeometry,
} from "./foliage";
import {
  createFoliageMaterial,
  createGrassMaterial,
  createGroundMaterial,
  createLook,
  createRoadMaterial,
  createSkyMaterial,
  createWaterMaterial,
} from "./shade";
import {
  buildChunk,
  CHUNK,
  fillRing,
  type Plant,
  RING_BANDS,
  RING_SEGMENTS,
  ringIndex,
} from "./world";

const PIXEL: Record<Quality, number> = { low: 0.75, medium: 1, high: 1.35 };
const FOG: Record<Quality, number> = { low: 220, medium: 360, high: 560 };

type Chunk = {
  id: number;
  road: THREE.Mesh;
  ground: THREE.Mesh;
  trees: THREE.InstancedMesh | null;
  leaves: THREE.InstancedMesh | null;
  rocks: THREE.InstancedMesh | null;
  grass: THREE.InstancedMesh | null;
};

const dead = (value: number): number => (Math.abs(value) < 0.14 ? 0 : value);

const readPad = (): PadState => {
  const source = navigator.getGamepads?.() ?? [];
  let pad: Gamepad | null = null;
  for (const item of source) {
    if (item) {
      pad = item;
      break;
    }
  }
  if (!pad) {
    return IDLE_PAD;
  }
  return {
    steer: dead(pad.axes[0] ?? 0),
    throttle: pad.buttons[7]?.value ?? 0,
    brake: pad.buttons[6]?.value ?? 0,
    handbrake: pad.buttons[0]?.pressed ?? false,
    camera: pad.buttons[1]?.pressed ?? false,
    reset: pad.buttons[2]?.pressed ?? false,
    autodrive: pad.buttons[3]?.pressed ?? false,
    pause: pad.buttons[9]?.pressed ?? false,
    headlights: pad.buttons[5]?.pressed ?? false,
  };
};

const instances = (
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  plants: Plant[],
  tint: THREE.Color,
): THREE.InstancedMesh | null => {
  if (plants.length === 0) {
    return null;
  }
  const mesh = new THREE.InstancedMesh(geometry, material, plants.length);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const color = new THREE.Color();
  plants.forEach((plant, index) => {
    position.set(plant.x, plant.y, plant.z);
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), plant.yaw);
    scale.setScalar(plant.scale);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(index, matrix);
    color.copy(tint).offsetHSL(0, 0, (plant.scale - 1.4) * 0.05);
    mesh.setColorAt(index, color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
  return mesh;
};

export class View {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(58, 1, 0.15, 1200);
  private readonly sun = new THREE.DirectionalLight("#fff4dd", 2.4);
  private readonly hemi = new THREE.HemisphereLight("#c5def8", "#6d7a4e", 0.85);
  private readonly sky: THREE.Mesh;
  private readonly surface = createLook();
  private readonly car = new CarModel();
  private readonly roadMaterial: THREE.ShaderMaterial;
  private readonly groundMaterial: THREE.ShaderMaterial;
  private readonly foliageMaterial: THREE.ShaderMaterial;
  private readonly grassMaterial: THREE.ShaderMaterial;
  private readonly pine = pineGeometry();
  private readonly broadleaf = broadleafGeometry();
  private readonly palm = palmGeometry();
  private readonly crystal = crystalGeometry();
  private readonly rock = rockGeometry();
  private readonly grass = grassGeometry();
  private readonly ring: THREE.Mesh;
  private readonly ringPositions: Float32Array;
  private readonly ringInfo: Float32Array;
  private readonly water: THREE.Mesh;
  private readonly precip: THREE.Points;
  private readonly precipPositions: Float32Array;
  private readonly shadow: THREE.Mesh;
  private readonly smooth = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private readonly audio = new EngineAudio();
  private chunks = new Map<number, Chunk>();
  private stamp = "";
  private ringAt = 0;
  private last = performance.now();
  private raf = 0;
  private running = false;
  private free = { x: 0, y: 10, z: 16, yaw: 0, pitch: -0.3 };
  private dragging = false;
  private pointerX = 0;
  private pointerY = 0;
  private wasFree = false;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly session: Session,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.setClearColor("#87a8c9");
    this.roadMaterial = createRoadMaterial(this.surface);
    this.groundMaterial = createGroundMaterial(this.surface);
    this.foliageMaterial = createFoliageMaterial(this.surface);
    this.grassMaterial = createGrassMaterial(this.surface);
    this.scene.add(this.hemi, this.sun, this.sun.target, this.car.root);
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(1400, 32, 20),
      createSkyMaterial(this.surface),
    );
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);
    const ringCount = (RING_SEGMENTS + 1) * RING_BANDS;
    this.ringPositions = new Float32Array(ringCount * 3);
    this.ringInfo = new Float32Array(ringCount * 2);
    const ringGeometry = new THREE.BufferGeometry();
    ringGeometry.setAttribute("position", new THREE.BufferAttribute(this.ringPositions, 3));
    ringGeometry.setAttribute("aInfo", new THREE.BufferAttribute(this.ringInfo, 2));
    ringGeometry.setIndex(ringIndex());
    this.ring = new THREE.Mesh(ringGeometry, this.groundMaterial);
    this.ring.frustumCulled = false;
    this.scene.add(this.ring);
    this.water = new THREE.Mesh(
      new THREE.CircleGeometry(1200, 64),
      createWaterMaterial(this.surface),
    );
    this.water.rotation.x = -Math.PI / 2;
    this.scene.add(this.water);
    this.precipPositions = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i += 1) {
      this.precipPositions[i * 3] = (Math.random() - 0.5) * 50;
      this.precipPositions[i * 3 + 1] = Math.random() * 28;
      this.precipPositions[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    const precipGeometry = new THREE.BufferGeometry();
    precipGeometry.setAttribute("position", new THREE.BufferAttribute(this.precipPositions, 3));
    this.precip = new THREE.Points(
      precipGeometry,
      new THREE.PointsMaterial({ color: "#e7eef6", size: 0.08, transparent: true, opacity: 0.7 }),
    );
    this.scene.add(this.precip);
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.3, 18),
      new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.22 }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.scene.add(this.shadow);
    this.scene.fog = null;
    this.bind();
    this.resize();
    this.running = true;
    this.raf = requestAnimationFrame(this.frame);
  }

  dispose = (): void => {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.unbind();
    this.dropChunks();
    this.audio.stop();
    this.renderer.dispose();
  };

  private bind(): void {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    window.addEventListener("resize", this.resize);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("contextmenu", this.onContext);
    window.addEventListener("wheel", this.onWheel, { passive: false });
  }

  private unbind(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("contextmenu", this.onContext);
    window.removeEventListener("wheel", this.onWheel);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (typing(event)) {
      return;
    }
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
      event.preventDefault();
    }
    this.session.onKey(event.code, event.repeat);
    this.audio.unlock();
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.session.release(event.code);
  };

  private onBlur = (): void => {
    this.session.releaseAll();
    this.dragging = false;
  };

  private onContext = (event: Event): void => {
    event.preventDefault();
  };

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.session.wheel(event.deltaY);
  };

  private onPointerDown = (event: PointerEvent): void => {
    this.audio.unlock();
    if (event.button === 0) {
      this.buttons.left = true;
    }
    if (event.button === 2) {
      this.buttons.right = true;
    }
    this.lastClientX = event.clientX;
    this.lastClientY = event.clientY;
    this.pushPointer(event.clientX, event.clientY);
    if (this.session.freeCam) {
      this.dragging = true;
      this.pointerX = event.clientX;
      this.pointerY = event.clientY;
    }
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (event.button === 0) {
      this.buttons.left = false;
      this.dragging = false;
    }
    if (event.button === 2) {
      this.buttons.right = false;
    }
    this.pushPointer(this.lastClientX, this.lastClientY);
  };

  private buttons = { left: false, right: false };

  private lastClientX = 0;
  private lastClientY = 0;

  private onPointerMove = (event: PointerEvent): void => {
    this.lastClientX = event.clientX;
    this.lastClientY = event.clientY;
    this.pushPointer(event.clientX, event.clientY);
    if (!this.dragging || !this.session.freeCam) {
      return;
    }
    const dx = event.clientX - this.pointerX;
    const dy = event.clientY - this.pointerY;
    this.pointerX = event.clientX;
    this.pointerY = event.clientY;
    this.free.yaw -= dx * 0.0045;
    this.free.pitch = clamp(this.free.pitch - dy * 0.0035, -1.15, 1.15);
  };

  private pushPointer(clientX: number, clientY: number): void {
    const width = window.innerWidth;
    const span = Math.max(width * 0.5, 640);
    const steer = clamp((clientX - width / 2) / span, -1, 1);
    this.session.setPointer({
      steer,
      left: this.buttons.left,
      right: this.buttons.right,
      overUi: clientY > window.innerHeight - 92,
    });
  }

  private resize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const quality = this.session.getHud().quality;
    const ratio = Math.min(window.devicePixelRatio || 1, PIXEL[quality]);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  };

  private frame = (now: number): void => {
    if (!this.running) {
      return;
    }
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.session.setPad(readPad());
    this.session.tick(dt);
    this.draw(dt);
    this.raf = requestAnimationFrame(this.frame);
  };

  private draw(dt: number): void {
    const hud = this.session.getHud();
    const scene = SCENES[hud.scene];
    const weather = weatherAt(hud.weatherIndex);
    const specVehicle = VEHICLES[hud.vehicle];
    this.applyWeather(weather, hud.quality);
    this.paintScene(scene, weather, hud.lightsLit);
    this.ensureChunks(scene, weather, hud);
    this.car.sync(specVehicle, hud.color);
    this.car.update(this.session.body, specVehicle, hud.lightsLit);
    this.shadow.position.set(
      this.session.body.x,
      this.session.body.y - specVehicle.ride + 0.08,
      this.session.body.z,
    );
    this.shadow.scale.setScalar(
      specVehicle.wheels === 2 ? 0.45 : specVehicle.id === "coach" ? 1.8 : 1,
    );
    if (hud.freeCam && !this.wasFree) {
      this.free.x = this.camera.position.x;
      this.free.y = this.camera.position.y;
      this.free.z = this.camera.position.z;
    }
    this.wasFree = hud.freeCam;
    if (hud.freeCam) {
      this.fly(dt);
    } else {
      this.chase(dt, hud.camera, specVehicle.length);
    }
    this.sky.position.copy(this.camera.position);
    this.water.visible = scene.water !== null;
    if (scene.water !== null) {
      this.water.position.set(this.camera.position.x, scene.water, this.camera.position.z);
    }
    this.ringAt += dt;
    if (this.ringAt > 0.45) {
      this.ringAt = 0;
      fillRing(
        this.ringPositions,
        this.ringInfo,
        scene,
        hud.seed,
        this.session.body.x,
        this.session.body.z,
      );
      const position = this.ring.geometry.getAttribute("position");
      const info = this.ring.geometry.getAttribute("aInfo");
      position.needsUpdate = true;
      info.needsUpdate = true;
      this.ring.geometry.computeVertexNormals();
    }
    this.fall(dt, weather.precip, this.camera);
    const moving = Math.abs(this.session.body.speed);
    this.audio.set(moving, hud.volume, hud.muted || hud.phase === "pause", moving > 1);
    this.renderer.toneMappingExposure = weather.exposure;
    this.renderer.render(this.scene, this.camera);
  }

  private applyWeather(weather: WeatherSpec, quality: Quality): void {
    const sun = this.surface.sunDir.value;
    sun.set(0.42, Math.max(0.04, weather.sunHeight + 0.28), 0.22).normalize();
    this.surface.sunColor.value.set(weather.sun);
    this.surface.zenith.value.set(weather.zenith);
    this.surface.horizon.value.set(weather.horizon);
    this.surface.fogColor.value.set(weather.fog);
    this.surface.night.value = weather.night ? 1 : 0;
    this.surface.snow.value = weather.snow;
    this.surface.wet.value = weather.precip === "rain" ? 1 : weather.precip === "snow" ? 0.35 : 0;
    const far = FOG[quality];
    this.surface.fogNear.value = far * (weather.night ? 0.08 : 0.28);
    this.surface.fogFar.value = far;
    this.sun.position
      .set(this.session.body.x, this.session.body.y, this.session.body.z)
      .addScaledVector(sun, 50);
    this.sun.position.y += 20;
    this.sun.target.position.set(this.session.body.x, this.session.body.y, this.session.body.z);
    this.sun.intensity = weather.night ? 0.18 : 2.2;
    this.sun.color.set(weather.sun);
    this.hemi.intensity = weather.night ? 0.16 : 0.55;
    this.hemi.color.set(weather.zenith);
    this.hemi.groundColor.set(weather.fog);
    this.camera.far = Math.max(1400, far * 2.4);
    this.camera.updateProjectionMatrix();
    this.renderer.setClearColor(weather.fog);
  }

  private paintScene(scene: SceneSpec, weather: WeatherSpec, lights: boolean): void {
    const grass = new THREE.Color(scene.grass);
    this.surface.grassA.value.copy(grass).multiplyScalar(0.62);
    this.surface.grassB.value.copy(grass).offsetHSL(0.02, 0.05, 0.08);
    this.surface.rockColor.value.set(scene.rock);
    this.surface.dirtColor.value.set(scene.dirt);
    this.surface.waterColor.value.set(scene.id === "offworld" ? "#3a2a62" : "#17657a");
    this.surface.ambient.value.set(weather.night ? "#1a2438" : "#9aafc0");
    this.surface.head.value = lights ? 1 : 0;
    this.surface.time.value += 0.016;
    const body = this.session.body;
    this.surface.carPos.value.set(body.x, body.y, body.z);
    this.surface.carDir.value.set(Math.sin(body.heading), 0, Math.cos(body.heading));
  }

  private ensureChunks(
    scene: SceneSpec,
    weather: WeatherSpec,
    hud: ReturnType<Session["getHud"]>,
  ): void {
    const stamp = `${hud.scene}:${hud.style}:${hud.seed}:${hud.weatherIndex}:${hud.quality}`;
    if (stamp !== this.stamp) {
      this.dropChunks();
      this.stamp = stamp;
      this.resize();
    }
    const ahead = hud.quality === "high" ? 8 : hud.quality === "medium" ? 6 : 4;
    const behind = 2;
    const current = Math.floor(this.session.body.s / CHUNK);
    const needed = new Set<number>();
    for (let id = current - behind; id <= current + ahead; id += 1) {
      if (id < 0) {
        continue;
      }
      needed.add(id);
      if (!this.chunks.has(id)) {
        this.addChunk(id, scene, weather, hud.seed, hud.quality);
      }
    }
    for (const [id, chunk] of this.chunks) {
      if (!needed.has(id)) {
        this.removeChunk(chunk);
        this.chunks.delete(id);
      }
    }
  }

  private addChunk(
    id: number,
    scene: SceneSpec,
    weather: WeatherSpec,
    seed: number,
    quality: Quality,
  ): void {
    this.session.road.extendTo((id + 1) * CHUNK + 4);
    const built = buildChunk(this.session.road, scene, seed, weather, id * CHUNK, quality);
    const road = new THREE.Mesh(built.road, this.roadMaterial);
    const ground = new THREE.Mesh(built.ground, this.groundMaterial);
    const treeGeometry =
      scene.tree === "palm"
        ? this.palm
        : scene.tree === "crystal"
          ? this.crystal
          : scene.id === "timber"
            ? this.broadleaf
            : this.pine;
    const pines =
      scene.tree === "pine" ? built.trees.filter((plant) => plant.hue >= 0) : built.trees;
    const leafPlants = scene.tree === "pine" ? built.trees.filter((plant) => plant.hue < 0) : [];
    const trees = instances(treeGeometry, this.foliageMaterial, pines, new THREE.Color("#ffffff"));
    const leaves = instances(
      this.broadleaf,
      this.foliageMaterial,
      leafPlants,
      new THREE.Color("#ffffff"),
    );
    const rocks = instances(
      this.rock,
      this.foliageMaterial,
      built.rocks,
      new THREE.Color(scene.rock),
    );
    const grass = instances(
      this.grass,
      this.grassMaterial,
      built.grass,
      new THREE.Color(scene.grass),
    );
    this.scene.add(road, ground);
    if (trees) {
      this.scene.add(trees);
    }
    if (leaves) {
      this.scene.add(leaves);
    }
    if (rocks) {
      this.scene.add(rocks);
    }
    if (grass) {
      this.scene.add(grass);
    }
    this.chunks.set(id, { id, road, ground, trees, leaves, rocks, grass });
  }

  private removeChunk(chunk: Chunk): void {
    this.scene.remove(chunk.road, chunk.ground);
    chunk.road.geometry.dispose();
    chunk.ground.geometry.dispose();
    for (const mesh of [chunk.trees, chunk.leaves, chunk.rocks, chunk.grass]) {
      if (!mesh) {
        continue;
      }
      this.scene.remove(mesh);
      mesh.dispose();
    }
  }

  private dropChunks(): void {
    for (const chunk of this.chunks.values()) {
      this.removeChunk(chunk);
    }
    this.chunks.clear();
  }

  private chase(dt: number, camera: CameraMode, length: number): void {
    const body = this.session.body;
    const cockpit = camera === "cockpit";
    const back = camera === "far" ? 16 : camera === "near" ? 7.4 : 0.15;
    const up = camera === "far" ? 6.4 : camera === "near" ? 2.55 : 1.15;
    const lead = cockpit ? length * 0.15 : 0;
    const sin = Math.sin(body.heading);
    const cos = Math.cos(body.heading);
    const desired = new THREE.Vector3(
      body.x - sin * back + sin * lead,
      body.y + up,
      body.z - cos * back + cos * lead,
    );
    const focus = new THREE.Vector3(
      body.x + sin * (cockpit ? 18 : 10),
      body.y + (cockpit ? 1.05 : 1.3),
      body.z + cos * (cockpit ? 18 : 10),
    );
    const rate = 1 - Math.exp(-dt * (cockpit ? 12 : 3.4));
    if (this.smooth.lengthSq() < 1) {
      this.smooth.copy(desired);
      this.look.copy(focus);
    }
    this.smooth.lerp(desired, rate);
    this.look.lerp(focus, rate);
    this.camera.position.copy(this.smooth);
    if (cockpit) {
      const forward = new THREE.Vector3(sin, 0, cos);
      this.camera.up.set(0, 1, 0).applyAxisAngle(forward, -body.roll);
    } else {
      this.camera.up.set(0, 1, 0);
    }
    this.camera.lookAt(this.look);
  }

  private fly(dt: number): void {
    const fast = this.session.pressed("ShiftLeft") || this.session.pressed("ShiftRight");
    const speed = (fast ? 86 : 26) * dt;
    const sin = Math.sin(this.free.yaw);
    const cos = Math.cos(this.free.yaw);
    if (this.session.pressed("KeyW")) {
      this.free.x += sin * speed;
      this.free.z += cos * speed;
    }
    if (this.session.pressed("KeyS")) {
      this.free.x -= sin * speed;
      this.free.z -= cos * speed;
    }
    if (this.session.pressed("KeyA")) {
      this.free.x -= cos * speed;
      this.free.z += sin * speed;
    }
    if (this.session.pressed("KeyD")) {
      this.free.x += cos * speed;
      this.free.z -= sin * speed;
    }
    if (this.session.pressed("Space")) {
      this.free.y += speed;
    }
    if (this.session.pressed("ControlLeft")) {
      this.free.y -= speed;
    }
    if (this.session.pressed("KeyG")) {
      this.free.x = this.session.body.x;
      this.free.y = this.session.body.y + 6;
      this.free.z = this.session.body.z;
      this.free.yaw = this.session.body.heading;
    }
    const pitch = Math.cos(this.free.pitch);
    this.camera.position.set(this.free.x, this.free.y, this.free.z);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(
      this.free.x + Math.sin(this.free.yaw) * pitch,
      this.free.y + Math.sin(this.free.pitch),
      this.free.z + Math.cos(this.free.yaw) * pitch,
    );
  }

  private fall(dt: number, precip: "none" | "rain" | "snow", camera: THREE.Camera): void {
    const attribute = this.precip.geometry.getAttribute("position");
    const material = this.precip.material;
    if (!(material instanceof THREE.PointsMaterial) || !(attribute.array instanceof Float32Array)) {
      return;
    }
    this.precip.visible = precip !== "none";
    if (precip === "none") {
      return;
    }
    const snow = precip === "snow";
    material.size = snow ? 0.18 : 0.07;
    material.color.set(snow ? "#f7fbff" : "#d5e2ee");
    const array = attribute.array;
    const drop = (snow ? 4 : 22) * dt;
    for (let i = 0; i < array.length; i += 3) {
      const y = array[i + 1] ?? 0;
      array[i + 1] = y - drop;
      if ((array[i + 1] ?? 0) < 0) {
        array[i] = (Math.random() - 0.5) * 50;
        array[i + 1] = 18 + Math.random() * 10;
        array[i + 2] = (Math.random() - 0.5) * 50;
      }
    }
    attribute.needsUpdate = true;
    this.precip.position.copy(camera.position);
    this.precip.position.y -= 4;
  }
}

class EngineAudio {
  private context: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;

  unlock = (): void => {
    if (!this.context) {
      return;
    }
    void this.context.resume();
  };

  set = (speed: number, volume: number, muted: boolean, moving: boolean): void => {
    if (muted || volume <= 0) {
      this.quiet();
      return;
    }
    this.ensure();
    if (!this.context || !this.osc || !this.gain) {
      return;
    }
    const frequency = 42 + speed * 2.1 + (moving ? 8 : 0);
    this.osc.frequency.setTargetAtTime(frequency, this.context.currentTime, 0.08);
    this.gain.gain.setTargetAtTime(volume * 0.045, this.context.currentTime, 0.08);
  };

  stop = (): void => {
    this.osc?.stop();
    this.context?.close();
    this.context = null;
    this.osc = null;
    this.gain = null;
  };

  private quiet(): void {
    if (!this.context || !this.gain) {
      return;
    }
    this.gain.gain.setTargetAtTime(0, this.context.currentTime, 0.05);
  }

  private ensure(): void {
    if (this.context) {
      void this.context.resume();
      return;
    }
    const context = new AudioContext();
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "triangle";
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start();
    this.context = context;
    this.osc = osc;
    this.gain = gain;
  }
}

const typing = (event: KeyboardEvent): boolean => {
  const target = event.target;
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
};
