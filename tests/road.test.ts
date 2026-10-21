import { describe, expect, test } from "bun:test";
import { SCENES, STYLES, stepWeather, WEATHERS } from "../src/game/catalog";
import { fbm } from "../src/game/noise";
import { Road } from "../src/game/road";

describe("noise", () => {
  test("repeats for a seed", () => {
    expect(fbm(12.5, -4.25, 9)).toBe(fbm(12.5, -4.25, 9));
    expect(fbm(12.5, -4.25, 9)).not.toBe(fbm(12.5, -4.25, 10));
  });
});

describe("road", () => {
  test("stays finite and climbs gently", () => {
    const road = new Road(42, STYLES.flowing, SCENES.ridges);
    road.extendTo(1600);
    let previous = -1;
    for (let index = 0; index < road.samples.length; index += 1) {
      const sample = road.samples[index];
      expect(sample).toBeDefined();
      if (!sample) {
        continue;
      }
      expect(Number.isFinite(sample.y)).toBe(true);
      expect(sample.s).toBeGreaterThan(previous);
      previous = sample.s;
      if (index === 0) {
        continue;
      }
      const before = road.samples[index - 1];
      if (!before) {
        continue;
      }
      const span = Math.hypot(sample.x - before.x, sample.z - before.z);
      if (span > 0.05) {
        expect(Math.abs(sample.y - before.y) / span).toBeLessThan(0.2);
      }
    }
    expect(road.samples.length).toBeGreaterThan(100);
  });

  test("matches another road from the same seed", () => {
    const a = new Road(99, STYLES.winding, SCENES.shore);
    const b = new Road(99, STYLES.winding, SCENES.shore);
    a.extendTo(400);
    b.extendTo(400);
    const left = a.at(250);
    const right = b.at(250);
    expect(left.x).toBeCloseTo(right.x, 4);
    expect(left.z).toBeCloseTo(right.z, 4);
    expect(left.y).toBeCloseTo(right.y, 4);
  });
});

describe("weather", () => {
  test("wraps the season cycle", () => {
    let index = 0;
    for (let step = 0; step < WEATHERS.length; step += 1) {
      index = stepWeather(index, 1);
    }
    expect(index).toBe(0);
    expect(stepWeather(0, -1)).toBe(WEATHERS.length - 1);
  });
});
