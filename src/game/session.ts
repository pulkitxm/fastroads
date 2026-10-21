import { SCENES, STYLES, VEHICLES, weatherAt } from "./catalog";
import { autodriveInput, playerInput, playerIsDriving } from "./drive";
import { clamp } from "./math";
import { createBody, tickBody } from "./physics";
import { Road } from "./road";
import { type Settings, saveSettings } from "./storage";
import type {
  Body,
  CameraMode,
  DriveInput,
  InputMode,
  LightMode,
  PadState,
  Phase,
  PointerState,
  Quality,
  RoadStyle,
  SceneId,
  Transmission,
  Units,
  VehicleId,
} from "./types";

export type HudState = {
  phase: Phase;
  speed: number;
  trip: number;
  total: number;
  top: number;
  gear: string;
  camera: CameraMode;
  weather: string;
  season: string;
  weatherIndex: number;
  vehicle: VehicleId;
  vehicleLabel: string;
  scene: SceneId;
  sceneLabel: string;
  style: RoadStyle;
  styleLabel: string;
  autodrive: boolean;
  cruise: number | null;
  lights: LightMode;
  lightsLit: boolean;
  ui: boolean;
  input: InputMode;
  seed: number;
  quality: Quality;
  units: Units;
  steerAssist: boolean;
  doubleTap: boolean;
  transmission: Transmission;
  muted: boolean;
  volume: number;
  color: string;
  freeCam: boolean;
  paused: boolean;
  power: string;
  drive: string;
  blurb: string;
};

const HORIZON: Record<Quality, number> = {
  low: 520,
  medium: 820,
  high: 1200,
};

const mpsToDisplay = (mps: number, units: Units): number =>
  units === "mph" ? mps * 2.2369362921 : mps * 3.6;

const displayToMps = (value: number, units: Units): number =>
  units === "mph" ? value / 2.2369362921 : value / 3.6;

const gearLabel = (body: Body, power: string): string => {
  if (body.speed < -0.4) {
    return "R";
  }
  if (Math.abs(body.speed) < 0.4) {
    return "N";
  }
  if (power === "electric") {
    return "D";
  }
  return String(body.gear);
};

export class Session {
  road: Road;
  body: Body;
  settings: Settings;
  phase: Phase = "attract";
  autodrive = true;
  ui = true;
  freeCam = false;
  trip = 0;
  boostLatch = false;
  message = "";
  private keys = new Set<string>();
  private pointer: PointerState = { steer: 0, left: false, right: false, overUi: false };
  private pad: PadState = {
    steer: 0,
    throttle: 0,
    brake: 0,
    handbrake: false,
    camera: false,
    reset: false,
    autodrive: false,
    pause: false,
    headlights: false,
  };
  private edges = {
    camera: false,
    reset: false,
    autodrive: false,
    pause: false,
    headlights: false,
  };
  private lastThrottleAt = 0;
  private listeners = new Set<() => void>();
  private hud: HudState;
  private saveTimer = 0;

  constructor(settings: Settings) {
    this.settings = { ...settings };
    this.road = this.makeRoad();
    this.body = createBody(this.road, this.vehicle());
    this.hud = this.buildHud();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getHud = (): HudState => this.hud;

  pressed = (code: string): boolean => this.keys.has(code);

  press = (code: string): void => {
    this.onKey(code, false);
  };

  release = (code: string): void => {
    this.keys.delete(code);
    if (code === "KeyW" || code === "ArrowUp") {
      this.boostLatch = false;
    }
  };

  releaseAll = (): void => {
    this.keys.clear();
    this.pointer.left = false;
    this.pointer.right = false;
    this.boostLatch = false;
  };

  onKey = (code: string, repeat: boolean): void => {
    if (repeat && code !== "BracketLeft" && code !== "BracketRight") {
      this.keys.add(code);
      return;
    }
    const wasThrottle = code === "KeyW" || code === "ArrowUp";
    if (wasThrottle && this.settings.doubleTap) {
      const now = performance.now();
      if (now - this.lastThrottleAt < 160) {
        this.boostLatch = true;
      }
      this.lastThrottleAt = now;
    }
    this.keys.add(code);
    if (repeat) {
      return;
    }
    if (code === "KeyF") {
      this.autodrive = !this.autodrive;
    } else if (code === "KeyC") {
      this.cycleCamera();
    } else if (code === "KeyQ") {
      this.stepWeather(-1);
    } else if (code === "KeyE") {
      this.stepWeather(1);
    } else if (code === "KeyH" || code === "KeyL") {
      this.cycleLights();
    } else if (code === "KeyU") {
      this.ui = !this.ui;
    } else if (code === "KeyM") {
      this.settings.muted = !this.settings.muted;
      this.persist();
    } else if (code === "KeyP" || code === "Escape") {
      this.togglePause();
    } else if (code === "KeyR") {
      this.resetCar();
    } else if (code === "Backquote") {
      this.freeCam = !this.freeCam;
    } else if (code === "Digit1") {
      this.setVehicle("coupe");
    } else if (code === "Digit2") {
      this.setVehicle("hatch");
    } else if (code === "Digit3") {
      this.setVehicle("sport");
    } else if (code === "Digit4") {
      this.setVehicle("coach");
    } else if (code === "Digit5") {
      this.setVehicle("bike");
    } else if (code === "BracketLeft") {
      this.shift(-1);
    } else if (code === "BracketRight") {
      this.shift(1);
    }
    this.emit();
  };

  setPointer = (pointer: PointerState): void => {
    this.pointer = pointer;
  };

  setPad = (pad: PadState): void => {
    if (pad.camera && !this.edges.camera) {
      this.cycleCamera();
    }
    if (pad.reset && !this.edges.reset) {
      this.resetCar();
    }
    if (pad.autodrive && !this.edges.autodrive) {
      this.autodrive = !this.autodrive;
    }
    if (pad.pause && !this.edges.pause) {
      this.togglePause();
    }
    if (pad.headlights && !this.edges.headlights) {
      this.cycleLights();
    }
    this.edges = {
      camera: pad.camera,
      reset: pad.reset,
      autodrive: pad.autodrive,
      pause: pad.pause,
      headlights: pad.headlights,
    };
    this.pad = pad;
  };

  wheel = (delta: number): void => {
    if (this.settings.cruise === null || this.freeCam) {
      return;
    }
    const display = mpsToDisplay(this.settings.cruise, this.settings.units);
    const next = clamp(
      display + (delta > 0 ? -5 : 5),
      5,
      mpsToDisplay(this.vehicle().top, this.settings.units),
    );
    this.settings.cruise = displayToMps(next, this.settings.units);
    this.persist();
    this.emit();
  };

  begin = (): void => {
    this.phase = "drive";
    this.autodrive = this.settings.input === "autodrive";
    this.freeCam = false;
    if (this.settings.input === "mouse") {
      this.settings.cruise = this.settings.cruise ?? displayToMps(90, this.settings.units);
    }
    this.body.hold = false;
    this.persist();
    this.emit();
  };

  togglePause = (): void => {
    if (this.phase === "attract") {
      this.phase = "pause";
    } else if (this.phase === "pause") {
      this.phase = "drive";
    } else {
      this.phase = "pause";
    }
    this.emit();
  };

  setScene = (scene: SceneId): void => {
    this.settings.scene = scene;
    this.rebuild();
  };

  setStyle = (style: RoadStyle): void => {
    this.settings.style = style;
    this.rebuild();
  };

  setSeed = (seed: number): void => {
    if (!Number.isFinite(seed)) {
      return;
    }
    this.settings.seed = Math.floor(seed);
    this.rebuild();
  };

  randomSeed = (): void => {
    this.setSeed(1000 + Math.floor(Math.random() * 900000));
  };

  setVehicle = (vehicle: VehicleId): void => {
    this.settings.vehicle = vehicle;
    this.settings.color = VEHICLES[vehicle].color;
    this.body.hold = false;
    this.persist();
    this.emit();
  };

  setColor = (color: string): void => {
    this.settings.color = color;
    this.persist();
    this.emit();
  };

  setQuality = (quality: Quality): void => {
    this.settings.quality = quality;
    this.persist();
    this.emit();
  };

  setUnits = (units: Units): void => {
    if (this.settings.cruise !== null) {
      const display = mpsToDisplay(this.settings.cruise, this.settings.units);
      const snapped = Math.max(5, Math.round(display / 5) * 5);
      this.settings.units = units;
      this.settings.cruise = displayToMps(snapped, units);
    } else {
      this.settings.units = units;
    }
    this.persist();
    this.emit();
  };

  setInput = (input: InputMode): void => {
    this.settings.input = input;
    if (this.phase === "drive") {
      this.autodrive = input === "autodrive";
    }
    this.persist();
    this.emit();
  };

  toggleAssist = (): void => {
    this.settings.steerAssist = !this.settings.steerAssist;
    this.persist();
    this.emit();
  };

  toggleDoubleTap = (): void => {
    this.settings.doubleTap = !this.settings.doubleTap;
    this.persist();
    this.emit();
  };

  toggleTransmission = (): void => {
    this.settings.transmission = this.settings.transmission === "auto" ? "manual" : "auto";
    this.persist();
    this.emit();
  };

  setVolume = (volume: number): void => {
    this.settings.volume = clamp(volume, 0, 1);
    this.persist();
    this.emit();
  };

  toggleMute = (): void => {
    this.settings.muted = !this.settings.muted;
    this.persist();
    this.emit();
  };

  toggleCruise = (): void => {
    if (this.settings.cruise === null) {
      const shown = mpsToDisplay(
        Math.max(this.body.speed, displayToMps(40, this.settings.units)),
        this.settings.units,
      );
      const snapped = Math.max(5, Math.round(shown / 5) * 5);
      this.settings.cruise = displayToMps(snapped, this.settings.units);
      this.body.hold = false;
    } else {
      this.settings.cruise = null;
    }
    this.persist();
    this.emit();
  };

  nudgeCruise = (direction: number): void => {
    const current = this.settings.cruise ?? displayToMps(40, this.settings.units);
    const display = mpsToDisplay(current, this.settings.units) + direction * 5;
    const cap = mpsToDisplay(this.vehicle().top, this.settings.units);
    this.settings.cruise = displayToMps(clamp(display, 5, cap), this.settings.units);
    this.persist();
    this.emit();
  };

  stepWeather = (delta: number): void => {
    const count = 20;
    this.settings.weather = (((this.settings.weather + delta) % count) + count) % count;
    this.persist();
    this.emit();
  };

  cycleCamera = (): void => {
    const order: CameraMode[] = ["near", "far", "cockpit"];
    const index = order.indexOf(this.settings.camera);
    this.settings.camera = order[(index + 1) % order.length] ?? "near";
    this.persist();
    this.emit();
  };

  cycleLights = (): void => {
    const order: LightMode[] = ["auto", "on", "off"];
    const index = order.indexOf(this.settings.lights);
    this.settings.lights = order[(index + 1) % order.length] ?? "auto";
    this.persist();
    this.emit();
  };

  resetCar = (): void => {
    const sample = this.road.nearest(this.body.x, this.body.z);
    this.body.x = sample.x;
    this.body.y = sample.y + this.vehicle().ride;
    this.body.z = sample.z;
    this.body.heading = sample.heading;
    this.body.speed = 0;
    this.body.steer = 0;
    this.body.roll = 0;
    this.body.pitch = 0;
    this.body.s = sample.s;
    this.body.hold = this.settings.cruise === null && this.phase !== "attract";
    this.emit();
  };

  tick = (dt: number): void => {
    const spec = this.vehicle();
    const scene = SCENES[this.settings.scene];
    this.road.extendTo(this.body.s + HORIZON[this.settings.quality]);
    if (this.phase !== "pause" && !this.freeCam) {
      let input: DriveInput;
      if (this.phase === "attract" || this.autodrive) {
        if (
          this.phase === "drive" &&
          playerIsDriving(this.keys, this.pointer, this.pad, this.settings.input)
        ) {
          this.autodrive = false;
          input = playerInput(
            this.keys,
            this.pointer,
            this.pad,
            this.settings.input,
            spec,
            this.boostLatch,
          );
        } else {
          input = autodriveInput(this.body, this.road, spec, this.settings.cruise);
        }
      } else {
        input = playerInput(
          this.keys,
          this.pointer,
          this.pad,
          this.settings.input,
          spec,
          this.boostLatch,
        );
        const cancellingCruise =
          this.keys.has("KeyS") ||
          this.keys.has("ArrowDown") ||
          this.keys.has("Space") ||
          this.pad.brake > 0.2 ||
          this.pad.handbrake;
        if (cancellingCruise) {
          this.settings.cruise = null;
        }
        if (this.settings.cruise !== null && input.brake < 0.2 && !input.handbrake) {
          if (this.body.speed < this.settings.cruise - 0.5 && input.throttle >= 0) {
            input = { ...input, throttle: Math.max(input.throttle, 0.7) };
          }
          if (this.body.speed > this.settings.cruise + 0.8) {
            input = { ...input, throttle: 0, brake: Math.max(input.brake, 0.55) };
          }
        }
      }
      tickBody(
        this.body,
        input,
        spec,
        this.road,
        scene,
        this.settings.seed,
        this.settings.steerAssist && !this.autodrive && this.phase === "drive",
        this.settings.transmission,
        dt,
      );
      const moved = Math.abs(this.body.speed) * dt;
      this.trip += moved;
      this.settings.total += moved;
      this.settings.top = Math.max(this.settings.top, Math.abs(this.body.speed));
    }
    this.road.trimBefore(this.body.s - 1600);
    this.saveTimer += dt;
    if (this.saveTimer > 4) {
      this.saveTimer = 0;
      this.persist();
    }
    this.hudTimer(dt);
  };

  private hudClock = 0;

  private hudTimer(dt: number): void {
    this.hudClock += dt;
    if (this.hudClock > 0.1) {
      this.hudClock = 0;
      this.emit();
    }
  }

  private shift(direction: number): void {
    if (this.settings.transmission !== "manual" || this.vehicle().power !== "combustion") {
      return;
    }
    this.body.gear = clamp(this.body.gear + direction, 1, 6);
    this.emit();
  }

  private rebuild(): void {
    this.road = this.makeRoad();
    this.body = createBody(this.road, this.vehicle());
    this.body.hold = this.phase === "drive" && this.settings.cruise === null && !this.autodrive;
    this.trip = 0;
    this.persist();
    this.emit();
  }

  private makeRoad(): Road {
    const road = new Road(
      this.settings.seed,
      STYLES[this.settings.style],
      SCENES[this.settings.scene],
    );
    road.extendTo(HORIZON[this.settings.quality]);
    return road;
  }

  private vehicle() {
    return VEHICLES[this.settings.vehicle];
  }

  private persist(): void {
    saveSettings(this.settings);
  }

  private emit(): void {
    this.hud = this.buildHud();
    for (const listener of this.listeners) {
      listener();
    }
  }

  private buildHud(): HudState {
    const spec = this.vehicle();
    const weather = weatherAt(this.settings.weather);
    const lightsLit =
      this.settings.lights === "on" ||
      (this.settings.lights === "auto" && (weather.night || weather.sunHeight < 0.22));
    return {
      phase: this.phase,
      speed: this.body.speed,
      trip: this.trip,
      total: this.settings.total,
      top: this.settings.top,
      gear: gearLabel(this.body, spec.power),
      camera: this.settings.camera,
      weather: weather.label,
      season: weather.season,
      weatherIndex: this.settings.weather,
      vehicle: spec.id,
      vehicleLabel: spec.label,
      scene: this.settings.scene,
      sceneLabel: SCENES[this.settings.scene].label,
      style: this.settings.style,
      styleLabel: STYLES[this.settings.style].label,
      autodrive: this.autodrive,
      cruise: this.settings.cruise,
      lights: this.settings.lights,
      lightsLit,
      ui: this.ui,
      input: this.settings.input,
      seed: this.settings.seed,
      quality: this.settings.quality,
      units: this.settings.units,
      steerAssist: this.settings.steerAssist,
      doubleTap: this.settings.doubleTap,
      transmission: this.settings.transmission,
      muted: this.settings.muted,
      volume: this.settings.volume,
      color: this.settings.color,
      freeCam: this.freeCam,
      paused: this.phase === "pause",
      power: spec.power,
      drive: spec.drive,
      blurb: spec.blurb,
    };
  }
}

export const formatSpeed = (mps: number, units: Units): string =>
  Math.round(Math.abs(mpsToDisplay(mps, units))).toString();

export const formatDistance = (meters: number, units: Units): string => {
  if (units === "mph") {
    return `${(meters / 1609.344).toFixed(1)} mi`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

export const formatCruise = (mps: number, units: Units): string =>
  Math.round(mpsToDisplay(mps, units)).toString();
