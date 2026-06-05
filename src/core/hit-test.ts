import { EventType } from "../types";
import { SceneStore } from "./scene";
import { Rect, rectContains } from "./types";
import { cullToWindow } from "./culling";
import { timeToWidth, timeToX } from "./coords";
import {
  EVENT_BAR_HEIGHT,
  LANE_TOP_OFFSET,
  laneTop,
  staticEventHeight,
} from "./lanes";

export type HitTarget = {
  kind: "event" | "static";
  event: EventType;
  rowId: string;
  /** rect in viewport (canvas CSS px) coordinates, scroll already applied */
  rect: Rect;
};

export type HitTestView = {
  windowStart: number;
  windowEnd: number;
  tick: number;
  scrollTop: number;
};

/**
 * Point query against the scene at viewport coordinates (x, y).
 * Finds the row by accumulated heights, then scans that row's window-visible
 * events back-to-front (interactive events sit above static ones, later
 * events draw above earlier ones). Per-row event counts are small, so the
 * scan after the row/window cut is cheap — no spatial index needed.
 */
export const hitTest = (
  scene: SceneStore,
  view: HitTestView,
  x: number,
  y: number
): HitTarget | null => {
  const { windowStart, windowEnd, tick, scrollTop } = view;
  const yContent = y + scrollTop;

  let rowTop = 0;
  let rowId: string | null = null;
  for (const id of scene.getRowIds()) {
    const height = scene.getRowHeight(id, windowStart, windowEnd);
    if (yContent >= rowTop && yContent < rowTop + height) {
      rowId = id;
      break;
    }
    rowTop += height;
  }
  if (rowId === null) return null;

  const lanes = scene.getLanes(rowId, windowStart, windowEnd);
  const rowY = rowTop - scrollTop;

  const events = cullToWindow(
    scene.getRowEvents(rowId),
    windowStart,
    windowEnd
  );
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    const rect: Rect = {
      x: timeToX(event.startTime, windowStart, tick),
      y: rowY + laneTop(lanes.laneOf.get(event.id) as number),
      width: timeToWidth(event.startTime, event.endTime, tick),
      height: EVENT_BAR_HEIGHT,
    };
    if (rectContains(rect, x, y)) {
      return { kind: "event", event, rowId, rect };
    }
  }

  const statics = cullToWindow(
    scene.getRowStaticEvents(rowId),
    windowStart,
    windowEnd
  );
  for (let i = statics.length - 1; i >= 0; i--) {
    const event = statics[i];
    const rect: Rect = {
      x: timeToX(event.startTime, windowStart, tick),
      y: rowY + LANE_TOP_OFFSET,
      width: timeToWidth(event.startTime, event.endTime, tick),
      height: staticEventHeight(lanes.highestLane),
    };
    if (rectContains(rect, x, y)) {
      return { kind: "static", event, rowId, rect };
    }
  }

  return null;
};
