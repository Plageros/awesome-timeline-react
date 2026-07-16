import { describe, expect, test } from "@jest/globals";
import { drawEvents } from "../src/canvas/draw-events";
import { SceneStore } from "../src/core/scene";
import { LayoutAnimator } from "../src/canvas/animator";
import { DEFAULT_THEME } from "../src/canvas/theme";
import type { RendererView } from "../src/canvas/renderer";
import { EventType, RowType } from "../src/types";

type Counts = { clip: number; stroke: number; fillRect: number };

// Minimal spy ctx that counts the calls the stripe pass makes. A recording
// `drawEvent` (below) returns void so the default bar draw is skipped — every
// clip/stroke/fillRect recorded here therefore comes only from striping.
const makeCtx = (counts: Counts) => {
  const stack: Array<Record<string, unknown>> = [];
  const ctx = {
    font: "",
    textBaseline: "",
    textAlign: "",
    globalAlpha: 1,
    fillStyle: "",
    strokeStyle: "",
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetY: 0,
    save() {
      stack.push({ globalAlpha: this.globalAlpha });
    },
    restore() {
      const s = stack.pop();
      if (s) Object.assign(this, s);
    },
    translate() {},
    beginPath() {},
    roundRect() {},
    rect() {},
    fill() {},
    fillRect() {
      counts.fillRect++;
    },
    stroke() {
      counts.stroke++;
    },
    clip() {
      counts.clip++;
    },
    fillText() {},
    moveTo() {},
    lineTo() {},
  };
  return ctx as unknown as CanvasRenderingContext2D;
};

const rows: RowType[] = [{ id: "r1", name: "Row 1" }];

// one event 0..100 that straddles a static band 40..60 on the same row
const run = (stripeOverlap: boolean): Counts => {
  const scene = new SceneStore();
  scene.setRows(rows);
  scene.setEvents([{ id: "e", rowId: "r1", startTime: 0, endTime: 100 }]);
  scene.setStaticEvents([{ id: "band", rowId: "r1", startTime: 40, endTime: 60 }]);

  const counts: Counts = { clip: 0, stroke: 0, fillRect: 0 };
  const view: RendererView = {
    windowTime: [0, 1000],
    tick: 1,
    cellWidth: 100,
    scrollTop: 0,
    width: 2000,
    height: 2000,
    theme: DEFAULT_THEME,
    // recording renderer: returning void skips the default bar draw
    drawEvent: () => {},
    eventsResize: false,
    stripeOverlap,
    hoveredEventId: null,
    draggedEventId: null,
    resizePreview: null,
    selectedEventIds: new Set<string>(),
  };
  drawEvents(makeCtx(counts), view, scene, "16px sans-serif", new LayoutAnimator());
  return counts;
};

describe("drawEvents — overlap striping", () => {
  test("stripeOverlap off draws no stripes", () => {
    const c = run(false);
    expect(c.clip).toBe(0);
    expect(c.stroke).toBe(0);
    expect(c.fillRect).toBe(0);
  });

  test("stripeOverlap on hatches the event↔band overlap", () => {
    const c = run(true);
    expect(c.clip).toBe(1); // one overlapping band → one clipped slice
    expect(c.fillRect).toBe(1); // the faint wash
    expect(c.stroke).toBeGreaterThan(0); // 45° stripe lines
  });
});
