import * as THREE from "three";
import type { SceneSpec, WeatherSpec } from "../game/catalog";
import { clamp, smoothstep } from "../game/math";
import { fbm } from "../game/noise";
import type { Road } from "../game/road";
import { groundHeight } from "../game/terrain";

export const CHUNK = 72;

export type Plant = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  scale: number;
};

export type ChunkGeometry = {
  road: THREE.BufferGeometry;
  ground: THREE.BufferGeometry;
  plants: Plant[];
  rocks: Plant[];
};

const colorOf = (hex: string): THREE.Color => new THREE.Color(hex);

const ribbon = (positions: number[], colors: number[], columns: number): THREE.BufferGeometry => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
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
  weather: WeatherSpec,
  origin: number,
): ChunkGeometry => {
  const along = 8;
  const roadColumns = 11;
  const groundColumns = 13;
  const reach = 40;
  const roadPositions: number[] = [];
  const roadColors: number[] = [];
  const groundPositions: number[] = [];
  const groundColors: number[] = [];
  const plants: Plant[] = [];
  const rocks: Plant[] = [];
  const asphalt = colorOf(scene.id === "offworld" ? "#2a2438" : "#3a4048");
  const edge = colorOf("#262a30");
  const paint = colorOf(scene.id === "offworld" ? "#b9a6dc" : "#8b9098");
  const grass = colorOf(scene.grass);
  const rock = colorOf(scene.rock);
  const dirt = colorOf(scene.dirt);
  const snow = colorOf("#eef3f8");
  for (let row = 0; row <= along; row += 1) {
    const sample = road.at(origin + (CHUNK * row) / along);
    const rightX = Math.cos(sample.heading);
    const rightZ = -Math.sin(sample.heading);
    for (let column = 0; column < roadColumns; column += 1) {
      const u = column / (roadColumns - 1) - 0.5;
      const lateral = u * sample.width;
      roadPositions.push(
        sample.x + rightX * lateral,
        sample.y + 0.07 + Math.abs(u) * 0.03,
        sample.z + rightZ * lateral,
      );
      const stripe = sample.paved && Math.abs(u) < 0.02;
      const side = Math.abs(u) > 0.42;
      const color = stripe ? paint : side ? edge : sample.paved ? asphalt : dirt;
      roadColors.push(color.r, color.g, color.b);
    }
    for (let column = 0; column < groundColumns; column += 1) {
      const u = column / (groundColumns - 1) - 0.5;
      const lateral = u * reach * 2;
      const x = sample.x + rightX * lateral;
      const z = sample.z + rightZ * lateral;
      const distance = Math.abs(lateral);
      const ground = groundHeight(scene, seed, x, z);
      const blend = smoothstep(sample.width * 0.5, sample.width * 0.5 + 12, distance);
      const y = sample.y * (1 - blend) + ground * blend;
      groundPositions.push(x, y, z);
      const slope = Math.abs(ground - groundHeight(scene, seed, x + 4, z + 2));
      const rocky = clamp(slope * 0.28, 0, 1);
      const tint = grass.clone().lerp(rock, rocky);
      const shoulder = dirt.clone().lerp(tint, blend);
      if (weather.snow > 0) {
        shoulder.lerp(snow, weather.snow * (0.25 + blend * 0.75));
      }
      groundColors.push(shoulder.r, shoulder.g, shoulder.b);
    }
    if (row % 2 === 0) {
      const roll = fbm(sample.s * 0.01, row, seed + 11);
      const side = roll >= 0 ? 1 : -1;
      const span = sample.width * 0.55 + 5 + Math.abs(roll) * 22;
      const x = sample.x + rightX * side * span;
      const z = sample.z + rightZ * side * span;
      const y = groundHeight(scene, seed, x, z);
      const wet = scene.water !== null && y < scene.water + 0.3;
      if (!wet && Math.abs(roll) > 0.12) {
        const plant = {
          x,
          y,
          z,
          yaw: roll * 8,
          scale: 0.7 + Math.abs(roll) * (scene.tree === "palm" ? 1.4 : 2.4),
        };
        if (scene.tree === "none" || Math.abs(roll) < 0.28) {
          rocks.push(plant);
        } else {
          plants.push(plant);
        }
      }
    }
  }
  return {
    road: ribbon(roadPositions, roadColors, roadColumns),
    ground: ribbon(groundPositions, groundColors, groundColumns),
    plants,
    rocks,
  };
};

export const fillRing = (
  positions: Float32Array,
  colors: Float32Array,
  scene: SceneSpec,
  seed: number,
  weather: WeatherSpec,
  x: number,
  z: number,
): void => {
  const segments = 80;
  const grass = colorOf(scene.grass);
  const rock = colorOf(scene.rock);
  const snow = colorOf("#e7eef5");
  for (let i = 0; i <= segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    for (let ring = 0; ring < 2; ring += 1) {
      const radius = ring === 0 ? 36 : 780;
      const px = x + sin * radius;
      const pz = z + cos * radius;
      const py = groundHeight(scene, seed, px, pz);
      const index = (i * 2 + ring) * 3;
      positions[index] = px;
      positions[index + 1] = py;
      positions[index + 2] = pz;
      const slope = Math.abs(py - groundHeight(scene, seed, px + 12, pz));
      const tint = grass.clone().lerp(rock, clamp(slope * 0.05, 0, 1));
      if (weather.snow > 0) {
        tint.lerp(snow, weather.snow);
      }
      colors[index] = tint.r;
      colors[index + 1] = tint.g;
      colors[index + 2] = tint.b;
    }
  }
};

export const ringIndex = (): number[] => {
  const segments = 80;
  const indices: number[] = [];
  for (let i = 0; i < segments; i += 1) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, b, c, b, d, c);
  }
  return indices;
};
