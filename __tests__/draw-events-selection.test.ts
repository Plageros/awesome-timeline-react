import { describe, expect, test } from "@jest/globals";
import { drawEvents } from "../src/canvas/draw-events";
import { SceneStore } from "../src/core/scene";
import { LayoutAnimator } from "../src/canvas/animator";
import { DEFAULT_THEME } from "../src/canvas/theme";
import type { RendererView } from "../src/canvas/renderer";
import { EventType, RowType } from "../src/types";

// Spy ctx: faithful save/restore of the fields drawEvents touches, so the
// per-event globalAlpha dim doesn't compound across events. We bypass the
// default bar drawing via a recording `drawEvent`, so only alpha + draw order
// matter here, not pixels.
const makeCtx = () => {
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
      stack.push({
        globalAlpha: this.globalAlpha,
        shadowColor: this.shadowColor,
        shadowBlur: this.shadowBlur,
        shadowOffsetY: this.shadowOffsetY,
      });
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
    stroke() {},
    clip() {},
    fillText() {},
    moveTo() {},
    lineTo() {},
  };
  return ctx as unknown as CanvasRenderingContext2D;
};

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

type Recorded = { id: string; alpha: number; selected: boolean };

const run = (selectedEventIds: Set<string>) => {
  const scene = new SceneStore();
  scene.setRows(rows);
  scene.setEvents([
    ev("a", "r1", 0, 50),
    ev("b", "r1", 100, 150),
    ev("c", "r2", 0, 50),
  ]);

  const recorded: Recorded[] = [];
  const view: RendererView = {
    windowTime: [0, 1000],
    tick: 1,
    cellWidth: 100,
    scrollTop: 0,
    width: 2000,
    height: 2000,
    theme: DEFAULT_THEME,
    drawEvent: (ctx, event, _rect, state) => {
      recorded.push({
        id: event.id,
        alpha: ctx.globalAlpha,
        selected: state.selected,
      });
      // returning void (!== false) counts as "drawn" -> skips default bar draw
    },
    eventsResize: true,
    stripeOverlap: false,
    hoveredEventId: null,
    draggedEventId: null,
    resizePreview: null,
    selectedEventIds,
  };

  const ctx = makeCtx();
  drawEvents(ctx, view, scene, "16px sans-serif", new LayoutAnimator());
  return recorded;
};

describe("drawEvents selection visuals", () => {
  test("no selection: every event drawn in row order at full alpha", () => {
    const recorded = run(new Set());
    expect(recorded.map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(recorded.every((r) => r.alpha === 1)).toBe(true);
    expect(recorded.every((r) => !r.selected)).toBe(true);
  });

  test("selected event is drawn last (on top), non-selected are dimmed", () => {
    const recorded = run(new Set(["b"]));
    // a, c draw in the row loop; b is deferred to a final on-top pass
    expect(recorded.map((r) => r.id)).toEqual(["a", "c", "b"]);

    const byId = Object.fromEntries(recorded.map((r) => [r.id, r]));
    expect(byId.a.alpha).toBeCloseTo(DEFAULT_THEME.dimmedOpacity);
    expect(byId.c.alpha).toBeCloseTo(DEFAULT_THEME.dimmedOpacity);
    expect(byId.b.alpha).toBe(1); // selected = full opacity + elevated
    expect(byId.b.selected).toBe(true);
    expect(byId.a.selected).toBe(false);
  });
});
