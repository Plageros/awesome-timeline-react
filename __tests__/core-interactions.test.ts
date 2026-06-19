import { describe, expect, test } from "@jest/globals";
import {
  canResizeEvent,
  computeDropTimes,
  computeResizeTimes,
  computeZoom,
  isRowDroppable,
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

describe("computeDropTimes (absolute grid-cell drop snap)", () => {
  test("snaps the dropped start to the nearest absolute cell boundary", () => {
    // cellTime = 100*36 = 3600; windowStart 10800 is on a boundary (3*3600)
    expect(
      computeDropTimes({
        pointerX: 40, // t = 10800 + 1440 = 12240 -> round(3.4) = 3 -> 10800
        cellWidth: 100,
        tick: 36,
        windowStart: 10_800,
        duration: 500,
      })
    ).toEqual({ startTime: 10_800, endTime: 11_300 });
    expect(
      computeDropTimes({
        pointerX: 60, // t = 10800 + 2160 = 12960 -> round(3.6) = 4 -> 14400
        cellWidth: 100,
        tick: 36,
        windowStart: 10_800,
        duration: 500,
      })
    ).toEqual({ startTime: 14_400, endTime: 14_900 });
  });

  test("stays on the absolute grid regardless of window phase (after panning)", () => {
    // window panned off the boundary; nearest cell is still a 3600 multiple
    const { startTime } = computeDropTimes({
      pointerX: 0,
      cellWidth: 100,
      tick: 36,
      windowStart: 11_000, // t = 11000 -> round(3.055) = 3 -> 10800
      duration: 0,
    });
    expect(startTime).toBe(10_800);
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

  test("group-parent is never resizable, regardless of mode or opt-in", () => {
    expect(canResizeEvent(ev({ isGroupParent: true }), true)).toBe(false);
    expect(
      canResizeEvent({ ...ev({ isGroupParent: true, isResizable: true }) }, true)
    ).toBe(false);
    expect(
      canResizeEvent({ ...ev({ isGroupParent: true, isResizable: true }) }, false)
    ).toBe(false);
  });
});

describe("isRowDroppable (per-event drop-target restriction)", () => {
  test("undefined droppableRowIds = unrestricted (any row)", () => {
    expect(isRowDroppable(undefined, "r1")).toBe(true);
    expect(isRowDroppable(undefined, "anything")).toBe(true);
  });

  test("only listed rows are allowed", () => {
    expect(isRowDroppable(["r1", "r2"], "r1")).toBe(true);
    expect(isRowDroppable(["r1", "r2"], "r2")).toBe(true);
    expect(isRowDroppable(["r1", "r2"], "r3")).toBe(false);
  });

  test("empty list pins the event (every row rejected)", () => {
    expect(isRowDroppable([], "r1")).toBe(false);
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

describe("computeZoom (time-frame zoom)", () => {
  // window [1000, 2000] over 100px content -> 10 s/px; cellWidth 50, tick 10 ->
  // time-per-cell = 500s.
  const win: [number, number] = [1000, 2000];
  const limits = { minWindowSeconds: 100, maxWindowSeconds: 100000 };

  test("zoom in keeps the anchored timestamp under the cursor", () => {
    // anchor at x=20 -> t = 1000 + 20*10 = 1200
    const out = computeZoom(win, 10, 50, 20, 0.5, 100, limits);
    expect(out.windowTime[1] - out.windowTime[0]).toBe(500); // halved span
    // the anchored time stays at the same pixel: newStart + 20*newTick == 1200
    const tAtAnchor = out.windowTime[0] + 20 * out.tick;
    expect(tAtAnchor).toBeCloseTo(1200, 6);
  });

  test("anchor holds at the right edge when zooming out", () => {
    const out = computeZoom(win, 10, 50, 100, 2, 100, limits);
    expect(out.windowTime[1] - out.windowTime[0]).toBe(2000);
    const tAtAnchor = out.windowTime[0] + 100 * out.tick;
    expect(tAtAnchor).toBeCloseTo(2000, 6); // right edge time (1000+100*10)
  });

  test("preserves time-per-cell (cellWidth * tick) across the zoom", () => {
    const before = 50 * 10;
    const inOut = computeZoom(win, 10, 50, 50, 0.5, 100, limits);
    expect(inOut.cellWidth * inOut.tick).toBeCloseTo(before, 6);
    const outOut = computeZoom(win, 10, 50, 50, 3, 100, limits);
    expect(outOut.cellWidth * outOut.tick).toBeCloseTo(before, 6);
  });

  test("factor 1 is a no-op (pan-equivalent identity)", () => {
    const out = computeZoom(win, 10, 50, 37, 1, 100, limits);
    expect(out.windowTime).toEqual([1000, 2000]);
    expect(out.tick).toBeCloseTo(10, 6);
    expect(out.cellWidth).toBeCloseTo(50, 6);
  });

  test("cell duration stays exactly constant across many compounding zooms", () => {
    // start aligned to a 3600s cell so the grid sits on the hour
    let w: [number, number] = [0, 21600]; // 6h over 1200px
    let t = 18; // 21600 / 1200
    let cw = 200; // 3600 / 18 -> cellTime = 3600
    const wide = { minWindowSeconds: 60, maxWindowSeconds: 1e9 };
    const factors = [0.85, 0.85, 1.2, 0.9, 1.3, 0.8, 1.1, 0.85, 1.25, 0.87];
    for (const f of factors) {
      const out = computeZoom(w, t, cw, 640, f, 1200, wide);
      w = out.windowTime;
      t = out.tick;
      cw = out.cellWidth;
      // cellTime must remain a clean hour, or grid lines drift off the time bar
      expect(cw * t).toBeCloseTo(3600, 6);
    }
  });

  test("clamps to min/max window and the anchor still holds", () => {
    const clampedMin = computeZoom(win, 10, 50, 0, 0.0001, 100, {
      minWindowSeconds: 400,
      maxWindowSeconds: 100000,
    });
    expect(clampedMin.windowTime[1] - clampedMin.windowTime[0]).toBe(400);
    // anchored at x=0 -> windowStart stays at 1000
    expect(clampedMin.windowTime[0]).toBe(1000);

    const clampedMax = computeZoom(win, 10, 50, 0, 1000, 100, {
      minWindowSeconds: 100,
      maxWindowSeconds: 5000,
    });
    expect(clampedMax.windowTime[1] - clampedMax.windowTime[0]).toBe(5000);
  });
});
