import { describe, expect, test } from "bun:test";
import { brand } from "../src/brand";

describe("brand", () => {
  test("names the drive", () => {
    expect(brand).toBe("fast roads");
  });
});
