import { describe, expect, test } from "@jest/globals";
import {
  canResizeEvent,
  computeDropTimes,
  computeResizeTimes,
  stepCellWidth,
} from "../src/core/interactions";
import { EventType } from "../src/types";

const ev = (props?: EventType["props"]): EventType => ({
  id: "e",
  rowId: "r",
  startTime: 1000,
  endTime: 2000,
  props,
});

describe("computeDropTimes (legacy row-content drop snap)", () => {
  test("snaps the pointer to the nearest cell", () => {
    // cellWidth 100, tick 36 -> one cell = 3600s
    expect(
      computeDropTimes({
        pointerX: 149, // closest cell 1
        cellWidth: 100,
        tick: 36,
        windowStart: 10_000,
        duration: 500,
      })
    ).toEqual({ startTime: 13_600, endTime: 14_100 });
    expect(
      computeDropTimes({
        pointerX: 150, // Math.round(1.5) = 2
        cellWidth: 100,
        tick: 36,
        windowStart: 10_000,
        duration: 500,
      })
    ).toEqual({ startTime: 17_200, endTime: 17_700 });
  });

  test("cell 0 drops at the window start", () => {
    expect(
      computeDropTimes({
        pointerX: 30,
        cellWidth: 100,
        tick: 36,
        windowStart: 10_000,
        duration: 500,
      }).startTime
    ).toBe(10_000);
  });
});

describe("computeResizeTimes (legacy event resize commit)", () => {
  test("right edge moves endTime, rounded", () => {
    expect(computeResizeTimes(ev(), 10.4, 3, "right")).toEqual({
      startTime: 1000,
      endTime: 2031, // round(2000 + 31.2)
    });
  });

  test("left edge moves startTime", () => {
    expect(computeResizeTimes(ev(), -100, 3, "left")).toEqual({
      startTime: 700,
      endTime: 2000,
    });
  });

  test("collapsing or inverting the event is rejected", () => {
    expect(computeResizeTimes(ev(), 400, 3, "left")).toBeNull(); // start 2200 > end
    expect(computeResizeTimes(ev(), -400, 3, "right")).toBeNull(); // end 800 < start
    // exactly zero duration is also rejected (> 0 guard)
    expect(
      computeResizeTimes({ startTime: 0, endTime: 300 }, 100, 3, "left")
    ).toBeNull();
  });
});

describe("canResizeEvent (legacy render guard)", () => {
  test("default: resizable when eventsResize is on and not locked", () => {
    expect(canResizeEvent(ev(), true)).toBe(true);
    expect(canResizeEvent(ev({ isLocked: true }), true)).toBe(false);
    expect(canResizeEvent(ev({ isResizable: false }), true)).toBe(false);
  });

  test("eventsResize off: only explicit per-event opt-in", () => {
    expect(canResizeEvent(ev(), false)).toBe(false);
    expect(canResizeEvent(ev({ isResizable: true }), false)).toBe(true);
  });
});

describe("stepCellWidth (legacy wheel granularity clamp)", () => {
  // tick 9 -> pixelsToCalculate = 100
  test("steps by 900/tick px", () => {
    expect(stepCellWidth(500, 1, 9)).toBe(600);
    expect(stepCellWidth(500, -1, 9)).toBe(400);
  });

  test("clamps at [step, 12*step]", () => {
    expect(stepCellWidth(100, -1, 9)).toBe(100); // 0 < 100 -> unchanged
    expect(stepCellWidth(1200, 1, 9)).toBe(1200); // 1300 > 1200 -> unchanged
  });
});
