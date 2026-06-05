import getMonthName from "../helpers/get-month-name";
import getWeekDayName from "../helpers/get-week-day-name";

export type TimeBlock = {
  label: string;
  x: number; // CSS px from the content's left edge
  width: number;
};

export type TimeBlocks = {
  dayBlocks: TimeBlock[];
  hourBlocks: TimeBlock[];
};

const hourLabel = (hour: number) =>
  hour < 10 ? `0${hour}:00` : `${hour}:00`;

const dayLabel = (date: Date) =>
  `${getWeekDayName(date.getDay())} ${date.getDate()} ${getMonthName(
    date.getMonth()
  )}`;

/**
 * Pure extraction of the day/hour block generation previously inlined as JSX
 * in use-generate-blocks.tsx. Same walk over the window, same Math.round
 * block counting, same labels — but returns positioned data that both the
 * canvas time bar and tests can consume.
 */
export const generateTimeBlocks = ({
  windowStart,
  tick,
  contentWidth,
  blockWidth,
}: {
  windowStart: number;
  tick: number | null;
  contentWidth: number | null;
  blockWidth: number;
}): TimeBlocks => {
  const dayBlocks: TimeBlock[] = [];
  const hourBlocks: TimeBlock[] = [];
  if (tick === null || contentWidth === null || blockWidth <= 0) {
    return { dayBlocks, hourBlocks };
  }

  let timePoint = windowStart;
  let widthLeft = contentWidth;
  let prevNumBlocks = 1;

  while (1) {
    const datePoint = new Date(timePoint * 1000);
    const endDatePoint = new Date(
      datePoint.getFullYear(),
      datePoint.getMonth(),
      datePoint.getDate(),
      23,
      59,
      59
    );
    const dateDuration = endDatePoint.getTime() - datePoint.getTime();
    const dateWidth = dateDuration / 1000 / tick;

    widthLeft -= dateWidth;

    if (Math.round(widthLeft) < 0) {
      // final, truncated day
      const numBlocks = Math.round((dateWidth + widthLeft) / blockWidth);
      for (let i = 0; i < numBlocks; i++) {
        hourBlocks.push({
          label: hourLabel(i),
          x: hourBlocks.length * blockWidth,
          width: blockWidth,
        });
      }
      dayBlocks.push({
        label: dayLabel(datePoint),
        x: (prevNumBlocks - 1) * blockWidth,
        width: numBlocks * blockWidth,
      });
      prevNumBlocks += numBlocks;
      break;
    }

    const numBlocks = Math.round(dateWidth / blockWidth);
    for (let i = 24 - numBlocks; i < 24; i++) {
      hourBlocks.push({
        label: hourLabel(i),
        x: hourBlocks.length * blockWidth,
        width: blockWidth,
      });
    }
    dayBlocks.push({
      label: dayLabel(datePoint),
      x: (prevNumBlocks - 1) * blockWidth,
      width: numBlocks * blockWidth,
    });
    prevNumBlocks += numBlocks;

    if (Math.round(widthLeft) === 0) {
      break;
    }
    timePoint = (endDatePoint.getTime() + 1000) / 1000;
  }

  return { dayBlocks, hourBlocks };
};
