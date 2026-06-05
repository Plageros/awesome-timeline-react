import { EventType } from "../types";

/**
 * Returns the window-visible slice of a startTime-sorted event array.
 * Binary search cuts the tail (startTime > windowEnd) in O(log n); the head
 * is filtered linearly on endTime, which cannot be binary-searched on a
 * startTime ordering.
 */
export const cullToWindow = (
  events: EventType[],
  windowStart: number,
  windowEnd: number
): EventType[] => {
  // first index with startTime > windowEnd
  let lo = 0;
  let hi = events.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (events[mid].startTime <= windowEnd) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  const visible: EventType[] = [];
  for (let i = 0; i < lo; i++) {
    if (events[i].endTime >= windowStart) visible.push(events[i]);
  }
  return visible;
};
