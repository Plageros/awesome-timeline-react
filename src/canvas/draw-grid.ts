import { TimeBlocks } from "../core/time-blocks";
import { DEFAULT_THEME } from "./theme";

/**
 * Vertical grid lines, one per cellWidth — canvas replacement for the ~N
 * line divs of lines-canvas.tsx. Matches the legacy "hide-last-line"
 * behavior: no line within 1px of the right edge.
 */
export const drawGridLines = (
  ctx: CanvasRenderingContext2D,
  {
    width,
    height,
    cellWidth,
    color = DEFAULT_THEME.gridColor,
  }: { width: number; height: number; cellWidth: number; color?: string }
) => {
  if (cellWidth <= 0) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = cellWidth; x < width; x += cellWidth) {
    if (width - x < 1) break;
    const crisp = Math.round(x) - 0.5;
    ctx.moveTo(crisp, 0);
    ctx.lineTo(crisp, height);
  }
  ctx.stroke();
};

/**
 * Day row over hour row — canvas replacement for the day/hour block divs of
 * time-bar.tsx. Background is left transparent so the .time-bar container
 * color shows through, exactly like the DOM blocks did.
 */
export const drawTimeBar = (
  ctx: CanvasRenderingContext2D,
  {
    width,
    height,
    dayBlocks,
    hourBlocks,
    font,
    borderColor = DEFAULT_THEME.timeBarBorder,
    textColor = DEFAULT_THEME.timeBarTextColor,
  }: {
    width: number;
    height: number;
    font: string;
    borderColor?: string;
    textColor?: string;
  } & TimeBlocks
) => {
  const mid = height / 2;

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;

  // day-row border-bottom
  ctx.beginPath();
  ctx.moveTo(0, Math.round(mid) - 0.5);
  ctx.lineTo(width, Math.round(mid) - 0.5);
  ctx.stroke();

  // block separators (right border on every block except the last)
  ctx.beginPath();
  for (let i = 0; i < dayBlocks.length - 1; i++) {
    const edge = Math.round(dayBlocks[i].x + dayBlocks[i].width) - 0.5;
    ctx.moveTo(edge, 0);
    ctx.lineTo(edge, mid);
  }
  for (let i = 0; i < hourBlocks.length - 1; i++) {
    const edge = Math.round(hourBlocks[i].x + hourBlocks[i].width) - 0.5;
    ctx.moveTo(edge, mid);
    ctx.lineTo(edge, height);
  }
  ctx.stroke();

  // labels, centered in their blocks like the DOM time bar
  ctx.fillStyle = textColor;
  ctx.font = font;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  const inset = 4;
  for (const block of dayBlocks) {
    ctx.fillText(
      block.label,
      block.x + block.width / 2,
      mid / 2,
      block.width - inset
    );
  }
  for (const block of hourBlocks) {
    ctx.fillText(
      block.label,
      block.x + block.width / 2,
      mid + mid / 2,
      block.width - inset
    );
  }
};
