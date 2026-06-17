import { describe, expect, test } from "@jest/globals";
import { SceneStore } from "../src/core/scene";
import { EventType, RowType } from "../src/types";

const rows: RowType[] = [
  { id: "r1", name: "Row 1" },
  { id: "r2", name: "Row 2" },
];

const ev = (
  id: string,
  rowId: string,
  startTime: number,
  endTime: number
): EventType => ({ id, rowId, startTime, endTime });

const makeStore = (events: EventType[] = []) => {
  const store = new SceneStore();
  store.setRows(rows);
  store.setEvents(events);
  return store;
};

describe("SceneStore", () => {
  test("setEvents distributes events to rows, sorted by startTime", () => {
    const store = makeStore([
      ev("b", "r1", 50, 60),
      ev("a", "r1", 0, 10),
      ev("c", "r2", 20, 30),
    ]);
    expect(store.getRowEvents("r1").map((event) => event.id)).toEqual([
      "a",
      "b",
    ]);
    expect(store.getRowEvents("r2").map((event) => event.id)).toEqual(["c"]);
  });

  test("events for unknown rows are dropped", () => {
    const store = makeStore([ev("x", "missing", 0, 10)]);
    expect(store.getEvent("x")).toBeUndefined();
  });

  test("upsert inserts at the sorted position", () => {
    const store = makeStore([ev("a", "r1", 0, 10), ev("c", "r1", 50, 60)]);
    store.applyPatches([{ op: "upsert", event: ev("b", "r1", 20, 30) }]);
    expect(store.getRowEvents("r1").map((event) => event.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  test("update changes times and re-sorts within the row", () => {
    const store = makeStore([ev("a", "r1", 0, 10), ev("b", "r1", 20, 30)]);
    store.applyPatches([
      { op: "update", id: "a", changes: { startTime: 40, endTime: 50 } },
    ]);
    expect(store.getRowEvents("r1").map((event) => event.id)).toEqual([
      "b",
      "a",
    ]);
    expect(store.getEvent("a")).toMatchObject({ startTime: 40, endTime: 50 });
  });

  test("update can move an event across rows", () => {
    const store = makeStore([ev("a", "r1", 0, 10)]);
    store.applyPatches([{ op: "update", id: "a", changes: { rowId: "r2" } }]);
    expect(store.getRowEvents("r1")).toHaveLength(0);
    expect(store.getRowEvents("r2").map((event) => event.id)).toEqual(["a"]);
    expect(store.getEvent("a")?.rowId).toBe("r2");
  });

  test("remove deletes the event", () => {
    const store = makeStore([ev("a", "r1", 0, 10)]);
    store.applyPatches([{ op: "remove", id: "a" }]);
    expect(store.getEvent("a")).toBeUndefined();
    expect(store.getRowEvents("r1")).toHaveLength(0);
  });

  test("update of a missing event is a no-op", () => {
    const store = makeStore([]);
    expect(() =>
      store.applyPatches([{ op: "update", id: "ghost", changes: {} }])
    ).not.toThrow();
  });

  test("getLanes caches per window and invalidates on patches", () => {
    const store = makeStore([ev("a", "r1", 0, 100), ev("b", "r1", 50, 150)]);
    const first = store.getLanes("r1", 0, 1000);
    expect(first.laneOf.get("b")).toBe(1);
    // cached: same object back for the same window
    expect(store.getLanes("r1", 0, 1000)).toBe(first);
    // different window -> recompute
    expect(store.getLanes("r1", 500, 1000)).not.toBe(first);
    // patch invalidates
    const again = store.getLanes("r1", 0, 1000);
    store.applyPatches([{ op: "remove", id: "b" }]);
    const afterPatch = store.getLanes("r1", 0, 1000);
    expect(afterPatch).not.toBe(again);
    expect(afterPatch.highestLane).toBe(0);
  });

  test("getRowOffsets accumulates heights in row order", () => {
    // r1 has a 2-lane stack -> height 40 + 22 = 62; r2 empty -> 40
    const store = makeStore([ev("a", "r1", 0, 100), ev("b", "r1", 50, 150)]);
    const { offsetOf, totalHeight } = store.getRowOffsets(0, 1000);
    expect(offsetOf.get("r1")).toBe(0);
    expect(offsetOf.get("r2")).toBe(62);
    expect(totalHeight).toBe(102);
  });

  test("label min height grows a row beyond its lane height", () => {
    // r1 has a 2-lane stack -> lane height 62; r2 is empty -> lane height 40
    const store = makeStore([ev("a", "r1", 0, 100), ev("b", "r1", 50, 150)]);
    // a tall wrapped label on r2, a short one on r1 (below its lane height)
    store.setLabelMinHeights(
      new Map([
        ["r1", 30],
        ["r2", 90],
      ])
    );
    // r1: max(62, 30) = 62 (lanes win); r2: max(40, 90) = 90 (label wins)
    expect(store.getRowHeight("r1", 0, 1000)).toBe(62);
    expect(store.getRowHeight("r2", 0, 1000)).toBe(90);
    const { offsetOf, totalHeight } = store.getRowOffsets(0, 1000);
    expect(offsetOf.get("r2")).toBe(62);
    expect(totalHeight).toBe(152);
  });

  test("setLabelMinHeights only bumps version when a value changes", () => {
    const store = makeStore();
    const before = store.version;
    store.setLabelMinHeights(new Map([["r1", 50]]));
    const afterChange = store.version;
    expect(afterChange).toBeGreaterThan(before);
    // identical map -> no bump
    store.setLabelMinHeights(new Map([["r1", 50]]));
    expect(store.version).toBe(afterChange);
  });

  test("setRows keeps existing row events and drops removed rows' events", () => {
    const store = makeStore([ev("a", "r1", 0, 10), ev("b", "r2", 0, 10)]);
    store.setRows([{ id: "r1", name: "Row 1 renamed" }]);
    expect(store.getRowEvents("r1").map((event) => event.id)).toEqual(["a"]);
    expect(store.getEvent("b")).toBeUndefined();
    expect(store.getRow("r1")?.name).toBe("Row 1 renamed");
  });

  test("version bumps and listeners fire on every mutation", () => {
    const store = makeStore([]);
    const seen: number[] = [];
    const unsubscribe = store.subscribe(() => seen.push(store.version));
    const before = store.version;
    store.applyPatches([{ op: "upsert", event: ev("a", "r1", 0, 10) }]);
    store.setEvents([]);
    expect(store.version).toBe(before + 2);
    expect(seen).toHaveLength(2);
    unsubscribe();
    store.applyPatches([{ op: "remove", id: "a" }]);
    expect(seen).toHaveLength(2);
  });
});
