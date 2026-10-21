import { SCENES, STYLES, VEHICLES, WEATHERS } from "./catalog";
import type {
  CameraMode,
  InputMode,
  LightMode,
  Quality,
  RoadStyle,
  SceneId,
  Transmission,
  Units,
  VehicleId,
} from "./types";

export type Settings = {
  seed: number;
  scene: SceneId;
  style: RoadStyle;
  vehicle: VehicleId;
  color: string;
  units: Units;
  quality: Quality;
  input: InputMode;
  steerAssist: boolean;
  doubleTap: boolean;
  transmission: Transmission;
  muted: boolean;
  volume: number;
  camera: CameraMode;
  weather: number;
  cruise: number | null;
  lights: LightMode;
  total: number;
  top: number;
};

export const DEFAULT_SETTINGS: Settings = {
  seed: 24021,
  scene: "ridges",
  style: "flowing",
  vehicle: "coupe",
  color: VEHICLES.coupe.color,
  units: "mph",
  quality: "high",
  input: "keyboard",
  steerAssist: true,
  doubleTap: true,
  transmission: "auto",
  muted: true,
  volume: 0.45,
  camera: "near",
  weather: 6,
  cruise: null,
  lights: "auto",
  total: 0,
  top: 0,
};

const KEY = "fastroads.settings";

const isScene = (value: unknown): value is SceneId => typeof value === "string" && value in SCENES;

const isStyle = (value: unknown): value is RoadStyle =>
  typeof value === "string" && value in STYLES;

const isVehicle = (value: unknown): value is VehicleId =>
  typeof value === "string" && value in VEHICLES;

const isQuality = (value: unknown): value is Quality =>
  value === "low" || value === "medium" || value === "high";

const isUnits = (value: unknown): value is Units => value === "mph" || value === "kmh";

const isInput = (value: unknown): value is InputMode =>
  value === "keyboard" || value === "mouse" || value === "autodrive";

const isCamera = (value: unknown): value is CameraMode =>
  value === "near" || value === "far" || value === "cockpit";

const isTransmission = (value: unknown): value is Transmission =>
  value === "auto" || value === "manual";

const isLights = (value: unknown): value is LightMode =>
  value === "auto" || value === "on" || value === "off";

export const loadSettings = (): Settings => {
  if (typeof localStorage === "undefined") {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const weather =
      typeof parsed.weather === "number"
        ? Math.max(0, Math.min(WEATHERS.length - 1, Math.floor(parsed.weather)))
        : DEFAULT_SETTINGS.weather;
    return {
      ...DEFAULT_SETTINGS,
      seed: typeof parsed.seed === "number" ? Math.floor(parsed.seed) : DEFAULT_SETTINGS.seed,
      scene: isScene(parsed.scene) ? parsed.scene : DEFAULT_SETTINGS.scene,
      style: isStyle(parsed.style) ? parsed.style : DEFAULT_SETTINGS.style,
      vehicle: isVehicle(parsed.vehicle) ? parsed.vehicle : DEFAULT_SETTINGS.vehicle,
      color: typeof parsed.color === "string" ? parsed.color : DEFAULT_SETTINGS.color,
      units: isUnits(parsed.units) ? parsed.units : DEFAULT_SETTINGS.units,
      quality: isQuality(parsed.quality) ? parsed.quality : DEFAULT_SETTINGS.quality,
      input: isInput(parsed.input) ? parsed.input : DEFAULT_SETTINGS.input,
      steerAssist:
        typeof parsed.steerAssist === "boolean" ? parsed.steerAssist : DEFAULT_SETTINGS.steerAssist,
      doubleTap:
        typeof parsed.doubleTap === "boolean" ? parsed.doubleTap : DEFAULT_SETTINGS.doubleTap,
      transmission: isTransmission(parsed.transmission)
        ? parsed.transmission
        : DEFAULT_SETTINGS.transmission,
      muted: typeof parsed.muted === "boolean" ? parsed.muted : DEFAULT_SETTINGS.muted,
      volume: typeof parsed.volume === "number" ? parsed.volume : DEFAULT_SETTINGS.volume,
      camera: isCamera(parsed.camera) ? parsed.camera : DEFAULT_SETTINGS.camera,
      weather,
      cruise: typeof parsed.cruise === "number" ? parsed.cruise : null,
      lights: isLights(parsed.lights) ? parsed.lights : DEFAULT_SETTINGS.lights,
      total: typeof parsed.total === "number" ? parsed.total : 0,
      top: typeof parsed.top === "number" ? parsed.top : 0,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

export const saveSettings = (settings: Settings): void => {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(KEY, JSON.stringify(settings));
};
