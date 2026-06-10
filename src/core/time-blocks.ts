import getMonthName from "../helpers/get-month-name";
import getWeekDayName from "../helpers/get-week-day-name";
import { TimeBarRowConfig, TimeBarUnit } from "../types";

export type TimeBlock = {
  label: string;
  x: number; // CSS px from the content's left edge
  width: number;
};

export type TimeBlocks = {
  dayBlocks: TimeBlock[];
  hourBlocks: TimeBlock[];
};

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const hourLabel = (hour: number) => `${pad2(hour)}:00`;

const dayLabel = (date: Date) =>
  `${getWeekDayName(date.getDay())} ${date.getDate()} ${getMonthName(
    date.getMonth()
  )}`;

/** Default label per unit — mirrors the pre-config day ("Mon 1 Jan") and
 *  hour ("HH:00") labels; week labels its starting day, month its name/year. */
const defaultFormat = (
  unit: TimeBarUnit | { stepSeconds: number }
): ((blockStart: Date) => string) => {
  if (typeof unit === "object") {
    return (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }
  switch (unit) {
    case "hour":
      return (d) => hourLabel(d.getHours());
    case "month":
      return (d) => `${getMonthName(d.getMonth())} ${d.getFullYear()}`;
    case "day":
    case "week":
    default:
      return (d) => dayLabel(d);
  }
};

/** Start of the calendar/step block containing `date`. */
const floorToUnit = (
  date: Date,
  unit: TimeBarUnit | { stepSeconds: number },
  anchorSec: number
): Date => {
  if (typeof unit === "object") {
    const t = date.getTime() / 1000;
    const step = unit.stepSeconds;
    return new Date((anchorSec + Math.floor((t - anchorSec) / step) * step) * 1000);
  }
  const y = date.getFullYear();
  const mo = date.getMonth();
  const d = date.getDate();
  switch (unit) {
    case "hour":
      return new Date(y, mo, d, date.getHours());
    case "day":
      return new Date(y, mo, d);
    case "week": {
      const dow = (date.getDay() + 6) % 7; // Monday = 0
      return new Date(y, mo, d - dow);
    }
    case "month":
      return new Date(y, mo, 1);
  }
};

/** Start of the next block after `blockStart` (calendar-correct, DST-safe). */
const nextBoundary = (
  blockStart: Date,
  unit: TimeBarUnit | { stepSeconds: number }
): Date => {
  if (typeof unit === "object") {
    return new Date(blockStart.getTime() + unit.stepSeconds * 1000);
  }
  const y = blockStart.getFullYear();
  const mo = blockStart.getMonth();
  const d = blockStart.getDate();
  switch (unit) {
    case "hour":
      return new Date(y, mo, d, blockStart.getHours() + 1);
    case "day":
      return new Date(y, mo, d + 1);
    case "week":
      return new Date(y, mo, d + 7);
    case "month":
      return new Date(y, mo + 1, 1);
  }
};

/**
 * Positioned blocks for one time-bar row. Walks real calendar/step boundaries
 * from `windowStart` to `windowEnd` and derives each block's pixel x/width
 * from `tick` (seconds per pixel), so blocks stay aligned to the wall clock as
 * the window pans. The first/last blocks are clipped to the window edges, so
 * the row tiles contiguously from x=0 to the content width.
 */
export const generateUnitBlocks = ({
  unit,
  format,
  windowStart,
  windowEnd,
  tick,
}: TimeBarRowConfig & {
  windowStart: number;
  windowEnd: number;
  tick: number | null;
}): TimeBlock[] => {
  const blocks: TimeBlock[] = [];
  const resolvedUnit = unit ?? "hour";
  if (tick === null || tick <= 0 || windowEnd <= windowStart) return blocks;

  const label = format ?? defaultFormat(resolvedUnit);
  // custom fixed steps are anchored to the start of windowStart's local day,
  // so e.g. 8h shifts fall on 00:00 / 08:00 / 16:00.
  const anchorSec =
    new Date(
      new Date(windowStart * 1000).getFullYear(),
      new Date(windowStart * 1000).getMonth(),
      new Date(windowStart * 1000).getDate()
    ).getTime() / 1000;

  let cursorSec = windowStart;
  let guard = 0;
  while (cursorSec < windowEnd && guard++ < 100000) {
    const blockStart = floorToUnit(new Date(cursorSec * 1000), resolvedUnit, anchorSec);
    const blockEnd = nextBoundary(blockStart, resolvedUnit);
    const startSec = blockStart.getTime() / 1000;
    const endSec = blockEnd.getTime() / 1000;
    if (endSec <= startSec) break; // safety against a non-advancing step

    const visibleStart = Math.max(startSec, windowStart);
    const visibleEnd = Math.min(endSec, windowEnd);
    blocks.push({
      label: label(blockStart, blockEnd),
      x: (visibleStart - windowStart) / tick,
      width: (visibleEnd - visibleStart) / tick,
    });
    cursorSec = endSec;
  }
  return blocks;
};

/**
 * The default two-row time bar: a day row over an hour row. Thin wrapper over
 * `generateUnitBlocks` kept for the golden tests and as the documented
 * default; the canvas time bar resolves `TimeBarConfig` and calls
 * `generateUnitBlocks` per row directly.
 */
export const generateTimeBlocks = ({
  windowStart,
  tick,
  contentWidth,
}: {
  windowStart: number;
  tick: number | null;
  contentWidth: number | null;
  /** @deprecated unused — block widths now derive from `tick` */
  blockWidth?: number;
}): TimeBlocks => {
  if (tick === null || contentWidth === null) {
    return { dayBlocks: [], hourBlocks: [] };
  }
  const windowEnd = windowStart + contentWidth * tick;
  return {
    dayBlocks: generateUnitBlocks({ unit: "day", windowStart, windowEnd, tick }),
    hourBlocks: generateUnitBlocks({ unit: "hour", windowStart, windowEnd, tick }),
  };
};
