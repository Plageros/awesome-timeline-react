import { describe, expect, test } from "@jest/globals";
import { SceneStore } from "../src/core/scene";
import { eventRect, linkMarkers, linkRoute, markerAt, MARKER_HEIGHT } from "../src/core/links";
import { EventType } from "../src/types";

const ev = (id: string, rowId: string, startTime: number, endTime: number, label?: string): EventType =>
  ({ id, rowId, startTime, endTime, props: label ? { label } : undefined });

// tick=1 -> 1 second per pixel; every row is 40px tall with its bar at y 10..30
const at = { windowStart: 0, tick: 1, scrollTop: 0 };

const makeScene = () => {
  const scene = new SceneStore();
  scene.setRows(Array.from({ length: 10 }, (_, i) => ({ id: `r${i}`, name: `Row ${i}` })));
  scene.setEvents([
    ev("a", "r0", 100, 200, "Alpha"),
    ev("b", "r1", 300, 400, "Beta"),
    ev("c", "r9", 500, 600, "Gamma"),
  ]);
  return scene;
};

describe("eventRect", () => {
  test("places a bar by its row offset, lane and the scroll", () => {
    const scene = makeScene();
    const { offsetOf } = scene.getRowOffsets();
    expect(eventRect(scene, offsetOf, "b", at)).toEqual({ x: 300, y: 50, width: 100, height: 20 });
    expect(eventRect(scene, offsetOf, "b", { ...at, scrollTop: 30 })?.y).toBe(20);
  });

  test("an unknown event or one on a hidden row has no rect", () => {
    const scene = makeScene();
    expect(eventRect(scene, scene.getRowOffsets().offsetOf, "nope", at)).toBeNull();
    expect(eventRect(scene, new Map(), "a", at)).toBeNull();
  });
});

describe("linkRoute", () => {
  const from = { x: 100, y: 10, width: 100, height: 20 };

  test("out of the source's end, to the target's row, into its start", () => {
    expect(linkRoute(from, { x: 300, y: 50, width: 50, height: 20 })).toEqual(
      [[200, 20], [208, 20], [208, 60], [300, 60]]);
  });

  test("a target that starts before the source ends is reached around the corner", () => {
    expect(linkRoute(from, { x: 150, y: 50, width: 50, height: 20 })).toEqual(
      [[200, 20], [208, 20], [208, 40], [142, 40], [142, 60], [150, 60]]);
  });

  test("on the same row the detour runs below the bars", () => {
    const back = linkRoute(from, { x: 120, y: 10, width: 50, height: 20 });
    expect(back[2][1]).toBe(34);
  });
});

describe("linkMarkers", () => {
  const view = { width: 800, height: 200 };
  const measure = (text: string) => text.length * 6;

  test("an end scrolled below the view gets a marker at the bottom edge, at its x", () => {
    const scene = makeScene();
    const { offsetOf } = scene.getRowOffsets();
    const rectOf = (id: string) => eventRect(scene, offsetOf, id, at);
    const markers = linkMarkers(scene, [{ id: "l", fromEventId: "a", toEventId: "c" }], rectOf, view, measure);
    expect(markers).toHaveLength(1);
    expect(markers[0]).toMatchObject({ eventId: "c", up: false, label: "▼ Gamma" });
    expect(markers[0].rect).toEqual({ x: 500, y: 200 - MARKER_HEIGHT - 4, width: 7 * 6 + 16, height: MARKER_HEIGHT });
    expect(markerAt(markers, 510, 185)?.eventId).toBe("c");
    expect(markerAt(markers, 510, 100)).toBeNull();
  });

  test("an end scrolled above gets one at the top; both ends in view get none", () => {
    const scene = makeScene();
    const { offsetOf } = scene.getRowOffsets();
    const scrolled = (id: string) => eventRect(scene, offsetOf, id, { ...at, scrollTop: 300 });
    const up = linkMarkers(scene, [{ id: "l", fromEventId: "a", toEventId: "c" }], scrolled, view, measure);
    expect(up.map((m) => [m.eventId, m.up, m.rect.y])).toEqual([["a", true, 4]]);
    const both = (id: string) => eventRect(scene, offsetOf, id, at);
    expect(linkMarkers(scene, [{ id: "l", fromEventId: "a", toEventId: "b" }], both, view, measure)).toEqual([]);
  });

  test("markers on one edge never overlap and stay inside the view", () => {
    const scene = new SceneStore();
    scene.setRows(Array.from({ length: 10 }, (_, i) => ({ id: `r${i}`, name: `${i}` })));
    scene.setEvents([ev("a", "r0", 100, 200), ev("x", "r9", 760, 790, "Far right"),
                     ev("y", "r8", 770, 790, "Also right")]);
    const { offsetOf } = scene.getRowOffsets();
    const rectOf = (id: string) => eventRect(scene, offsetOf, id, at);
    const markers = linkMarkers(scene, [{ id: "1", fromEventId: "a", toEventId: "x" },
                                        { id: "2", fromEventId: "a", toEventId: "y" }], rectOf, view, measure);
    expect(markers).toHaveLength(2);
    const [p, q] = markers.sort((m, n) => m.rect.x - n.rect.x);
    expect(p.rect.x + p.rect.width).toBeLessThanOrEqual(q.rect.x);
    for (const m of markers) expect(m.rect.x + m.rect.width).toBeLessThanOrEqual(view.width);
  });
});
