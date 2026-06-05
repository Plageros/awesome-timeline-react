import { describe, expect, test } from "@jest/globals";
import {
  assignLanes,
  laneTop,
  rowMinHeight,
  staticEventHeight,
} from "../src/core/lanes";
import { EventType } from "../src/types";

const ev = (id: string, startTime: number, endTime: number): EventType => ({
  id,
  rowId: "row",
  startTime,
  endTime,
});

// Golden-master tests: these cases were hand-traced against the original
// inline algorithm in use-produce-content.tsx (pre-extraction). They lock in
// the exact current behavior — including its quirks — so the extraction and
// the future canvas renderer cannot silently change layout.
describe("assignLanes (golden master of the original inline algorithm)", () => {
  test("no events", () => {
    const { laneOf, highestLane } = assignLanes([], 0, 1000);
    expect(laneOf.size).toBe(0);
    expect(highestLane).toBe(0);
  });

  test("non-overlapping events all get lane 0", () => {
    const { laneOf, highestLane } = assignLanes(
      [ev("a", 0, 10), ev("b", 20, 30), ev("c", 40, 50)],
      0,
      1000
    );
    expect(laneOf.get("a")).toBe(0);
    expect(laneOf.get("b")).toBe(0);
    expect(laneOf.get("c")).toBe(0);
    expect(highestLane).toBe(0);
  });

  test("touching events (prev.end === next.start) do not overlap", () => {
    const { laneOf, highestLane } = assignLanes(
      [ev("a", 0, 10), ev("b", 10, 20)],
      0,
      1000
    );
    expect(laneOf.get("a")).toBe(0);
    expect(laneOf.get("b")).toBe(0);
    expect(highestLane).toBe(0);
  });

  test("two overlapping events stack", () => {
    const { laneOf, highestLane } = assignLanes(
      [ev("a", 0, 10), ev("b", 5, 15)],
      0,
      1000
    );
    expect(laneOf.get("a")).toBe(0);
    expect(laneOf.get("b")).toBe(1);
    expect(highestLane).toBe(1);
  });

  test("three nested events stack to three lanes", () => {
    const { laneOf, highestLane } = assignLanes(
      [ev("a", 0, 30), ev("b", 5, 25), ev("c", 10, 20)],
      0,
      1000
    );
    expect(laneOf.get("a")).toBe(0);
    expect(laneOf.get("b")).toBe(1);
    expect(laneOf.get("c")).toBe(2);
    expect(highestLane).toBe(2);
  });

  test("lane resets to 0 after a gap, scan is bounded by previous lane (quirk)", () => {
    // Hand-traced against the original:
    // a(0-10) -> lane 0; b(5-15) -> lane 1; c(12-20) -> slot 0 free -> lane 0,
    // eventOrder resets; d(13-18) -> scan only checks lane 0 (c overlaps) and
    // stops, so d gets lane 1 even though b (lane 1, ends 15) still overlaps
    // it in time. This visual-overlap quirk is intentional golden behavior.
    const { laneOf, highestLane } = assignLanes(
      [ev("a", 0, 10), ev("b", 5, 15), ev("c", 12, 20), ev("d", 13, 18)],
      0,
      1000
    );
    expect(laneOf.get("a")).toBe(0);
    expect(laneOf.get("b")).toBe(1);
    expect(laneOf.get("c")).toBe(0);
    expect(laneOf.get("d")).toBe(1);
    expect(highestLane).toBe(1);
  });

  test("events outside the window are skipped and do not affect lanes", () => {
    const { laneOf, highestLane } = assignLanes(
      [
        ev("before", 0, 50), // ends before window -> skipped
        ev("b", 90, 110),
        ev("c", 150, 250),
        ev("after", 250, 300), // starts after window -> skipped
      ],
      100,
      200
    );
    expect(laneOf.has("before")).toBe(false);
    expect(laneOf.has("after")).toBe(false);
    expect(laneOf.get("b")).toBe(0);
    expect(laneOf.get("c")).toBe(0);
    expect(highestLane).toBe(0);
  });

  test("events touching the window edges are included", () => {
    const { laneOf } = assignLanes(
      [ev("endsAtStart", 0, 100), ev("startsAtEnd", 200, 300)],
      100,
      200
    );
    expect(laneOf.get("endsAtStart")).toBe(0);
    expect(laneOf.get("startsAtEnd")).toBe(0);
  });

  test("highest lane from a trailing stack is counted (post-loop flush)", () => {
    const { highestLane } = assignLanes(
      [ev("a", 0, 100), ev("b", 10, 90), ev("c", 20, 80)],
      0,
      1000
    );
    expect(highestLane).toBe(2);
  });
});

describe("vertical layout helpers (legacy magic numbers)", () => {
  test("laneTop matches 10 + 22 * lane", () => {
    expect(laneTop(0)).toBe(10);
    expect(laneTop(1)).toBe(32);
    expect(laneTop(3)).toBe(76);
  });

  test("rowMinHeight matches 40 + 22 * highestLane", () => {
    expect(rowMinHeight(0)).toBe(40);
    expect(rowMinHeight(2)).toBe(84);
  });

  test("staticEventHeight matches 20 + 22 * highestLane", () => {
    expect(staticEventHeight(0)).toBe(20);
    expect(staticEventHeight(1)).toBe(42);
  });
});
