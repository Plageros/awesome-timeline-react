import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import { FrameScheduler, LayerDirty } from "../src/canvas/frame-scheduler";

// Deterministic rAF: collect callbacks, run them manually.
let rafCallbacks: FrameRequestCallback[];

beforeEach(() => {
  rafCallbacks = [];
  (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  };
  (globalThis as any).cancelAnimationFrame = (id: number) => {
    rafCallbacks[id - 1] = () => {};
  };
});

afterEach(() => {
  delete (globalThis as any).requestAnimationFrame;
  delete (globalThis as any).cancelAnimationFrame;
});

const runFrame = () => {
  const callbacks = rafCallbacks;
  rafCallbacks = [];
  callbacks.forEach((cb) => cb(performance.now()));
};

describe("FrameScheduler", () => {
  test("coalesces multiple invalidations into one frame", () => {
    const frames: LayerDirty[] = [];
    const scheduler = new FrameScheduler((dirty) => frames.push({ ...dirty }));

    scheduler.invalidate("dynamic");
    scheduler.invalidate("dynamic");
    scheduler.invalidate("static");
    expect(frames).toHaveLength(0); // nothing until the frame fires

    runFrame();
    expect(frames).toEqual([{ static: true, dynamic: true }]);

    runFrame();
    expect(frames).toHaveLength(1); // no rescheduling without invalidation
  });

  test("'all' marks both layers", () => {
    const frames: LayerDirty[] = [];
    const scheduler = new FrameScheduler((dirty) => frames.push({ ...dirty }));
    scheduler.invalidate("all");
    runFrame();
    expect(frames).toEqual([{ static: true, dynamic: true }]);
  });

  test("flush runs a pending frame synchronously", () => {
    const frames: LayerDirty[] = [];
    const scheduler = new FrameScheduler((dirty) => frames.push({ ...dirty }));
    scheduler.invalidate("static");
    scheduler.flush();
    expect(frames).toEqual([{ static: true, dynamic: false }]);
    // the cancelled rAF must not double-fire
    runFrame();
    expect(frames).toHaveLength(1);
  });

  test("flush without pending work does nothing", () => {
    const onFrame = jest.fn();
    const scheduler = new FrameScheduler(onFrame);
    scheduler.flush();
    expect(onFrame).not.toHaveBeenCalled();
  });

  test("dispose cancels pending work", () => {
    const onFrame = jest.fn();
    const scheduler = new FrameScheduler(onFrame);
    scheduler.invalidate("all");
    scheduler.dispose();
    runFrame();
    expect(onFrame).not.toHaveBeenCalled();
  });
});
