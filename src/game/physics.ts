import type { SceneSpec, VehicleSpec } from "./catalog";
import { clamp, wrapAngle } from "./math";
import type { Road } from "./road";
import { sampleSurface } from "./terrain";
import type { Body, DriveInput, Transmission } from "./types";

const GEARS = [0, 2.35, 1.72, 1.3, 1.05, 0.86, 0.74];

const gearRatio = (gear: number): number => GEARS[clamp(Math.round(gear), 1, 6)] ?? 1;

export const createBody = (road: Road, spec: VehicleSpec): Body => {
  const sample = road.at(30);
  return {
    x: sample.x,
    y: sample.y + spec.ride,
    z: sample.z,
    heading: sample.heading,
    speed: 0,
    steer: 0,
    roll: 0,
    pitch: 0,
    wheel: 0,
    s: sample.s,
    gear: 1,
    hold: false,
  };
};

export const tickBody = (
  body: Body,
  input: DriveInput,
  spec: VehicleSpec,
  road: Road,
  scene: SceneSpec,
  seed: number,
  assist: boolean,
  transmission: Transmission,
  dt: number,
): void => {
  const step = clamp(dt, 0, 0.05);
  if (body.hold) {
    const moving =
      Math.abs(input.throttle) > 0.05 || Math.abs(input.steer) > 0.05 || input.brake > 0.05;
    if (!moving) {
      body.speed = 0;
      return;
    }
    body.hold = false;
  }
  const here = sampleSurface(road, scene, seed, body.x, body.z);
  const fade = 1 / (1 + Math.abs(body.speed) * spec.steerFade);
  let steerCommand = input.steer;
  if (assist && !input.handbrake) {
    const error = wrapAngle(here.sample.heading - body.heading);
    steerCommand = clamp(steerCommand + error * 0.25, -1, 1);
  }
  const desired = steerCommand * spec.maxSteer * fade;
  const steerStep = 2.1 * step;
  body.steer += clamp(desired - body.steer, -steerStep, steerStep);

  const boost = input.boost ? spec.boost : 1;
  let accel = 0;
  const stopped = Math.abs(body.speed) < 0.45;
  const reversing = body.speed < -0.3;
  if (input.throttle > 0) {
    accel = input.throttle * spec.accel * boost;
  } else if (input.throttle < 0 && (stopped || reversing)) {
    accel = input.throttle * spec.accel * 0.5;
  } else if (input.throttle < 0) {
    accel = input.throttle * spec.brake * 0.65;
  }
  if (spec.power === "combustion" && transmission === "manual") {
    accel *= gearRatio(body.gear);
    const gearTop = spec.top * (0.22 + body.gear * 0.13);
    if (Math.abs(body.speed) > gearTop) {
      accel *= 0.18;
    }
  } else if (spec.power === "combustion") {
    const ratio = clamp(Math.abs(body.speed) / spec.top, 0, 0.999);
    body.gear = Math.min(6, Math.floor(ratio * 6) + 1);
  } else {
    body.gear = body.speed < -0.4 ? -1 : 1;
  }
  if (input.brake > 0) {
    accel -= Math.sign(body.speed || 1) * input.brake * spec.brake;
  }
  if (input.handbrake && spec.wheels === 4 && Math.abs(body.speed) > 1) {
    accel -= Math.sign(body.speed) * spec.brake * 0.8;
  }
  const drag = spec.accel / (spec.top * spec.top);
  accel -= body.speed * Math.abs(body.speed) * drag;
  const aheadX = body.x + Math.sin(body.heading) * 3;
  const aheadZ = body.z + Math.cos(body.heading) * 3;
  const ahead = sampleSurface(road, scene, seed, aheadX, aheadZ);
  const grade = clamp((ahead.y - here.y) / 3, -0.4, 0.4);
  accel -= grade * 9.81;
  if (here.distance > here.sample.width * 0.58) {
    accel -= body.speed * 0.55;
  }
  body.speed += accel * step;
  body.speed = clamp(body.speed, -spec.reverse, spec.top * (input.boost ? 1.12 : 1));

  let grip = here.grip * spec.grip;
  if (input.handbrake && spec.wheels === 4) {
    grip *= 0.4;
  }
  if (here.distance > here.sample.width * 0.75) {
    grip *= 0.72;
  }
  const yaw = (Math.sin(body.steer) * body.speed) / spec.wheelBase;
  const layout = spec.drive === "rwd" ? 0.09 : spec.drive === "fwd" ? -0.06 : 0.01;
  body.heading = wrapAngle(
    body.heading +
      (yaw + layout * input.throttle * body.steer * Math.abs(body.speed)) * grip * step,
  );
  body.x += Math.sin(body.heading) * body.speed * step;
  body.z += Math.cos(body.heading) * body.speed * step;
  const landed = sampleSurface(road, scene, seed, body.x, body.z);
  body.y = landed.y + spec.ride;
  const pitchTarget = clamp(-grade * 1.5, -0.22, 0.22);
  const rollTarget = clamp(body.steer * body.speed * 0.011 + landed.sample.bank, -0.28, 0.28);
  const blend = Math.min(1, step * 5);
  body.pitch += (pitchTarget - body.pitch) * blend;
  body.roll += (rollTarget - body.roll) * blend;
  body.wheel += body.speed * step * 0.32;
  body.s = landed.sample.s;
};
