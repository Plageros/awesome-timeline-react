import { describe, expect, test } from "@jest/globals";
import {
  DEFAULT_GEOMETRY,
  Geometry,
  geometryFromTheme,
} from "../src/core/geometry";
import { laneTop, rowMinHeight, staticEventHeight } from "../src/core/lanes";
import { SceneStore } from "../src/core/scene";
import { resolveTheme } from "../src/canvas/theme";
import { EventType, RowType } from "../src/types";

// A chunky non-default geometry: 30px bars, 6px lane gap, 14px row padding.
const chunky: Geometry = geometryFromTheme(
  resolveTheme({ barHeight: 30, laneGap: 6, rowPaddingY: 14, barRadius: 8 })
);

describe("geometryFromTheme", () => {
  test("default theme reproduces the legacy constants exactly", () => {
    expect(geometryFromTheme(resolveTheme())).toEqual(DEFAULT_GEOMETRY);
  });

  test("derives lane/row metrics from the themeable tokens", () => {
    expect(chunky).toEqual({
      barHeight: 30,
      laneHeight: 36, // barHeight + laneGap
      laneTopOffset: 14, // rowPaddingY
      rowBaseHeight: 58, // barHeight + 2*rowPaddingY
      staticEventBaseHeight: 30, // == barHeight
      barRadius: 8,
    });
  });
});

describe("vertical layout helpers with a non-default geometry", () => {
  test("laneTop = laneTopOffset + laneHeight * lane", () => {
    expect(laneTop(0, chunky)).toBe(14);
    expect(laneTop(1, chunky)).toBe(50);
    expect(laneTop(2, chunky)).toBe(86);
  });

  test("rowMinHeight = rowBaseHeight + laneHeight * highestLane", () => {
    expect(rowMinHeight(0, chunky)).toBe(58);
    expect(rowMinHeight(2, chunky)).toBe(130);
  });

  test("staticEventHeight = staticEventBaseHeight + laneHeight * highestLane", () => {
    expect(staticEventHeight(0, chunky)).toBe(30);
    expect(staticEventHeight(1, chunky)).toBe(66);
  });

  test("omitting geometry falls back to the default (back-compat)", () => {
    expect(laneTop(1)).toBe(32);
    expect(rowMinHeight(2)).toBe(84);
    expect(staticEventHeight(1)).toBe(42);
  });
});

describe("SceneStore.getRowHeight / getRowOffsets honor geometry", () => {
  const rows: RowType[] = [{ id: "r1", name: "" }, { id: "r2", name: "" }];
  // Two overlapping events in r1 force a second lane (highestLane = 1).
  const events: EventType[] = [
    { id: "a", rowId: "r1", startTime: 0, endTime: 100 },
    { id: "b", rowId: "r1", startTime: 50, endTime: 150 },
  ];

  test("row height tracks the active geometry", () => {
    const scene = new SceneStore();
    scene.setRows(rows);
    scene.setEvents(events);

    // default geometry: rowBase 40 + laneHeight 22 * highestLane 1 = 62
    expect(scene.getRowHeight("r1", 0, 1000)).toBe(62);

    scene.setGeometry(chunky);
    // chunky: rowBase 58 + laneHeight 36 * 1 = 94
    expect(scene.getRowHeight("r1", 0, 1000)).toBe(94);
  });

  test("getRowOffsets totals reflect geometry (barHeight 30)", () => {
    const scene = new SceneStore();
    scene.setRows(rows);
    scene.setEvents(events);
    scene.setGeometry(chunky);

    const { offsetOf, totalHeight } = scene.getRowOffsets(0, 1000);
    expect(offsetOf.get("r1")).toBe(0);
    expect(offsetOf.get("r2")).toBe(94); // r1 stacked: 94
    expect(totalHeight).toBe(94 + 58); // r2 empty: rowBase 58
  });
});
