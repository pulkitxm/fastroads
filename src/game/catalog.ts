import type { DriveLayout, Powertrain, RoadStyle, SceneId, TreeKind, VehicleId } from "./types";

export type SceneSpec = {
  id: SceneId;
  label: string;
  freq: number;
  amp: number;
  base: number;
  water: number | null;
  grass: string;
  rock: string;
  dirt: string;
  tree: TreeKind;
  trees: number;
};

export type StyleSpec = {
  id: RoadStyle;
  label: string;
  width: number;
  widthJitter: number;
  turn: number;
  turnWeight: number;
  gradeWeight: number;
  maxGrade: number;
  wander: number;
  grip: number;
  paved: boolean;
};

export type VehicleSpec = {
  id: VehicleId;
  label: string;
  blurb: string;
  mass: number;
  accel: number;
  brake: number;
  top: number;
  reverse: number;
  wheelBase: number;
  maxSteer: number;
  steerFade: number;
  grip: number;
  boost: number;
  length: number;
  width: number;
  height: number;
  cabin: number;
  ride: number;
  wheels: 2 | 4;
  drive: DriveLayout;
  power: Powertrain;
  color: string;
};

export type WeatherSpec = {
  season: string;
  label: string;
  zenith: string;
  horizon: string;
  fog: string;
  sun: string;
  sunHeight: number;
  precip: "none" | "rain" | "snow";
  night: boolean;
  snow: number;
  exposure: number;
};

export const SCENES: Record<SceneId, SceneSpec> = {
  ridges: {
    id: "ridges",
    label: "Ridges",
    freq: 0.0034,
    amp: 46,
    base: 14,
    water: null,
    grass: "#6f8d4e",
    rock: "#8d8478",
    dirt: "#6d5a40",
    tree: "pine",
    trees: 1,
  },
  shore: {
    id: "shore",
    label: "Shore",
    freq: 0.0026,
    amp: 16,
    base: 7,
    water: 3.4,
    grass: "#8aaa62",
    rock: "#cbb992",
    dirt: "#b79a68",
    tree: "palm",
    trees: 0.45,
  },
  timber: {
    id: "timber",
    label: "Timber",
    freq: 0.0052,
    amp: 30,
    base: 11,
    water: null,
    grass: "#3f6a3c",
    rock: "#6a6258",
    dirt: "#4e3b28",
    tree: "pine",
    trees: 1.7,
  },
  dunes: {
    id: "dunes",
    label: "Dunes",
    freq: 0.0022,
    amp: 20,
    base: 9,
    water: null,
    grass: "#c2a15d",
    rock: "#a88448",
    dirt: "#b08950",
    tree: "none",
    trees: 0.15,
  },
  offworld: {
    id: "offworld",
    label: "Offworld",
    freq: 0.007,
    amp: 36,
    base: 8,
    water: null,
    grass: "#6a4d86",
    rock: "#d27a8a",
    dirt: "#4c3560",
    tree: "crystal",
    trees: 0.7,
  },
};

export const SCENE_ORDER: SceneId[] = ["ridges", "shore", "timber", "dunes", "offworld"];

export const STYLES: Record<RoadStyle, StyleSpec> = {
  easy: {
    id: "easy",
    label: "Easy",
    width: 9,
    widthJitter: 0.4,
    turn: 0.16,
    turnWeight: 2.4,
    gradeWeight: 10,
    maxGrade: 0.055,
    wander: 0.18,
    grip: 1,
    paved: true,
  },
  flowing: {
    id: "flowing",
    label: "Flowing",
    width: 7.4,
    widthJitter: 0.8,
    turn: 0.34,
    turnWeight: 1,
    gradeWeight: 8,
    maxGrade: 0.085,
    wander: 0.4,
    grip: 1,
    paved: true,
  },
  winding: {
    id: "winding",
    label: "Winding",
    width: 6.2,
    widthJitter: 0.6,
    turn: 0.58,
    turnWeight: 0.32,
    gradeWeight: 6,
    maxGrade: 0.12,
    wander: 0.75,
    grip: 1,
    paved: true,
  },
  highway: {
    id: "highway",
    label: "Highway",
    width: 14,
    widthJitter: 0.2,
    turn: 0.1,
    turnWeight: 3.4,
    gradeWeight: 14,
    maxGrade: 0.035,
    wander: 0.08,
    grip: 1.05,
    paved: true,
  },
  dirt: {
    id: "dirt",
    label: "Dirt",
    width: 5.4,
    widthJitter: 0.9,
    turn: 0.42,
    turnWeight: 0.7,
    gradeWeight: 5,
    maxGrade: 0.1,
    wander: 0.5,
    grip: 0.72,
    paved: false,
  },
};

export const STYLE_ORDER: RoadStyle[] = ["easy", "flowing", "winding", "highway", "dirt"];

export const VEHICLES: Record<VehicleId, VehicleSpec> = {
  coupe: {
    id: "coupe",
    label: "Coupe",
    blurb: "Quiet miles and a long hood.",
    mass: 1,
    accel: 7.2,
    brake: 14,
    top: 52,
    reverse: 8,
    wheelBase: 2.7,
    maxSteer: 0.46,
    steerFade: 0.035,
    grip: 1,
    boost: 1.45,
    length: 4.5,
    width: 1.85,
    height: 1.15,
    cabin: 0.72,
    ride: 0.55,
    wheels: 4,
    drive: "rwd",
    power: "combustion",
    color: "#d9d3c7",
  },
  hatch: {
    id: "hatch",
    label: "Hatch",
    blurb: "Short, light, and happy to turn.",
    mass: 0.9,
    accel: 6.4,
    brake: 13,
    top: 44,
    reverse: 8,
    wheelBase: 2.35,
    maxSteer: 0.52,
    steerFade: 0.03,
    grip: 1.05,
    boost: 1.35,
    length: 3.8,
    width: 1.72,
    height: 1.38,
    cabin: 0.95,
    ride: 0.52,
    wheels: 4,
    drive: "fwd",
    power: "combustion",
    color: "#3e6f8f",
  },
  sport: {
    id: "sport",
    label: "Sport",
    blurb: "Low, wide, and done waiting.",
    mass: 1.05,
    accel: 10.5,
    brake: 18,
    top: 68,
    reverse: 9,
    wheelBase: 2.55,
    maxSteer: 0.42,
    steerFade: 0.028,
    grip: 1.08,
    boost: 1.55,
    length: 4.3,
    width: 2.02,
    height: 0.95,
    cabin: 0.55,
    ride: 0.42,
    wheels: 4,
    drive: "awd",
    power: "combustion",
    color: "#c23b3b",
  },
  coach: {
    id: "coach",
    label: "Coach",
    blurb: "A slow tour with a high seat.",
    mass: 1.8,
    accel: 3.1,
    brake: 8,
    top: 32,
    reverse: 5,
    wheelBase: 6.2,
    maxSteer: 0.34,
    steerFade: 0.05,
    grip: 0.82,
    boost: 1.2,
    length: 10.5,
    width: 2.5,
    height: 3.1,
    cabin: 2.3,
    ride: 0.85,
    wheels: 4,
    drive: "rwd",
    power: "combustion",
    color: "#efe8d4",
  },
  bike: {
    id: "bike",
    label: "Bike",
    blurb: "Lean in. The handbrake stays home.",
    mass: 0.45,
    accel: 8.4,
    brake: 12,
    top: 58,
    reverse: 4,
    wheelBase: 1.45,
    maxSteer: 0.38,
    steerFade: 0.02,
    grip: 1.12,
    boost: 1.4,
    length: 2.15,
    width: 0.55,
    height: 1.15,
    cabin: 0.7,
    ride: 0.48,
    wheels: 2,
    drive: "rwd",
    power: "combustion",
    color: "#e7e2d8",
  },
};

export const VEHICLE_ORDER: VehicleId[] = ["coupe", "hatch", "sport", "coach", "bike"];

export const COLORS = [
  "#d9d3c7",
  "#f2f2f2",
  "#1d1f24",
  "#c23b3b",
  "#3e6f8f",
  "#2f6b4f",
  "#e0a23a",
  "#6d4c93",
];

const weather = (
  season: string,
  label: string,
  zenith: string,
  horizon: string,
  fog: string,
  sun: string,
  sunHeight: number,
  precip: WeatherSpec["precip"],
  night: boolean,
  snow: number,
  exposure: number,
): WeatherSpec => ({
  season,
  label,
  zenith,
  horizon,
  fog,
  sun,
  sunHeight,
  precip,
  night,
  snow,
  exposure,
});

export const WEATHERS: WeatherSpec[] = [
  weather(
    "spring",
    "spring sunrise",
    "#8eb4d8",
    "#f0b48a",
    "#efd0b4",
    "#ffd2a8",
    0.18,
    "none",
    false,
    0,
    1.05,
  ),
  weather(
    "spring",
    "clear spring",
    "#7eb6ef",
    "#d5ecff",
    "#c5ddf5",
    "#fff4dd",
    0.72,
    "none",
    false,
    0,
    1.08,
  ),
  weather(
    "spring",
    "spring rain",
    "#6d7c8c",
    "#9aa7b4",
    "#8b98a6",
    "#d5dde6",
    0.4,
    "rain",
    false,
    0,
    0.82,
  ),
  weather(
    "spring",
    "spring sunset",
    "#3d4f86",
    "#e38a62",
    "#e7a07a",
    "#ffb088",
    0.08,
    "none",
    false,
    0,
    1,
  ),
  weather(
    "spring",
    "spring night",
    "#070b16",
    "#1a2744",
    "#121a2c",
    "#9bb4ff",
    -0.2,
    "none",
    true,
    0,
    0.55,
  ),
  weather(
    "summer",
    "summer sunrise",
    "#79b7e6",
    "#ffc49a",
    "#f3d2b0",
    "#ffe0bf",
    0.22,
    "none",
    false,
    0,
    1.08,
  ),
  weather(
    "summer",
    "clear",
    "#5aa7f0",
    "#c9e7ff",
    "#b7daf8",
    "#fff7e4",
    0.82,
    "none",
    false,
    0,
    1.12,
  ),
  weather(
    "summer",
    "summer rain",
    "#5e6e7c",
    "#8c9bab",
    "#7f8e9d",
    "#c9d4df",
    0.35,
    "rain",
    false,
    0,
    0.78,
  ),
  weather(
    "summer",
    "summer sunset",
    "#2e3f78",
    "#ef7d4a",
    "#f0a07a",
    "#ffc09a",
    0.06,
    "none",
    false,
    0,
    1.02,
  ),
  weather(
    "summer",
    "summer night",
    "#050814",
    "#15203a",
    "#10182a",
    "#b7c6ff",
    -0.25,
    "none",
    true,
    0,
    0.5,
  ),
  weather(
    "autumn",
    "autumn sunrise",
    "#8e7d88",
    "#e7a06a",
    "#e2b48a",
    "#ffc49a",
    0.16,
    "none",
    false,
    0,
    1,
  ),
  weather(
    "autumn",
    "clear autumn",
    "#6e93c4",
    "#e4d2bc",
    "#d9c7b0",
    "#fff0d8",
    0.62,
    "none",
    false,
    0,
    1.02,
  ),
  weather(
    "autumn",
    "autumn rain",
    "#5c564f",
    "#8a8174",
    "#7d756a",
    "#d2c7b6",
    0.3,
    "rain",
    false,
    0,
    0.76,
  ),
  weather(
    "autumn",
    "twilight",
    "#2a2c55",
    "#c46b62",
    "#c98978",
    "#ffb0a0",
    0.02,
    "none",
    false,
    0,
    0.9,
  ),
  weather(
    "autumn",
    "autumn night",
    "#07060f",
    "#1b1730",
    "#141226",
    "#c0b0ff",
    -0.22,
    "none",
    true,
    0,
    0.48,
  ),
  weather(
    "winter",
    "winter sunrise",
    "#9eb4c6",
    "#f2d7c4",
    "#e4e7ee",
    "#fff0e0",
    0.14,
    "none",
    false,
    0.25,
    1.02,
  ),
  weather(
    "winter",
    "clear snow",
    "#b9d4ea",
    "#e7eef6",
    "#d5deea",
    "#fff8ee",
    0.55,
    "none",
    false,
    0.55,
    1.1,
  ),
  weather(
    "winter",
    "snow",
    "#8ea0b0",
    "#d5dde6",
    "#c5ced8",
    "#e7eef5",
    0.4,
    "snow",
    false,
    0.85,
    0.9,
  ),
  weather(
    "winter",
    "winter sunset",
    "#3c4d6e",
    "#e0b09a",
    "#d9c4bc",
    "#ffd0b8",
    0.05,
    "none",
    false,
    0.4,
    0.96,
  ),
  weather(
    "winter",
    "winter night",
    "#060910",
    "#182033",
    "#121820",
    "#c5d4ff",
    -0.3,
    "snow",
    true,
    0.7,
    0.46,
  ),
];

export const stepWeather = (index: number, delta: number): number => {
  const count = WEATHERS.length;
  return (((index + delta) % count) + count) % count;
};

export const weatherAt = (index: number): WeatherSpec =>
  WEATHERS[((index % WEATHERS.length) + WEATHERS.length) % WEATHERS.length] ??
  WEATHERS[0] ?? {
    season: "summer",
    label: "clear",
    zenith: "#5aa7f0",
    horizon: "#c9e7ff",
    fog: "#b7daf8",
    sun: "#fff7e4",
    sunHeight: 0.8,
    precip: "none",
    night: false,
    snow: 0,
    exposure: 1,
  };
