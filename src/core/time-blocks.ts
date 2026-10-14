import getMonthName from "../helpers/get-month-name";
import getWeekDayName from "../helpers/get-week-day-name";
import {
  TimeBarConfig,
  TimeBarLevel,
  TimeBarRowConfig,
  TimeBarUnit,
} from "../types";

export type TimeBlock = {
  label: string;
  x: number; // CSS px from the content's left edge
  width: number;
};

export type TimeBlocks = {
  dayBlocks: TimeBlock[];
  hourBlocks: TimeBlock[];
};

type RowUnit = NonNullable<TimeBarRowConfig["unit"]>;
type SteppedUnit = TimeBarUnit | { stepSeconds: number };

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const hourLabel = (hour: number) => `${pad2(hour)}:00`;

const dayLabel = (date: Date) =>
  `${getWeekDayName(date.getDay())} ${date.getDate()} ${getMonthName(
    date.getMonth()
  )}`;

/** ISO-8601 week number (weeks start Monday; week 1 holds the year's first Thursday). */
export const isoWeek = (date: Date): number => {
  const thursday = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 3 - ((date.getDay() + 6) % 7)
  );
  const jan1 = new Date(thursday.getFullYear(), 0, 1);
  return 1 + Math.floor(Math.round((thursday.getTime() - jan1.getTime()) / 86400000) / 7);
};

/** Default label per unit — mirrors the pre-config day ("Mon 1 Jan") and
 *  hour ("HH:00") labels; week labels its starting day, month its name/year. */
const defaultFormat = (unit: RowUnit): ((blockStart: Date) => string) => {
  if (typeof unit === "object") {
    return (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }
  switch (unit) {
    case "hour":
      return (d) => hourLabel(d.getHours());
    case "month":
      return (d) => `${getMonthName(d.getMonth())} ${d.getFullYear()}`;
    case "year":
      return (d) => `${d.getFullYear()}`;
    case "day":
    case "week":
    default:
      return (d) => dayLabel(d);
  }
};

/** Start of the calendar/step block containing `date`. */
const floorToUnit = (date: Date, unit: SteppedUnit, anchorSec: number): Date => {
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
    case "year":
      return new Date(y, 0, 1);
  }
};

/** Start of the next block after `blockStart` (calendar-correct, DST-safe). */
const nextBoundary = (blockStart: Date, unit: SteppedUnit): Date => {
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
    case "year":
      return new Date(y + 1, 0, 1);
  }
};

/** Each block's whole [start, end) in unix seconds, for the blocks the window
 *  touches; null once there would be more than `limit`. */
const blockSpans = (
  unit: RowUnit,
  windowStart: number,
  windowEnd: number,
  limit = 100000
): [number, number][] | null => {
  const spans: [number, number][] = [];
  if (typeof unit === "object" && "boundaries" in unit) {
    const edges = unit.boundaries(windowStart, windowEnd);
    for (let i = 0; i + 1 < edges.length; i++) {
      const [start, end] = [edges[i], edges[i + 1]];
      if (end <= windowStart || start >= windowEnd || end <= start) continue;
      if (spans.length >= limit) return null;
      spans.push([start, end]);
    }
    return spans;
  }

  // custom fixed steps are anchored to the start of windowStart's local day,
  // so e.g. 8h shifts fall on 00:00 / 08:00 / 16:00.
  const day = new Date(windowStart * 1000);
  const anchorSec =
    new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime() / 1000;

  let cursorSec = windowStart;
  while (cursorSec < windowEnd) {
    const blockStart = floorToUnit(new Date(cursorSec * 1000), unit, anchorSec);
    const startSec = blockStart.getTime() / 1000;
    const endSec = nextBoundary(blockStart, unit).getTime() / 1000;
    if (endSec <= startSec) break; // safety against a non-advancing step
    if (spans.length >= limit) return null;
    spans.push([startSec, endSec]);
    cursorSec = endSec;
  }
  return spans;
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
  if (tick === null || tick <= 0 || windowEnd <= windowStart) return [];
  const resolvedUnit = unit ?? "hour";
  const label = format ?? defaultFormat(resolvedUnit);
  return (blockSpans(resolvedUnit, windowStart, windowEnd) ?? []).map(
    ([startSec, endSec]) => {
      const visibleStart = Math.max(startSec, windowStart);
      const visibleEnd = Math.min(endSec, windowEnd);
      return {
        label: label(new Date(startSec * 1000), new Date(endSec * 1000)),
        x: (visibleStart - windowStart) / tick,
        width: (visibleEnd - visibleStart) / tick,
      };
    }
  );
};

const shortDay = (d: Date) => `${getWeekDayName(d.getDay())} ${d.getDate()}`;

export const DEFAULT_TIME_BAR_LEVELS: TimeBarLevel[] = [
  { topRow: { unit: "day" }, bottomRow: { unit: "hour" } },
  { topRow: { unit: "day" }, bottomRow: { unit: { stepSeconds: 6 * 3600 } } },
  {
    topRow: {
      unit: "week",
      format: (d) => `W${isoWeek(d)} · ${d.getDate()} ${getMonthName(d.getMonth())}`,
    },
    bottomRow: { unit: "day", format: shortDay },
  },
  { topRow: { unit: "month" }, bottomRow: { unit: "week", format: (d) => `W${isoWeek(d)}` } },
  { topRow: { unit: "year" }, bottomRow: { unit: "month", format: (d) => getMonthName(d.getMonth()) } },
];

export const DEFAULT_MIN_BLOCK_WIDTH = 40;

/** The two rows `timeBar` draws at this zoom. */
export const resolveTimeBar = (
  timeBar: TimeBarConfig | undefined,
  windowStart: number,
  windowEnd: number,
  tick: number | null
): TimeBarLevel => {
  if (!timeBar?.auto) {
    return {
      topRow: timeBar?.topRow ?? { unit: "day" },
      bottomRow: timeBar?.bottomRow ?? { unit: "hour" },
    };
  }
  const { levels = DEFAULT_TIME_BAR_LEVELS, minBlockWidth = DEFAULT_MIN_BLOCK_WIDTH } =
    timeBar.auto === true ? {} : timeBar.auto;
  const levelsOrDefault = levels.length > 0 ? levels : DEFAULT_TIME_BAR_LEVELS;
  if (tick === null || tick <= 0 || windowEnd <= windowStart) return levelsOrDefault[0];

  const minSecs = minBlockWidth * tick;
  // every block at least minSecs wide means at most this many touch the window
  const limit = Math.ceil((windowEnd - windowStart) / minSecs) + 2;
  return (
    levelsOrDefault.find((level) => {
      const spans = blockSpans(level.bottomRow.unit ?? "hour", windowStart, windowEnd, limit);
      return spans !== null && spans.every(([start, end]) => end - start >= minSecs);
    }) ?? levelsOrDefault[levelsOrDefault.length - 1]
  );
};

/**
 * The default two-row time bar: a day row over an hour row. Thin wrapper over
 * `generateUnitBlocks` kept for the golden tests and as the documented
 * default; the canvas time bar resolves `TimeBarConfig` through
 * `resolveTimeBar` and calls `generateUnitBlocks` per row.
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
