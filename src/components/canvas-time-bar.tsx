import React, { useEffect, useRef } from "react";
import useGetBlockProperties from "../hooks/use-get-block-properties";
import { generateTimeBlocks } from "../core/time-blocks";
import { sizeCanvas } from "../canvas/dpr";
import { drawTimeBar } from "../canvas/draw-grid";
import { ResolvedTheme } from "../types";

// .time-bar is 50px with a 1px border on each side
const TIME_BAR_INNER_HEIGHT = 48;

const CanvasTimeBar = ({
  windowTime,
  tick,
  contentWidth,
  scrollWidth,
  theme,
}: {
  windowTime: number[];
  tick: number | null;
  contentWidth: number | null;
  scrollWidth: number;
  theme?: ResolvedTheme;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { blockWidth } = useGetBlockProperties({
    windowTime,
    contentWidth,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !contentWidth) return;
    const ctx = sizeCanvas(
      canvas,
      contentWidth,
      TIME_BAR_INNER_HEIGHT,
      window.devicePixelRatio
    );
    if (ctx) {
      drawTimeBar(ctx, {
        width: contentWidth,
        height: TIME_BAR_INNER_HEIGHT,
        font: theme?.font ?? getComputedStyle(canvas).font,
        borderColor: theme?.timeBarBorder,
        textColor: theme?.timeBarTextColor,
        ...generateTimeBlocks({
          windowStart: windowTime[0],
          tick,
          contentWidth,
          blockWidth,
        }),
      });
    }
  }, [windowTime, tick, contentWidth, blockWidth, theme]);

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
