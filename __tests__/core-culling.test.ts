import { describe, expect, test } from "@jest/globals";
import { cullToWindow } from "../src/core/culling";
import { EventType } from "../src/types";

const ev = (id: string, startTime: number, endTime: number): EventType => ({
  id,
  rowId: "row",
  startTime,
  endTime,
});

describe("cullToWindow", () => {
  const events = [
    ev("a", 0, 50),
    ev("b", 40, 120),
    ev("c", 100, 150),
    ev("d", 160, 220),
    ev("e", 300, 400),
  ]; // sorted by startTime

  test("keeps exactly the window-intersecting events", () => {
    expect(cullToWindow(events, 100, 200).map((e) => e.id)).toEqual([
      "b",
      "c",
      "d",
    ]);
  });

  test("matches the inclusive bounds of intersectsWindow", () => {
    // endTime === windowStart and startTime === windowEnd are both included
    expect(cullToWindow([ev("x", 0, 100)], 100, 200)).toHaveLength(1);
    expect(cullToWindow([ev("y", 200, 300)], 100, 200)).toHaveLength(1);
    expect(cullToWindow([ev("z", 201, 300)], 100, 200)).toHaveLength(0);
  });

  test("empty input and fully-outside windows", () => {
    expect(cullToWindow([], 0, 100)).toEqual([]);
    expect(cullToWindow(events, 500, 600)).toEqual([]);
    expect(cullToWindow(events, 230, 290)).toEqual([]);
  });

  test("preserves sort order", () => {
    const out = cullToWindow(events, 0, 1000);
    expect(out.map((e) => e.id)).toEqual(["a", "b", "c", "d", "e"]);
  });
});
