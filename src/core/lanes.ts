import { EventType } from "../types";
import { intersectsWindow } from "./coords";
import { Geometry, DEFAULT_GEOMETRY } from "./geometry";

// Vertical layout is a function of the (themeable) Geometry. The geometry
// argument defaults to DEFAULT_GEOMETRY so callers using the legacy constants
// — and the golden tests — keep their exact pre-0.2.x numbers.

export const laneTop = (lane: number, g: Geometry = DEFAULT_GEOMETRY) =>
  g.laneTopOffset + g.laneHeight * lane;

export const rowMinHeight = (highestLane: number, g: Geometry = DEFAULT_GEOMETRY) =>
  g.rowBaseHeight + highestLane * g.laneHeight;

export const staticEventHeight = (
  highestLane: number,
  g: Geometry = DEFAULT_GEOMETRY
) => g.staticEventBaseHeight + highestLane * g.laneHeight;

export type LaneResult = {
  // eventId -> lane index, only for events intersecting the window
  laneOf: Map<string, number>;
  highestLane: number;
};

/**
 * Assigns a vertical lane (stacking order) to each window-visible event of a
 * single row: interval partitioning, so a row opens exactly as many lanes as
 * its peak concurrency and NO event is ever laid over another.
 *
 * Each event takes the lowest lane whose last event has already ended; if every
 * lane is still busy it opens a new one. Semantics:
 *
 * - Events outside [windowStart, windowEnd] are skipped and do not influence
 *   lane assignment at all.
 * - Touching events (prev.endTime === next.startTime) do not overlap, so they
 *   share a lane.
 * - Lowest-free-lane means the assignment is deterministic, and a row with N
 *   concurrent events ends up exactly N lanes tall.
 *
 * Replaces the algorithm inlined in the original use-produce-content.tsx, whose
 * occupancy scan was bounded by the previously-placed event's lane and reset
 * whenever a lane freed: after a lane freed mid-row, later events were placed
 * in lanes that had never been checked, and were drawn on top of the events
 * still running there (visible on capacity rows with 3+ concurrent events).
 *
 * `rowEvents` must already be filtered to one row and sorted with
 * helpers/sort-events (startTime asc, endTime asc).
 */
export const assignLanes = (
  rowEvents: EventType[],
  windowStart: number,
  windowEnd: number
): LaneResult => {
  // laneEnd[i] = end of the last event placed in lane i. Lane count is bounded by
  // peak concurrency (small in practice), so the linear scan per event is cheap.
  const laneEnd: number[] = [];
  const laneOf = new Map<string, number>();

  for (const event of rowEvents) {
    if (!intersectsWindow(event, windowStart, windowEnd)) continue;

    let lane = laneEnd.findIndex((end) => end <= event.startTime);
    if (lane === -1) {
      lane = laneEnd.length;
      laneEnd.push(event.endTime);
    } else if (event.endTime > laneEnd[lane]) {
      laneEnd[lane] = event.endTime;
    }

    laneOf.set(event.id, lane);
  }

  return { laneOf, highestLane: Math.max(0, laneEnd.length - 1) };
};
