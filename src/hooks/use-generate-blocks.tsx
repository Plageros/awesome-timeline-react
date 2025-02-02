import React from "react";
import { useMemo } from "react";
import getMonthName from "../helpers/get-month-name";
import getWeekDayName from "../helpers/get-week-day-name";
import { TimeBarPatternType } from "../types";

function daysInMonth (month:number, year:number) {
  return new Date(year, month, 0).getDate();
}

const seconaryRowContentWrapper = (index: number, timeBarPattern: TimeBarPatternType, startDay: number, globalIndex: number) => {
  switch (timeBarPattern) {
    case "hour":
      return index < 10 ? `0${index}:00` : `${index}:00`;
    case "day":
      return `${index + 1} ${getWeekDayName((startDay + globalIndex) % 7)}`;
    default:
      return index < 10 ? `0${index}:00` : `${index}:00`;
  }
}

const primaryRowContentWrapper = (datePoint: Date, timeBarPattern: TimeBarPatternType) => {
  switch (timeBarPattern) {
    case "hour":
      return `${getWeekDayName(datePoint.getDay())} ${datePoint.getDate()}
      ${getMonthName(datePoint.getMonth())}`
    case "day":
      return `${getMonthName(datePoint.getMonth())}`;
    default:
      return `${getWeekDayName(datePoint.getDay())} ${datePoint.getDate()}
      ${getMonthName(datePoint.getMonth())}`
  }
}

const secondaryRowBlocksMapper = (timeBarPattern: TimeBarPatternType, datePoint: Date) => {
  switch (timeBarPattern) {
    case "hour": 
      return 24;
    case "day": 
      return daysInMonth(datePoint.getMonth() + 1, datePoint.getFullYear())
    default:
      return 24
  }
}

const generateEndDatePoint = (datePoint: Date, timeBarPattern: TimeBarPatternType) => {
  switch (timeBarPattern) {
    case "hour":
      return new Date(
        datePoint.getFullYear(),
        datePoint.getMonth(),
        datePoint.getDate(),
        23,
        59,
        59
      )
    case "day":
      return new Date(
        datePoint.getFullYear(),
        datePoint.getMonth(),
        daysInMonth(datePoint.getMonth() + 1, datePoint.getFullYear()),
        23,
        59,
        59)
      default:
      return new Date(
        datePoint.getFullYear(),
        datePoint.getMonth(),
        datePoint.getDate(),
        23,
        59,
        59
      )
  }
  
}

const useGenerateBlocks = ({
  windowTime,
  tick,
  contentWidth,
  blockWidth,
  timeBarPattern
}: {
  windowTime: number[];
  tick: number | null;
  contentWidth: number | null;
  blockWidth: number;
  timeBarPattern: TimeBarPatternType
}) => {
  const { primaryRow, secondaryRow } = useMemo(() => {
    let timePoint = windowTime[0];
    const primaryRow: JSX.Element[] = [];
    const secondaryRow: JSX.Element[] = [];
    if (tick === null || contentWidth === null) {
      return { primaryRow: [], secondaryRow: [] };
    }

    let widthLeft = contentWidth;
    let prevNumBlocks = 1;
    const startPoint = new Date(timePoint * 1000);
    let globalIndex =  0

    while (1) {
      let datePoint = new Date(timePoint * 1000);
      const endDatePoint = generateEndDatePoint(datePoint, timeBarPattern);
      const dateDuration = endDatePoint.getTime() - datePoint.getTime();
      const dateWidth = dateDuration / 1000 / tick;

      widthLeft -= dateWidth;

      if (Math.round(widthLeft) < 0) {
        
        const numBlocks = Math.round((dateWidth + widthLeft) / blockWidth);

        for (let i = 0; i < numBlocks; i++) {
          secondaryRow.push(
            <div
              className="hour-block"
              key={`${datePoint.getDate()}_${timeBarPattern}_${i}`}
            >
              {seconaryRowContentWrapper(i, timeBarPattern, startPoint.getDay(), globalIndex)}
            </div>
          );
          globalIndex++
        }

        primaryRow.push(
          <div
            className="day-block"
            key={`${datePoint.getDate()} ${datePoint.getMonth()}`}
            style={{
              gridColumn: `${prevNumBlocks} / ${prevNumBlocks + numBlocks}`,
              // width: dateWidth + widthLeft,
              // minWidth: dateWidth + widthLeft,
            }}
          >
            {primaryRowContentWrapper(datePoint, timeBarPattern)}
          </div>
        );
        prevNumBlocks += numBlocks;
        break;
      }

      const numBlocks = Math.round(dateWidth / blockWidth);

      if (numBlocks > 0) {
        for (let i = secondaryRowBlocksMapper(timeBarPattern, datePoint) - numBlocks; i < secondaryRowBlocksMapper(timeBarPattern, datePoint); i++) {
          secondaryRow.push(
            <div className="hour-block" key={`${datePoint.getDate()}_${timeBarPattern}_${i}`}>
              {seconaryRowContentWrapper(i, timeBarPattern, startPoint.getDay(), globalIndex)}
            </div>
          );
          globalIndex++
        }
  
        primaryRow.push(
          <div
            className="day-block"
            key={`${datePoint.getDate()} ${datePoint.getMonth()}`}
            style={{
              gridColumn: `${prevNumBlocks} / ${prevNumBlocks + numBlocks}`,
              // width: dateWidth,
              // minWidth: dateWidth,
            }}
          >
            {primaryRowContentWrapper(datePoint, timeBarPattern)}
          </div>
        );
        prevNumBlocks += numBlocks;
      }
     
      if (Math.round(widthLeft) <= 0) {
        break;
      }
      timePoint = (endDatePoint.getTime() + 1000) / 1000;
    }

    return { primaryRow,  secondaryRow };
  }, [tick, windowTime, contentWidth]);
  return { primaryRow, secondaryRow };
};

export default useGenerateBlocks;
