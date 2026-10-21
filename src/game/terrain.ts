import type { SceneSpec } from "./catalog";
import { smoothstep } from "./math";
import { fbm } from "./noise";
import type { Road } from "./road";
import type { Sample } from "./types";

export type Surface = {
  y: number;
  grip: number;
  distance: number;
  sample: Sample;
  ground: number;
};

export const groundHeight = (scene: SceneSpec, seed: number, x: number, z: number): number =>
  scene.base + fbm(x * scene.freq, z * scene.freq, seed) * scene.amp;

export const sampleSurface = (
  road: Road,
  scene: SceneSpec,
  seed: number,
  x: number,
  z: number,
): Surface => {
  const sample = road.nearest(x, z);
  const distance = Math.hypot(x - sample.x, z - sample.z);
  const ground = groundHeight(scene, seed, x, z);
  const edge = sample.width * 0.5;
  const shoulder = edge + 10;
  const blend = smoothstep(edge, shoulder, distance);
  return {
    y: sample.y * (1 - blend) + ground * blend,
    grip: blend > 0.7 ? sample.grip * 0.64 : sample.grip,
    distance,
    sample,
    ground,
  };
};
