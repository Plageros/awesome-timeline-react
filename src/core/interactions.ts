import { EventType } from "../types";

/**
 * Pure commit math for canvas pointer interactions. Each function mirrors the
 * corresponding legacy DOM handler byte-for-byte so the canvas engine keeps
 * identical snap/guard semantics.
 */

/** Drop: same cell-snap as row-content.tsx handleOnDrop. */
export const computeDropTimes = ({
  pointerX,
  cellWidth,
  tick,
  windowStart,
  duration,
}: {
  pointerX: number; // px from the content's left edge
  cellWidth: number;
  tick: number;
  windowStart: number;
  duration: number; // event duration in seconds
}): { startTime: number; endTime: number } => {
  const closestCell = Math.round(pointerX / cellWidth);
  const newPosition = cellWidth * closestCell;
  const startTime = windowStart + newPosition * tick;
  return { startTime, endTime: startTime + duration };
};

/**
 * Resize: same rounding and duration-must-stay-positive guard as
 * event.tsx handleDocumentOnMouseUp. Returns null when the resize would
 * collapse or invert the event (legacy keeps the old value silently).
 */
export const computeResizeTimes = (
  event: Pick<EventType, "startTime" | "endTime">,
  deltaPx: number, // raw pointer delta (clientX - initial), sign preserved
  tick: number,
  direction: "left" | "right"
): { startTime: number; endTime: number } | null => {
  if (direction === "left") {
    const startTime = Math.round(event.startTime + deltaPx * tick);
    if (event.endTime - startTime > 0) {
      return { startTime, endTime: event.endTime };
    }
    return null;
  }
  const endTime = Math.round(event.endTime + deltaPx * tick);
  if (endTime - event.startTime > 0) {
    return { startTime: event.startTime, endTime };
  }
  return null;
};

/** Eligibility: same expression as the legacy Event component's render guard. */
export const canResizeEvent = (
  event: EventType,
  eventsResize: boolean
): boolean =>
  !event.props?.isLocked &&
  ((eventsResize &&
    (event.props?.isResizable === true ||
      event.props?.isResizable === undefined)) ||
    (!eventsResize && event.props?.isResizable === true));

/** Grid granularity step: same clamp as content.tsx handleOnWheel. */
export const stepCellWidth = (
  cellWidth: number,
  deltaY: number,
  tick: number
): number => {
  const pixelsToCalculate = 900 / tick;
  const next =
    deltaY > 0 ? cellWidth + pixelsToCalculate : cellWidth - pixelsToCalculate;
  if (next < pixelsToCalculate || next > pixelsToCalculate * 12) {
    return cellWidth;
  }
  return next;
};
