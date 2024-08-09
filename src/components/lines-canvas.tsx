import React from "react";
import { useMemo } from "react";

const LinesCanvas = ({
  contentWidth,
  cellWidth,
  lineClassName,
}: {
  contentWidth: number | null;
  cellWidth: number;
  lineClassName?: string;
}) => {
  const lines = useMemo(() => {
    const lines: JSX.Element[] = [];
    const classNames = lineClassName ? "line " + lineClassName : "line";
    if (contentWidth) {
      for (let i = cellWidth; i < contentWidth; i = i + cellWidth) {
        lines.push(<div key={`line_${i}`} className={classNames}></div>);
      }
    }
    return lines;
  }, [cellWidth, contentWidth]);

  const minWidth = useMemo(() => {
    return contentWidth ? contentWidth - lines.length * cellWidth : 0;
  }, [contentWidth, cellWidth, lines]);

  return (
    <div
      className={minWidth < 1 ? "lines-canvas hide-last-line" : "lines-canvas"}
      style={
        minWidth < 1
          ? {
              gridTemplateColumns: `repeat(auto-fill, minmax(${cellWidth}px, 1fr))`,
            }
          : {
              gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, ${cellWidth}px))`,
            }
      }
    >
      {lines}
    </div>
  );
};

export default LinesCanvas;
