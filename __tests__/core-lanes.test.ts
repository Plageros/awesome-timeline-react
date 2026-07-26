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

// Layout contract: a row opens exactly as many lanes as its peak concurrency and
// never draws one event over another. The simple cases below were hand-traced
// against the original inline algorithm in use-produce-content.tsx and still hold;
// the cases where that algorithm produced overlapping bars (a lane freeing
// mid-row) now assert the correct stacking instead.
describe("assignLanes (interval partitioning)", () => {
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

  test("an event reuses a freed lane, and the next one still opens a new lane", () => {
    // a(0-10) -> lane 0; b(5-15) -> lane 1; c(12-20) reuses lane 0 (a ended at 10).
    // d(13-18) overlaps BOTH c (lane 0, ends 20) and b (lane 1, ends 15), so it must
    // open lane 2. The pre-fix algorithm put it in lane 1, drawn over b.
    const { laneOf, highestLane } = assignLanes(
      [ev("a", 0, 10), ev("b", 5, 15), ev("c", 12, 20), ev("d", 13, 18)],
      0,
      1000
    );
    expect(laneOf.get("a")).toBe(0);
    expect(laneOf.get("b")).toBe(1);
    expect(laneOf.get("c")).toBe(0);
    expect(laneOf.get("d")).toBe(2);
    expect(highestLane).toBe(2);
  });

  test("a capacity row stacks to its peak concurrency with no overlap", () => {
    // Four bars stack up, then lane 0 frees and is reused -- the shape that made the
    // pre-fix scan collapse 7 concurrent bars into 4 lanes (3 drawn over each other).
    const events = [
      ev("e1", 0, 120),
      ev("e2", 20, 220),
      ev("e3", 40, 220),
      ev("e4", 60, 220),
      ev("e5", 120, 300), // takes the lane e1 freed
      ev("e6", 140, 320),
      ev("e7", 160, 340),
      ev("e8", 180, 360),
    ];
    const { laneOf, highestLane } = assignLanes(events, 0, 1000);

    // peak concurrency is 7 (everything but e1 is live at t=180) -> 7 lanes
    expect(highestLane).toBe(6);
    expect(laneOf.get("e5")).toBe(0); // reused, not stacked on top

    // the invariant that matters: no two events sharing a lane overlap in time
    const byLane = new Map<number, typeof events>();
    for (const e of events) {
      const lane = laneOf.get(e.id)!;
      byLane.set(lane, [...(byLane.get(lane) ?? []), e]);
    }
    for (const list of byLane.values()) {
      const sorted = [...list].sort((a, b) => a.startTime - b.startTime);
      sorted.forEach((e, i) => {
        const next = sorted[i + 1];
        if (next) expect(next.startTime).toBeGreaterThanOrEqual(e.endTime);
      });
    }
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
