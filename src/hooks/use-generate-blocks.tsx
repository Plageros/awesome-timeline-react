import React from "react";
import { useMemo } from "react";
import getMonthName from "../helpers/get-month-name";
import getWeekDayName from "../helpers/get-week-day-name";

const useGenerateBlocks = ({
  windowTime,
  tick,
  contentWidth,
  blockWidth,
}: {
  windowTime: number[];
  tick: number | null;
  contentWidth: number | null;
  blockWidth: number;
}) => {
  const { dayBlocks, hourBlocks } = useMemo(() => {
    let timePoint = windowTime[0];
    const dayBlocks: JSX.Element[] = [];
    const hourBlocks: JSX.Element[] = [];
    if (tick === null || contentWidth === null) {
      return { dayBlocks: [], hourBlocks: [] };
    }

    let widthLeft = contentWidth;

    let prevNumBlocks = 1;

    while (1) {
      let datePoint = new Date(timePoint * 1000);
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
        const numBlocks = Math.round((dateWidth + widthLeft) / blockWidth);

        for (let i = 0; i < numBlocks; i++) {
          hourBlocks.push(
            <div
              className="hour-block"
              key={`${datePoint.getDate()}_hour_${i}`}
            >
              {i < 10 ? `0${i}:00` : `${i}:00`}
            </div>
          );
        }

        dayBlocks.push(
          <div
            className="day-block"
            key={`${datePoint.getDate()} ${datePoint.getMonth()}`}
            style={{
              gridColumn: `${prevNumBlocks} / ${prevNumBlocks + numBlocks}`,
              // width: dateWidth + widthLeft,
              // minWidth: dateWidth + widthLeft,
            }}
          >
            {getWeekDayName(datePoint.getDay())} {datePoint.getDate()}{" "}
            {getMonthName(datePoint.getMonth())}
          </div>
        );
        prevNumBlocks += numBlocks;
        break;
      }

      const numBlocks = Math.round(dateWidth / blockWidth);

      for (let i = 24 - numBlocks; i < 24; i++) {
        hourBlocks.push(
          <div className="hour-block" key={`${datePoint.getDate()}_hour_${i}`}>
            {i < 10 ? `0${i}:00` : `${i}:00`}
          </div>
        );
      }

      dayBlocks.push(
        <div
          className="day-block"
          key={`${datePoint.getDate()} ${datePoint.getMonth()}`}
          style={{
            gridColumn: `${prevNumBlocks} / ${prevNumBlocks + numBlocks}`,
            // width: dateWidth,
            // minWidth: dateWidth,
          }}
        >
          {getWeekDayName(datePoint.getDay())} {datePoint.getDate()}{" "}
          {getMonthName(datePoint.getMonth())}
        </div>
      );
      prevNumBlocks += numBlocks;
      if (Math.round(widthLeft) === 0) {
        break;
      }
      timePoint = (endDatePoint.getTime() + 1000) / 1000;
    }

    return { dayBlocks, hourBlocks };
  }, [tick, windowTime, contentWidth]);
  return { dayBlocks, hourBlocks };
};

export default useGenerateBlocks;
