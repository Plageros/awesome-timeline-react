import React, { useEffect, useRef } from "react";
import { generateUnitBlocks } from "../core/time-blocks";
import { sizeCanvas } from "../canvas/dpr";
import { drawTimeBar } from "../canvas/draw-grid";
import { ResolvedTheme, TimeBarConfig } from "../types";

// .time-bar is 50px with a 1px border on each side
const TIME_BAR_INNER_HEIGHT = 48;

const CanvasTimeBar = ({
  windowTime,
  tick,
  contentWidth,
  scrollWidth,
  theme,
  timeBar,
}: {
  windowTime: number[];
  tick: number | null;
  contentWidth: number | null;
  scrollWidth: number;
  theme?: ResolvedTheme;
  timeBar?: TimeBarConfig;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const topRow = timeBar?.topRow ?? { unit: "day" as const };
  const bottomRow = timeBar?.bottomRow ?? { unit: "hour" as const };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !contentWidth) return;
    const ctx = sizeCanvas(
      canvas,
      contentWidth,
      TIME_BAR_INNER_HEIGHT,
      window.devicePixelRatio
    );
    if (!ctx) return;
    const [windowStart, windowEnd] = windowTime;
    drawTimeBar(ctx, {
      width: contentWidth,
      height: TIME_BAR_INNER_HEIGHT,
      font: theme?.font ?? getComputedStyle(canvas).font,
      borderColor: theme?.timeBarBorder,
      textColor: theme?.timeBarTextColor,
      topBlocks: generateUnitBlocks({ ...topRow, windowStart, windowEnd, tick }),
      bottomBlocks: generateUnitBlocks({
        ...bottomRow,
        windowStart,
        windowEnd,
        tick,
      }),
    });
    // topRow/bottomRow are derived from `timeBar`; depend on it directly so a
    // new config object re-renders the bar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowTime, tick, contentWidth, theme, timeBar]);

  return (
    <div className="time-bar">
      <div className="empty-block"></div>
      <canvas
        ref={canvasRef}
        className="canvas-time-bar"
        style={{ minWidth: contentWidth ? contentWidth : 0 }}
      ></canvas>
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

export default CanvasTimeBar;
