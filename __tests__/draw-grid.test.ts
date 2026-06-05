import { describe, expect, jest, test } from "@jest/globals";
import { drawGridLines, drawTimeBar } from "../src/canvas/draw-grid";

// Minimal CanvasRenderingContext2D spy — we assert draw-call sequences, not pixels.
const makeCtx = () => {
  const calls: { method: string; args: unknown[] }[] = [];
  const record =
    (method: string) =>
    (...args: unknown[]) =>
      calls.push({ method, args });
  const ctx = {
    calls,
    strokeStyle: "",
    fillStyle: "",
    lineWidth: 0,
    font: "",
    textBaseline: "",
    textAlign: "",
    beginPath: record("beginPath"),
    moveTo: record("moveTo"),
    lineTo: record("lineTo"),
    stroke: record("stroke"),
    fillText: record("fillText"),
    clearRect: record("clearRect"),
  };
  return ctx as unknown as CanvasRenderingContext2D & { calls: typeof calls };
};

describe("drawGridLines", () => {
  test("draws one vertical line per cell, excluding the edges", () => {
    const ctx = makeCtx();
    // 1000 / 100 = 10 cells -> 9 inner lines
    drawGridLines(ctx, { width: 1000, height: 4, cellWidth: 100 });
    const moves = ctx.calls.filter((c) => c.method === "moveTo");
    expect(moves).toHaveLength(9);
    expect(moves[0].args[0]).toBe(99.5); // crisp 1px line at x=100
    expect(moves[8].args[0]).toBe(899.5);
  });

  test("skips a line within 1px of the right edge (hide-last-line)", () => {
    const ctx = makeCtx();
    // lines at 100..900; the one at 999.5 (i=999.6...) — width 999.6/100:
    // last multiple is 900; 999.6-900 > 1 so nothing skipped here. Use an
    // exact-fit width instead: 900 -> lines at 100..800, NOT at 900 (edge).
    drawGridLines(ctx, { width: 900, height: 4, cellWidth: 100 });
    const moves = ctx.calls.filter((c) => c.method === "moveTo");
    expect(moves).toHaveLength(8);
  });

  test("no-ops on zero cellWidth", () => {
    const ctx = makeCtx();
    drawGridLines(ctx, { width: 1000, height: 4, cellWidth: 0 });
    expect(ctx.calls.filter((c) => c.method === "moveTo")).toHaveLength(0);
  });
});

describe("drawTimeBar", () => {
  const dayBlocks = [
    { label: "Mon 1 Jan", x: 0, width: 500 },
    { label: "Tue 2 Jan", x: 500, width: 500 },
  ];
  const hourBlocks = Array.from({ length: 10 }, (_, i) => ({
    label: `0${i}:00`.slice(-5),
    x: i * 100,
    width: 100,
  }));

  test("labels every block once", () => {
    const ctx = makeCtx();
    drawTimeBar(ctx, {
      width: 1000,
      height: 48,
      font: "16px sans-serif",
      dayBlocks,
      hourBlocks,
    });
    const texts = ctx.calls
      .filter((c) => c.method === "fillText")
      .map((c) => c.args[0]);
    expect(texts).toHaveLength(12); // 2 days + 10 hours
    expect(texts).toContain("Mon 1 Jan");
    expect(texts).toContain("00:00");
  });

  test("separators drawn between blocks but not after the last", () => {
    const ctx = makeCtx();
    drawTimeBar(ctx, {
      width: 1000,
      height: 48,
      font: "16px sans-serif",
      dayBlocks,
      hourBlocks,
    });
    // 1 day-row bottom border + (2-1) day separators + (10-1) hour separators
    const moves = ctx.calls.filter((c) => c.method === "moveTo");
    expect(moves).toHaveLength(1 + 1 + 9);
  });
});
