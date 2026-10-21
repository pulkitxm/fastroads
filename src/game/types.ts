export type SceneId = "ridges" | "shore" | "timber" | "dunes" | "offworld";

export type RoadStyle = "easy" | "flowing" | "winding" | "highway" | "dirt";

export type VehicleId = "coupe" | "hatch" | "sport" | "coach" | "bike";

export type Quality = "low" | "medium" | "high";

export type Units = "mph" | "kmh";

export type InputMode = "keyboard" | "mouse" | "autodrive";

export type CameraMode = "near" | "far" | "cockpit";

export type Transmission = "auto" | "manual";

export type Phase = "attract" | "drive" | "pause";

export type Precip = "none" | "rain" | "snow";

export type DriveLayout = "fwd" | "rwd" | "awd";

export type Powertrain = "electric" | "combustion";

export type TreeKind = "pine" | "palm" | "crystal" | "none";

export type LightMode = "auto" | "on" | "off";

export type Sample = {
  s: number;
  x: number;
  y: number;
  z: number;
  heading: number;
  width: number;
  bank: number;
  grip: number;
  paved: boolean;
};

export type Body = {
  x: number;
  y: number;
  z: number;
  heading: number;
  speed: number;
  steer: number;
  roll: number;
  pitch: number;
  wheel: number;
  s: number;
  gear: number;
  hold: boolean;
};

export type DriveInput = {
  throttle: number;
  steer: number;
  brake: number;
  handbrake: boolean;
  boost: boolean;
};

export type PointerState = {
  steer: number;
  left: boolean;
  right: boolean;
  overUi: boolean;
};

export type PadState = {
  steer: number;
  throttle: number;
  brake: number;
  handbrake: boolean;
  camera: boolean;
  reset: boolean;
  autodrive: boolean;
  pause: boolean;
  headlights: boolean;
};
