import type { VehicleSpec } from "./catalog";
import { clamp, wrapAngle } from "./math";
import type { Road } from "./road";
import type { Body, DriveInput, InputMode, PadState, PointerState } from "./types";

const emptyPad = (): PadState => ({
  steer: 0,
  throttle: 0,
  brake: 0,
  handbrake: false,
  camera: false,
  reset: false,
  autodrive: false,
  pause: false,
  headlights: false,
});

export const IDLE_PAD = emptyPad();

export const autodriveInput = (
  body: Body,
  road: Road,
  spec: VehicleSpec,
  cruise: number | null,
): DriveInput => {
  const look = 12 + Math.abs(body.speed) * 0.5;
  const ahead = road.at(body.s + Math.max(8, look));
  const aim = Math.atan2(ahead.x - body.x, ahead.z - body.z);
  const error = wrapAngle(aim - body.heading);
  const steer = clamp(error * 1.7, -1, 1);
  const curve = Math.min(1, Math.abs(error) * 1.25);
  const comfort = spec.top * (1 - curve * 0.62);
  const target = Math.min(cruise ?? Math.min(spec.top * 0.58, 26), comfort);
  let throttle = 0;
  let brake = 0;
  if (body.speed < target - 0.4) {
    throttle = clamp((target - body.speed) / 7, 0.2, 1);
  }
  if (body.speed > target + 0.9) {
    brake = clamp((body.speed - target) / 10, 0, 1);
  }
  return { throttle, steer, brake, handbrake: false, boost: false };
};

export const playerInput = (
  keys: ReadonlySet<string>,
  pointer: PointerState,
  pad: PadState,
  mode: InputMode,
  spec: VehicleSpec,
  boostLatch: boolean,
): DriveInput => {
  let throttle = 0;
  let steer = 0;
  let brake = pad.brake;
  if (keys.has("KeyW") || keys.has("ArrowUp")) {
    throttle += 1;
  }
  if (keys.has("KeyS") || keys.has("ArrowDown")) {
    throttle -= 1;
  }
  if (keys.has("KeyA") || keys.has("ArrowLeft")) {
    steer -= 1;
  }
  if (keys.has("KeyD") || keys.has("ArrowRight")) {
    steer += 1;
  }
  if (mode === "mouse" && !pointer.overUi) {
    steer = pointer.steer;
    if (pointer.left) {
      throttle = Math.max(throttle, 1);
    }
    if (pointer.right) {
      brake = 1;
      if (!pointer.left) {
        throttle = Math.min(throttle, 0);
      }
    }
  }
  steer = clamp(steer + pad.steer, -1, 1);
  if (pad.throttle > 0) {
    throttle = Math.max(throttle, pad.throttle);
  }
  if (brake > 0.15 && throttle > 0) {
    throttle = 0;
  }
  const handbrake = (keys.has("Space") || pad.handbrake) && spec.wheels === 4;
  const boosting =
    throttle > 0 &&
    (boostLatch || keys.has("ShiftLeft") || keys.has("ShiftRight") || keys.has("Shift"));
  return {
    throttle: clamp(throttle, -1, 1),
    steer,
    brake: clamp(brake, 0, 1),
    handbrake,
    boost: boosting,
  };
};

export const playerIsDriving = (
  keys: ReadonlySet<string>,
  pointer: PointerState,
  pad: PadState,
  mode: InputMode,
): boolean => {
  if (
    keys.has("KeyW") ||
    keys.has("KeyA") ||
    keys.has("KeyS") ||
    keys.has("KeyD") ||
    keys.has("ArrowUp") ||
    keys.has("ArrowDown") ||
    keys.has("ArrowLeft") ||
    keys.has("ArrowRight") ||
    keys.has("Space")
  ) {
    return true;
  }
  if (
    mode === "mouse" &&
    !pointer.overUi &&
    (pointer.left || pointer.right || Math.abs(pointer.steer) > 0.08)
  ) {
    return true;
  }
  return Math.abs(pad.steer) > 0.12 || pad.throttle > 0.05 || pad.brake > 0.05 || pad.handbrake;
};
