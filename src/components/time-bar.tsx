import React, { useRef } from "react";
import useGenerateBlocks from "../hooks/use-generate-blocks";
import useGetBlockProperties from "../hooks/use-get-block-properties";
import { PartialRecord, ModifableElements, TimeBarPatternType } from "../types";

const TimeBar = ({
  windowTime,
  tick,
  contentWidth,
  scrollWidth,
  additionalClassNames,
  timeBarPattern,
}: {
  windowTime: number[];
  tick: number | null;
  contentWidth: number | null;
  scrollWidth: number;
  additionalClassNames?: PartialRecord<keyof ModifableElements, string>;
  timeBarPattern: TimeBarPatternType;
}) => {
  const timeContentRef = useRef<HTMLDivElement | null>(null);

  const { blockWidth } = useGetBlockProperties({
    windowTime,
    contentWidth,
    timeBarPattern,
  });

  const { dayBlocks, hourBlocks } = useGenerateBlocks({
    windowTime,
    tick,
    contentWidth,
    blockWidth,
  });

  const timeBarClassNames = additionalClassNames?.timeBar
    ? "time-bar " + additionalClassNames.timeBar
    : "time-bar";

  const dayRowClassNames = additionalClassNames?.dayRow
    ? "day-row " + additionalClassNames.dayRow
    : "day-row";

  const hourRowClassNames = additionalClassNames?.hourRow
    ? "hour-row " + additionalClassNames.hourRow
    : "hour-row";
  return (
    <div className={timeBarClassNames}>
      <div className="empty-block"></div>
      <div
        className="time-content"
        ref={timeContentRef}
        style={{ minWidth: contentWidth ? contentWidth : 0 }}
      >
        <div
          className={dayRowClassNames}
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${blockWidth}px, 1fr))`,
          }}
        >
          {dayBlocks.map((block) => block)}
        </div>
        <div
          className={hourRowClassNames}
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${blockWidth}px, 1fr))`,
          }}
        >
          {hourBlocks.map((block) => block)}
        </div>
      </div>
      {scrollWidth ? (
        <div
          style={{
            width: scrollWidth,
            height: "100%",
            boxSizing: "border-box",
            borderLeft: "1px solid yellow",
          }}
        ></div>
      ) : null}
    </div>
  );
};

export default TimeBar;
