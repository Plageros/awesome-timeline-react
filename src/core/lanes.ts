import { EventType } from "../types";
import { intersectsWindow } from "./coords";

// Vertical layout constants (px). Will become Theme defaults in 0.2.0.
export const LANE_HEIGHT = 22;
export const LANE_TOP_OFFSET = 10;
export const ROW_BASE_HEIGHT = 40;
export const STATIC_EVENT_BASE_HEIGHT = 20;
export const EVENT_BAR_HEIGHT = 20; // .event height in the legacy CSS

export const laneTop = (lane: number) => LANE_TOP_OFFSET + LANE_HEIGHT * lane;

export const rowMinHeight = (highestLane: number) =>
  ROW_BASE_HEIGHT + highestLane * LANE_HEIGHT;

export const staticEventHeight = (highestLane: number) =>
  STATIC_EVENT_BASE_HEIGHT + highestLane * LANE_HEIGHT;

export type LaneResult = {
  // eventId -> lane index, only for events intersecting the window
  laneOf: Map<string, number>;
  highestLane: number;
};

/**
 * Assigns a vertical lane (stacking order) to each window-visible event of a
 * single row. Faithful extraction of the algorithm previously inlined in
 * use-produce-content.tsx — including its quirks:
 *
 * - Events outside [windowStart, windowEnd] are skipped and do not influence
 *   lane assignment at all.
 * - The occupancy scan for an event only covers lanes 0..eventOrder (the lane
 *   of the previously placed event), not every tracked lane.
 * - Touching events (prev.endTime === next.startTime) do not overlap.
 *
 * `rowEvents` must already be filtered to one row and sorted with
 * helpers/sort-events (startTime asc, endTime asc).
 */
export const assignLanes = (
  rowEvents: EventType[],
  windowStart: number,
  windowEnd: number
): LaneResult => {
  let eventOrder = 0;
  const prevEvent: EventType[] = [];
  let highestEventOrder = 0;
  const laneOf = new Map<string, number>();

  for (const event of rowEvents) {
    if (!intersectsWindow(event, windowStart, windowEnd)) continue;

    let tempEventOrder = 0;
    let assignEventOrder = true;
    for (let i = 0; i <= eventOrder; i++) {
      if (prevEvent[i] && prevEvent[i].endTime > event.startTime) {
        tempEventOrder += 1;
      } else {
        if (eventOrder > highestEventOrder) {
          highestEventOrder = eventOrder;
        }
        eventOrder = 0;
        assignEventOrder = false;
        break;
      }
    }

    if (assignEventOrder) {
      eventOrder = tempEventOrder;
    }

    prevEvent[tempEventOrder] = event;
    laneOf.set(event.id, tempEventOrder);
  }

  if (eventOrder > highestEventOrder) {
    highestEventOrder = eventOrder;
  }

  return { laneOf, highestLane: highestEventOrder };
};
