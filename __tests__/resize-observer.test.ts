import { afterEach, beforeEach, describe, expect, test } from "@jest/globals";
import { createWidthObserver } from "../src/hooks/use-resize-observer";

let deliver: (width: number) => void;

beforeEach(() => {
  (globalThis as any).ResizeObserver = class {
    constructor(cb: (entries: unknown[]) => void) {
      deliver = (width) =>
        cb([{ borderBoxSize: [{ inlineSize: width }], contentRect: { width } }]);
    }
    observe() {}
    disconnect() {}
  };
});

afterEach(() => {
  delete (globalThis as any).ResizeObserver;
});

const HOUR = 3600;

describe("createWidthObserver", () => {
  test("a first callback after setWindow scales to the new window, not the mounted one", () => {
    const window = { current: [0, 21 * 24 * HOUR] };
    const scales: [number, number][] = [];
    createWidthObserver(() => window.current, (tick, cell) => scales.push([tick, cell]));

    window.current = [0, 7 * 24 * HOUR];
    deliver(1400);

    expect(scales).toEqual([[(7 * 24 * HOUR) / 1400, 1400 / (7 * 24)]]);
  });

  test("an unchanged width does not rescale", () => {
    const scales: [number, number][] = [];
    createWidthObserver(() => [0, 10 * HOUR], (tick, cell) => scales.push([tick, cell]));

    deliver(1000);
    deliver(1000);
    deliver(500);

    expect(scales).toEqual([[36, 100], [72, 50]]);
  });
});
