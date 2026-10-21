import { describe, expect, test } from "bun:test";
import { SCENES, STYLES, VEHICLES } from "../src/game/catalog";
import { autodriveInput } from "../src/game/drive";
import { createBody, tickBody } from "../src/game/physics";
import { Road } from "../src/game/road";

const drive = (seconds: number, throttle: number, vehicle = VEHICLES.coupe) => {
  const road = new Road(5, STYLES.easy, SCENES.dunes);
  road.extendTo(2500);
  const body = createBody(road, vehicle);
  const frames = Math.round(seconds / (1 / 60));
  for (let frame = 0; frame < frames; frame += 1) {
    road.extendTo(body.s + 400);
    tickBody(
      body,
      { throttle, steer: 0, brake: 0, handbrake: false, boost: false },
      vehicle,
      road,
      SCENES.dunes,
      5,
      false,
      "auto",
      1 / 60,
    );
  }
  return body.speed;
};

describe("physics", () => {
  test("throttle builds speed and the coach is slower", () => {
    const coupe = drive(6, 1, VEHICLES.coupe);
    const coach = drive(6, 1, VEHICLES.coach);
    expect(coupe).toBeGreaterThan(12);
    expect(coach).toBeLessThan(coupe);
  });

  test("brake sheds speed", () => {
    const road = new Road(5, STYLES.easy, SCENES.dunes);
    road.extendTo(2500);
    const body = createBody(road, VEHICLES.sport);
    for (let frame = 0; frame < 240; frame += 1) {
      road.extendTo(body.s + 400);
      tickBody(
        body,
        { throttle: 1, steer: 0, brake: 0, handbrake: false, boost: false },
        VEHICLES.sport,
        road,
        SCENES.dunes,
        5,
        false,
        "auto",
        1 / 60,
      );
    }
    const fast = body.speed;
    for (let frame = 0; frame < 90; frame += 1) {
      tickBody(
        body,
        { throttle: 0, steer: 0, brake: 1, handbrake: false, boost: false },
        VEHICLES.sport,
        road,
        SCENES.dunes,
        5,
        false,
        "auto",
        1 / 60,
      );
    }
    expect(fast).toBeGreaterThan(15);
    expect(body.speed).toBeLessThan(fast * 0.5);
  });

  test("autodrive points along the road", () => {
    const road = new Road(8, STYLES.highway, SCENES.ridges);
    road.extendTo(800);
    const body = createBody(road, VEHICLES.hatch);
    const input = autodriveInput(body, road, VEHICLES.hatch, null);
    expect(Math.abs(input.steer)).toBeLessThan(0.35);
    expect(input.throttle).toBeGreaterThan(0);
  });
});
