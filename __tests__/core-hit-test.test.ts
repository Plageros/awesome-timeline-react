import { describe, expect, test } from "@jest/globals";
import { SceneStore } from "../src/core/scene";
import { hitTest } from "../src/core/hit-test";
import { EventType } from "../src/types";

// tick=1 -> 1 second per pixel, so times map 1:1 to x coordinates.
const view = { windowStart: 0, windowEnd: 1000, tick: 1, scrollTop: 0 };

const ev = (
  id: string,
  rowId: string,
  startTime: number,
  endTime: number
): EventType => ({ id, rowId, startTime, endTime });

const makeScene = () => {
  const scene = new SceneStore();
  scene.setRows([
    { id: "r1", name: "Row 1" },
    { id: "r2", name: "Row 2" },
  ]);
  // r1: single event in lane 0 -> row height 40
  // r2: event + static event
  scene.setEvents([ev("a", "r1", 100, 200), ev("b", "r2", 300, 400)]);
  scene.setStaticEvents([ev("s", "r2", 500, 600)]);
  return scene;
};

describe("hitTest", () => {
  test("hits an event: lane 0 spans y 10..30 within its row", () => {
    const scene = makeScene();
    // row r1 starts at y=0; event "a" at x 100..200, y 10..30
    const hit = hitTest(scene, view, 150, 20);
    expect(hit?.kind).toBe("event");
    expect(hit?.event.id).toBe("a");
    expect(hit?.rect).toEqual({ x: 100, y: 10, width: 100, height: 20 });
  });

  test("misses above and below the event bar within the row", () => {
    const scene = makeScene();
    expect(hitTest(scene, view, 150, 5)).toBeNull(); // above lane 0
    expect(hitTest(scene, view, 150, 35)).toBeNull(); // below the bar
    expect(hitTest(scene, view, 50, 20)).toBeNull(); // left of the event
  });

  test("hits in the second row, offset by the first row's height", () => {
    const scene = makeScene();
    // r1 height 40 -> r2 starts at 40; event "b" y 50..70
    const hit = hitTest(scene, view, 350, 60);
    expect(hit?.event.id).toBe("b");
    expect(hit?.rowId).toBe("r2");
  });

  test("hits static events below interactive ones", () => {
    const scene = makeScene();
    const hit = hitTest(scene, view, 550, 60);
    expect(hit?.kind).toBe("static");
    expect(hit?.event.id).toBe("s");
  });

  test("applies scrollTop: same content point, scrolled viewport", () => {
    const scene = makeScene();
    const scrolled = { ...view, scrollTop: 40 };
    // content y=60 (row r2's event) is at viewport y=20 when scrolled by 40
    const hit = hitTest(scene, scrolled, 350, 20);
    expect(hit?.event.id).toBe("b");
    // returned rect is in viewport coordinates
    expect(hit?.rect.y).toBe(10);
  });

  test("events outside the time window are not hit", () => {
    const scene = makeScene();
    const narrow = { ...view, windowStart: 0, windowEnd: 50 };
    expect(hitTest(scene, narrow, 150, 20)).toBeNull();
  });

  test("returns null below all rows", () => {
    const scene = makeScene();
    expect(hitTest(scene, view, 150, 500)).toBeNull();
  });
});
