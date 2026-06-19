import { describe, expect, test } from "@jest/globals";
import { SceneStore } from "../src/core/scene";
import { EventType, RowType } from "../src/types";

// p1 is a parent row owning child rows c1 + c2; r0 is an ungrouped row.
const rows: RowType[] = [
  { id: "r0", name: "Standalone" },
  { id: "p1", name: "Group 1" },
  { id: "c1", name: "Child A", parentId: "p1" },
  { id: "c2", name: "Child B", parentId: "p1" },
];

const WS = 0;
const WE = 1_000_000; // window wide enough to include every fixture event

const ev = (
  id: string,
  rowId: string,
  startTime: number,
  endTime: number,
  props?: EventType["props"]
): EventType => ({ id, rowId, startTime, endTime, props });

const parent = (id: string, rowId: string, startTime: number, endTime: number) =>
  ev(id, rowId, startTime, endTime, { isGroupParent: true });

const child = (
  id: string,
  rowId: string,
  startTime: number,
  endTime: number,
  parentEventId: string
) => ev(id, rowId, startTime, endTime, { parentEventId });

const makeStore = (events: EventType[] = []) => {
  const store = new SceneStore();
  store.setRows(rows);
  store.setEvents(events);
  return store;
};

// flushing only happens when the parent's row is queried
const parentSpan = (store: SceneStore, parentRowId: string, id: string) => {
  store.getRowEvents(parentRowId);
  const p = store.getEvent(id);
  return p ? [p.startTime, p.endTime] : null;
};

describe("SceneStore grouping — derived parent spans", () => {
  test("parent span = earliest child start / latest child end across rows", () => {
    const store = makeStore([
      parent("P", "p1", 0, 0),
      child("ch1", "c1", 100, 200, "P"),
      child("ch2", "c2", 50, 150, "P"),
    ]);
    expect(parentSpan(store, "p1", "P")).toEqual([50, 200]);
  });

  test("childless parent keeps its supplied times", () => {
    const store = makeStore([parent("P", "p1", 300, 400)]);
    expect(parentSpan(store, "p1", "P")).toEqual([300, 400]);
  });

  test("recomputes when a child is updated", () => {
    const store = makeStore([
      parent("P", "p1", 0, 0),
      child("ch1", "c1", 100, 200, "P"),
    ]);
    expect(parentSpan(store, "p1", "P")).toEqual([100, 200]);
    store.applyPatches([
      { op: "update", id: "ch1", changes: { startTime: 40, endTime: 90 } },
    ]);
    expect(parentSpan(store, "p1", "P")).toEqual([40, 90]);
  });

  test("recomputes when a child is added (upsert) and removed", () => {
    const store = makeStore([
      parent("P", "p1", 0, 0),
      child("ch1", "c1", 100, 200, "P"),
    ]);
    expect(parentSpan(store, "p1", "P")).toEqual([100, 200]);

    store.applyPatches([
      { op: "upsert", event: child("ch2", "c2", 300, 500, "P") },
    ]);
    expect(parentSpan(store, "p1", "P")).toEqual([100, 500]);

    store.applyPatches([{ op: "remove", id: "ch2" }]);
    expect(parentSpan(store, "p1", "P")).toEqual([100, 200]);
  });

  test("a span change re-sorts the parent row so the sorted invariant holds", () => {
    const store = makeStore([
      parent("P", "p1", 0, 0), // derives to children -> later start
      ev("solo", "p1", 10, 20), // ordinary earlier event on the same row
      child("ch1", "c1", 100, 200, "P"),
    ]);
    expect(store.getRowEvents("p1").map((e) => e.id)).toEqual(["solo", "P"]);
  });

  test("getChildEventIds returns the children of a parent event", () => {
    const store = makeStore([
      parent("P", "p1", 0, 0),
      child("ch1", "c1", 100, 200, "P"),
      child("ch2", "c2", 50, 150, "P"),
    ]);
    expect([...store.getChildEventIds("P")].sort()).toEqual(["ch1", "ch2"]);
    expect(store.getChildEventIds("nope")).toEqual([]);
    // a child is not a parent: selection expansion over it adds nothing, so a
    // child clicked alone selects only itself (parent → children, one way)
    expect(store.getChildEventIds("ch1")).toEqual([]);
  });
});

describe("SceneStore grouping — visible rows & collapse", () => {
  test("getVisibleRowIds hides children of collapsed parents only", () => {
    const store = makeStore();
    expect(store.getVisibleRowIds()).toEqual(["r0", "p1", "c1", "c2"]);
    store.setCollapsed("p1", true);
    expect(store.getVisibleRowIds()).toEqual(["r0", "p1"]);
    store.setCollapsed("p1", false);
    expect(store.getVisibleRowIds()).toEqual(["r0", "p1", "c1", "c2"]);
  });

  test("isRowParent / isRowHidden reflect the hierarchy + collapse", () => {
    const store = makeStore();
    expect(store.isRowParent("p1")).toBe(true);
    expect(store.isRowParent("c1")).toBe(false);
    store.setCollapsed("p1", true);
    expect(store.isRowHidden("c1")).toBe(true);
    expect(store.isRowHidden("p1")).toBe(false);
    expect(store.isRowHidden("r0")).toBe(false);
  });

  test("getRowOffsets totals skip collapsed children", () => {
    const store = makeStore();
    const full = store.getRowOffsets(WS, WE).totalHeight;
    store.setCollapsed("p1", true);
    const collapsed = store.getRowOffsets(WS, WE).totalHeight;
    // two child rows removed from the stack -> strictly shorter, and they no
    // longer appear in the offset map
    expect(collapsed).toBeLessThan(full);
    expect(store.getRowOffsets(WS, WE).offsetOf.has("c1")).toBe(false);
    expect(store.getRowOffsets(WS, WE).offsetOf.has("p1")).toBe(true);
  });

  test("toggleCollapsed flips state and bumps the version", () => {
    const store = makeStore();
    const before = store.version;
    store.toggleCollapsed("p1");
    expect(store.isRowCollapsed("p1")).toBe(true);
    expect(store.version).toBeGreaterThan(before);
    store.toggleCollapsed("p1");
    expect(store.isRowCollapsed("p1")).toBe(false);
  });
});

describe("SceneStore — droppableRowIds validation", () => {
  const droppable = (
    id: string,
    rowId: string,
    droppableRowIds: string[],
    metadata?: unknown
  ): EventType => ({
    id,
    rowId,
    startTime: 0,
    endTime: 10,
    props: { droppableRowIds, metadata },
  });

  const errorOf = (store: SceneStore, id: string) => {
    const meta = store.getEvent(id)?.props?.metadata as
      | { droppableError?: { rowId: string; droppableRowIds: string[] } }
      | undefined;
    return meta?.droppableError;
  };

  test("no error when the current row is allowed", () => {
    const store = makeStore([droppable("e", "c1", ["c1", "c2"])]);
    expect(errorOf(store, "e")).toBeUndefined();
  });

  test("records a droppableError when the current row is not allowed", () => {
    const store = makeStore([droppable("e", "c1", ["c2"])]);
    expect(errorOf(store, "e")).toEqual({
      rowId: "c1",
      droppableRowIds: ["c2"],
    });
  });

  test("merges the error into existing object metadata without clobbering", () => {
    const store = makeStore([droppable("e", "c1", ["c2"], { foo: 1 })]);
    const meta = store.getEvent("e")?.props?.metadata as Record<string, unknown>;
    expect(meta.foo).toBe(1);
    expect(meta.droppableError).toEqual({ rowId: "c1", droppableRowIds: ["c2"] });
  });

  test("clears a stale error once the event moves to an allowed row", () => {
    const store = makeStore([droppable("e", "c1", ["c1", "c2"], { foo: 1 })]);
    // force an error, then resolve it via an update onto an allowed row
    store.applyPatches([
      { op: "update", id: "e", changes: { rowId: "p1" } }, // p1 not allowed
    ]);
    expect(errorOf(store, "e")).toEqual({ rowId: "p1", droppableRowIds: ["c1", "c2"] });
    store.applyPatches([{ op: "update", id: "e", changes: { rowId: "c2" } }]);
    expect(errorOf(store, "e")).toBeUndefined();
    // unrelated metadata survives the clear
    expect(
      (store.getEvent("e")?.props?.metadata as Record<string, unknown>).foo
    ).toBe(1);
  });

  test("empty list flags any row as an error", () => {
    const store = makeStore([droppable("e", "c1", [])]);
    expect(errorOf(store, "e")).toEqual({ rowId: "c1", droppableRowIds: [] });
  });
});

describe("SceneStore grouping — collapse persistence", () => {
  test("collapse survives setEvents, applyPatches, and a setRows with the row present", () => {
    const store = makeStore([parent("P", "p1", 0, 0)]);
    store.setCollapsed("p1", true);

    store.setEvents([parent("P", "p1", 0, 0)]); // events-prop reset
    expect(store.isRowCollapsed("p1")).toBe(true);

    store.applyPatches([
      { op: "upsert", event: child("ch1", "c1", 1, 2, "P") },
    ]);
    expect(store.isRowCollapsed("p1")).toBe(true);

    store.setRows(rows); // same rows again
    expect(store.isRowCollapsed("p1")).toBe(true);
  });

  test("collapse entry is pruned only when its row leaves `rows`", () => {
    const store = makeStore();
    store.setCollapsed("p1", true);
    // a rows update that no longer includes p1 drops the entry
    store.setRows([{ id: "r0", name: "Standalone" }]);
    expect(store.getCollapsedRowIds()).toEqual([]);
  });
});
