import { EventType } from "../types";

// All times are unix timestamps in seconds.
// tick = seconds per pixel; all x/width values are CSS pixels.

export const timeToX = (time: number, windowStart: number, tick: number) =>
  (time - windowStart) / tick;

export const timeToWidth = (startTime: number, endTime: number, tick: number) =>
  (endTime - startTime) / tick;

export const xToTime = (x: number, windowStart: number, tick: number) =>
  windowStart + x * tick;

export const intersectsWindow = (
  event: EventType,
  windowStart: number,
  windowEnd: number
) => event.endTime >= windowStart && event.startTime <= windowEnd;
