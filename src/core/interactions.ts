import { EventType } from "../types";

/**
 * Pure commit math for canvas pointer interactions. Each function mirrors the
 * corresponding legacy DOM handler byte-for-byte so the canvas engine keeps
 * identical snap/guard semantics.
 */

/**
 * Drop: snap the dropped start to the nearest grid cell boundary. Cells are
 * anchored to absolute time (multiples of the cell duration), matching the
 * vertical grid lines (`drawGridLines`) — so a dropped event lands on a line
 * regardless of how the window has been panned.
 */
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
  const cellTime = cellWidth * tick; // seconds per grid cell
  const pointerTime = windowStart + pointerX * tick;
  const startTime = Math.round(pointerTime / cellTime) * cellTime;
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

export type ZoomLimits = { minWindowSeconds: number; maxWindowSeconds: number };

/**
 * Time-frame zoom: returns a new visible window (+ derived tick and cellWidth)
 * for scaling the visible duration by `factor` (newDuration = oldDuration *
 * factor; <1 zooms in, >1 zooms out), anchored so the timestamp under
 * `anchorX` (px from the content's left edge) stays under that pixel.
 *
 * `tick` is recomputed from the new (integer-rounded) window; `cellWidth` is
 * then derived from the *actual* new tick so time-per-cell (`cellWidth * tick`)
 * — i.e. the grid cell duration the grid lines snap to — is preserved exactly.
 * Rescaling cellWidth by the unrounded factor instead would let rounding drift
 * the cell duration off the hour over many zooms, so the grid lines would creep
 * out of step with the time-bar blocks. The new duration is clamped to the
 * limits; the anchor still holds after clamping.
 */
export const computeZoom = (
  windowTime: [number, number],
  tick: number,
  cellWidth: number,
  anchorX: number,
  factor: number,
  contentWidth: number,
  { minWindowSeconds, maxWindowSeconds }: ZoomLimits
): { windowTime: [number, number]; tick: number; cellWidth: number } => {
  const [start, end] = windowTime;
  const oldDuration = end - start;
  const newDuration = Math.min(
    Math.max(oldDuration * factor, minWindowSeconds),
    maxWindowSeconds
  );
  const cellTime = cellWidth * tick; // seconds per grid cell — kept invariant
  const tAnchor = start + anchorX * tick;
  const newStart = Math.round(tAnchor - (anchorX / contentWidth) * newDuration);
  const newEnd = newStart + Math.round(newDuration);
  const newTick = (newEnd - newStart) / contentWidth;
  return {
    windowTime: [newStart, newEnd],
    tick: newTick,
    cellWidth: cellTime / newTick,
  };
};
