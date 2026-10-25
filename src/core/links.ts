import { LinkType } from "../types";
import { SceneStore } from "./scene";
import { Rect, rectContains } from "./types";
import { timeToWidth, timeToX } from "./coords";
import { laneTop } from "./lanes";

export type LinkView = { windowStart: number; tick: number; scrollTop: number; width: number; height: number };

/** A marker at the top or bottom edge naming a linked event that is scrolled out of view. */
export type LinkMarker = { eventId: string; up: boolean; label: string; rect: Rect };

export const MARKER_HEIGHT = 20;
const MARKER_PAD = 8;
const MARKER_INSET = 4;
const MARKER_GAP = 4;
const LABEL_MAX = 28;

/** An event's bar in viewport px, scroll applied; null when the event is unknown or its row is hidden. */
export const eventRect = (scene: SceneStore, offsetOf: Map<string, number>, eventId: string,
                          view: Pick<LinkView, "windowStart" | "tick" | "scrollTop">): Rect | null => {
  const event = scene.getEvent(eventId);
  if (!event) return null;
  const top = offsetOf.get(event.rowId);
  if (top === undefined) return null;
  const g = scene.getGeometry();
  const lane = scene.getLanes(event.rowId).laneOf.get(eventId) ?? 0;
  return {
    x: timeToX(event.startTime, view.windowStart, view.tick),
    y: top - view.scrollTop + scene.getLaneInset(event.rowId) + laneTop(lane, g),
    width: timeToWidth(event.startTime, event.endTime, view.tick),
    height: g.barHeight,
  };
};

/**
 * The line from the end of `from` to the start of `to`, as the corners of an orthogonal path: out of
 * the source's end, up or down to the target's row, into the target's start. A target that starts
 * before the source ends (an overlap) is reached around the corner, through the gap between them.
 */
export const linkRoute = (from: Rect, to: Rect, stub = 8): [number, number][] => {
  const ax = from.x + from.width, ay = from.y + from.height / 2;
  const bx = to.x, by = to.y + to.height / 2;
  if (bx - ax >= 2 * stub) return [[ax, ay], [ax + stub, ay], [ax + stub, by], [bx, by]];
  const midY = Math.abs(ay - by) < 1 ? from.y + from.height + stub / 2 : (ay + by) / 2;
  return [[ax, ay], [ax + stub, ay], [ax + stub, midY], [bx - stub, midY], [bx - stub, by], [bx, by]];
};

const truncate = (text: string) => (text.length > LABEL_MAX ? `${text.slice(0, LABEL_MAX - 1)}…` : text);

/**
 * Edge markers for the linked events that are scrolled above or below the view while the event they
 * link to is in it, one per event, laid left to right along each edge without overlapping.
 */
export const linkMarkers = (scene: SceneStore, links: LinkType[], rectOf: (id: string) => Rect | null,
                            view: Pick<LinkView, "width" | "height">,
                            measure: (text: string) => number): LinkMarker[] => {
  const shown = (r: Rect) => r.y + r.height > 0 && r.y < view.height;
  const wanted = new Map<string, { up: boolean; x: number }>();
  for (const link of links) {
    const a = rectOf(link.fromEventId), b = rectOf(link.toEventId);
    if (!a || !b) continue;
    for (const [hidden, id, other] of [[b, link.toEventId, a], [a, link.fromEventId, b]] as const) {
      if (shown(hidden) || !shown(other) || wanted.has(id)) continue;
      wanted.set(id, { up: hidden.y + hidden.height <= 0, x: hidden.x });
    }
  }
  const out: LinkMarker[] = [];
  for (const up of [true, false]) {
    const y = up ? MARKER_INSET : view.height - MARKER_HEIGHT - MARKER_INSET;
    const edge: LinkMarker[] = [...wanted].filter(([, w]) => w.up === up).sort((p, q) => p[1].x - q[1].x)
      .map(([eventId, w]) => {
        const label = truncate(`${up ? "▲" : "▼"} ${scene.getEvent(eventId)?.props?.label ?? eventId}`);
        return { eventId, up, label, rect: { x: w.x, y, width: measure(label) + 2 * MARKER_PAD, height: MARKER_HEIGHT } };
      });
    let right = MARKER_INSET - MARKER_GAP;
    for (const m of edge) {
      m.rect.x = Math.max(m.rect.x, right + MARKER_GAP);
      right = m.rect.x + m.rect.width;
    }
    let left = view.width - MARKER_INSET + MARKER_GAP;
    for (const m of [...edge].reverse()) {
      m.rect.x = Math.max(MARKER_INSET, Math.min(m.rect.x, left - MARKER_GAP - m.rect.width));
      left = m.rect.x;
    }
    out.push(...edge);
  }
  return out;
};

export const markerAt = (markers: LinkMarker[], x: number, y: number): LinkMarker | null =>
  markers.find((m) => rectContains(m.rect, x, y)) ?? null;
