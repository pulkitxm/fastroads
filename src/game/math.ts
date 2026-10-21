export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

export const wrapAngle = (radians: number): number => {
  const turned = (radians + Math.PI) % (Math.PI * 2);
  return (turned < 0 ? turned + Math.PI * 2 : turned) - Math.PI;
};

export const smoothstep = (edge0: number, edge1: number, value: number): number => {
  const t = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};
