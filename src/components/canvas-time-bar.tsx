import React, { useEffect, useRef } from "react";
import { generateUnitBlocks, resolveTimeBar } from "../core/time-blocks";
import { sizeCanvas } from "../canvas/dpr";
import { drawTimeBar } from "../canvas/draw-grid";
import { DEFAULT_THEME } from "../canvas/theme";
import { ResolvedTheme, TimeBarConfig } from "../types";

// .time-bar's height in style.css, with a 1px border on each side
export const TIME_BAR_HEIGHT = 50;
const TIME_BAR_INNER_HEIGHT = TIME_BAR_HEIGHT - 2;

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
  const header = theme ?? DEFAULT_THEME;

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
    const { topRow, bottomRow } = resolveTimeBar(timeBar, windowStart, windowEnd, tick);
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
  }, [windowTime, tick, contentWidth, theme, timeBar]);

  return (
    <div
      className="time-bar"
      style={{ background: header.headerBackground, color: header.headerTextColor, borderColor: header.headerBorderColor }}
    >
      <div className="empty-block" style={{ borderRightColor: header.headerBorderColor }}></div>
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
            borderLeft: `1px solid ${header.headerBorderColor ?? "yellow"}`,
          }}
        ></div>
      ) : null}
    </div>
  );
};

export default CanvasTimeBar;
