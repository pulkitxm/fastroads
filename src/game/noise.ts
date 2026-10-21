const fade = (t: number): number => t * t * (3 - 2 * t);

const hash2 = (ix: number, iz: number, seed: number): number => {
  let n = Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + Math.imul(seed | 0, 1440662683);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};

export const valueNoise = (x: number, z: number, seed: number): number => {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = fade(x - x0);
  const tz = fade(z - z0);
  const a = hash2(x0, z0, seed);
  const b = hash2(x0 + 1, z0, seed);
  const c = hash2(x0, z0 + 1, seed);
  const d = hash2(x0 + 1, z0 + 1, seed);
  const ab = a + (b - a) * tx;
  const cd = c + (d - c) * tx;
  return ab + (cd - ab) * tz;
};

export const fbm = (x: number, z: number, seed: number): number => {
  let amplitude = 0.5;
  let frequency = 1;
  let sum = 0;
  let weight = 0;
  for (let octave = 0; octave < 5; octave += 1) {
    sum += amplitude * (valueNoise(x * frequency, z * frequency, seed + octave * 101) * 2 - 1);
    weight += amplitude;
    amplitude *= 0.5;
    frequency *= 2.02;
  }
  return sum / weight;
};
