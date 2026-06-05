import { describe, expect, test } from "@jest/globals";
import {
  intersectsWindow,
  timeToWidth,
  timeToX,
  xToTime,
} from "../src/core/coords";
import { EventType } from "../src/types";

const ev = (startTime: number, endTime: number): EventType => ({
  id: "e",
  rowId: "row",
  startTime,
  endTime,
});

describe("coords", () => {
  test("timeToX converts seconds to pixels relative to window start", () => {
    // tick = 5 seconds per pixel
    expect(timeToX(150, 100, 5)).toBe(10);
    expect(timeToX(100, 100, 5)).toBe(0);
    expect(timeToX(50, 100, 5)).toBe(-10); // before window -> negative x
  });

  test("timeToWidth converts a duration to pixels", () => {
    expect(timeToWidth(100, 200, 5)).toBe(20);
    expect(timeToWidth(100, 100, 5)).toBe(0);
  });

  test("xToTime is the inverse of timeToX", () => {
    const windowStart = 1_717_000_000;
    const tick = 3.5;
    const time = windowStart + 12345;
    expect(xToTime(timeToX(time, windowStart, tick), windowStart, tick)).toBeCloseTo(
      time,
      6
    );
  });

  test("intersectsWindow bounds are inclusive (matches original filter)", () => {
    expect(intersectsWindow(ev(0, 100), 100, 200)).toBe(true); // touches start
    expect(intersectsWindow(ev(200, 300), 100, 200)).toBe(true); // touches end
    expect(intersectsWindow(ev(0, 99), 100, 200)).toBe(false);
    expect(intersectsWindow(ev(201, 300), 100, 200)).toBe(false);
    expect(intersectsWindow(ev(120, 180), 100, 200)).toBe(true); // inside
    expect(intersectsWindow(ev(0, 300), 100, 200)).toBe(true); // spans
  });
});
