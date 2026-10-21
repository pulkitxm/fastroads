import * as THREE from "three";
import type { SceneSpec, WeatherSpec } from "../game/catalog";
import { fbm } from "../game/noise";
import type { Road } from "../game/road";
import { groundHeight } from "../game/terrain";
import type { Quality } from "../game/types";

export const CHUNK = 64;
export const RING_SEGMENTS = 72;
export const RING_BANDS = 3;

export type Plant = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  scale: number;
  hue: number;
};

export type ChunkGeometry = {
  road: THREE.BufferGeometry;
  ground: THREE.BufferGeometry;
  trees: Plant[];
  rocks: Plant[];
  grass: Plant[];
};

const ribbon = (
  positions: number[],
  info: number[],
  infoSize: number,
  columns: number,
): THREE.BufferGeometry => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aInfo", new THREE.Float32BufferAttribute(info, infoSize));
  const rows = positions.length / 3 / columns;
  const indices: number[] = [];
  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const a = row * columns + column;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};

export const buildChunk = (
  road: Road,
  scene: SceneSpec,
  seed: number,
  _weather: WeatherSpec,
  origin: number,
  quality: Quality,
): ChunkGeometry => {
  const along = quality === "low" ? 10 : quality === "medium" ? 16 : 24;
  const roadColumns = 10;
  const groundColumns = quality === "low" ? 13 : quality === "medium" ? 20 : 28;
  const reach = quality === "low" ? 42 : 68;
  const roadPositions: number[] = [];
  const roadInfo: number[] = [];
  const groundPositions: number[] = [];
  const groundInfo: number[] = [];
  const trees: Plant[] = [];
  const rocks: Plant[] = [];
  const grass: Plant[] = [];
  const step = quality === "low" ? 2 : 1;
  for (let row = 0; row <= along; row += 1) {
    const distance = origin + (CHUNK * row) / along;
    const sample = road.at(distance);
    const rightX = Math.cos(sample.heading);
    const rightZ = -Math.sin(sample.heading);
    for (let column = 0; column < roadColumns; column += 1) {
      const u = column / (roadColumns - 1) - 0.5;
      const lateral = u * sample.width * 1.08;
      const crown = (0.5 - Math.abs(u)) * 0.08;
      roadPositions.push(
        sample.x + rightX * lateral,
        sample.y + 0.05 + crown,
        sample.z + rightZ * lateral,
      );
      roadInfo.push(Math.abs(u) * 2, sample.s, sample.paved ? 1 : 0);
    }
    for (let column = 0; column < groundColumns; column += 1) {
      const u = column / (groundColumns - 1) - 0.5;
      const lateral = u * reach * 2;
      const x = sample.x + rightX * lateral;
      const z = sample.z + rightZ * lateral;
      const roadDistance = Math.abs(lateral);
      const ground = groundHeight(scene, seed, x, z);
      const edge = sample.width * 0.55;
      const blend =
        roadDistance <= edge
          ? 0
          : Math.min(1, (roadDistance - edge) / 16) ** 2 *
            (3 - 2 * Math.min(1, (roadDistance - edge) / 16));
      const y = sample.y * (1 - blend) + ground * blend;
      groundPositions.push(x, y - 0.02, z);
      groundInfo.push(roadDistance, 0);
    }
    if (row % step !== 0) {
      continue;
    }
    for (const side of [-1, 1]) {
      const roll = fbm(sample.s * 0.013 + side, row * 0.17, seed + 19 + side);
      const span = sample.width * 0.62 + 3.5 + Math.abs(roll) * (quality === "low" ? 16 : 26);
      const x = sample.x + rightX * side * span;
      const z = sample.z + rightZ * side * span;
      const y = groundHeight(scene, seed, x, z);
      const underwater = scene.water !== null && y < scene.water + 0.4;
      if (underwater) {
        continue;
      }
      const plant = {
        x,
        y,
        z,
        yaw: roll * 9,
        scale: 0.55 + Math.abs(roll) * 0.75 * scene.trees,
        hue: roll,
      };
      if (scene.tree !== "none" && Math.abs(roll) > 0.22) {
        trees.push(plant);
      } else if (Math.abs(roll) > 0.55) {
        rocks.push({ ...plant, scale: 0.6 + Math.abs(roll) });
      }
      if (span < (quality === "low" ? 16 : 24)) {
        grass.push({
          ...plant,
          x: x - rightX * side * (2 + Math.abs(roll) * 4),
          z: z - rightZ * side * (2 + Math.abs(roll) * 4),
          scale: 0.55 + Math.abs(roll) * 0.7,
        });
        grass.push({
          ...plant,
          x: x - rightX * side * 6,
          z: z - rightZ * side * 5,
          yaw: roll * 4,
          scale: 0.35 + Math.abs(roll) * 0.45,
        });
      }
    }
  }
  const roadGeometry = ribbon(roadPositions, roadInfo, 3, roadColumns);
  roadGeometry.setAttribute("aRoad", roadGeometry.getAttribute("aInfo"));
  const groundGeometry = ribbon(groundPositions, groundInfo, 2, groundColumns);
  return { road: roadGeometry, ground: groundGeometry, trees, rocks, grass };
};

export const fillRing = (
  positions: Float32Array,
  info: Float32Array,
  scene: SceneSpec,
  seed: number,
  x: number,
  z: number,
): void => {
  const radii = [78, 230, 820];
  for (let index = 0; index <= RING_SEGMENTS; index += 1) {
    const angle = (index / RING_SEGMENTS) * Math.PI * 2;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    for (let band = 0; band < RING_BANDS; band += 1) {
      const radius = radii[band] ?? 800;
      const px = x + sin * radius;
      const pz = z + cos * radius;
      const slot = (index * RING_BANDS + band) * 3;
      positions[slot] = px;
      positions[slot + 1] = groundHeight(scene, seed, px, pz);
      positions[slot + 2] = pz;
      const infoSlot = (index * RING_BANDS + band) * 2;
      info[infoSlot] = 80;
      info[infoSlot + 1] = 0;
    }
  }
};

export const ringIndex = (): number[] => {
  const indices: number[] = [];
  for (let index = 0; index < RING_SEGMENTS; index += 1) {
    for (let band = 0; band < RING_BANDS - 1; band += 1) {
      const a = index * RING_BANDS + band;
      const b = a + 1;
      const c = a + RING_BANDS;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }
  return indices;
};
