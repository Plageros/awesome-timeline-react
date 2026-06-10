import { TimeBlock } from "../core/time-blocks";
import { DEFAULT_THEME } from "./theme";

/**
 * Vertical grid lines, one per grid cell (`cellWidth` px == `cellWidth * tick`
 * seconds). Lines are anchored to absolute time — placed at cell boundaries
 * (multiples of the cell duration), not at fixed screen offsets — so they pan
 * with the content and stay aligned with the time-bar blocks. Keeps the legacy
 * "hide-last-line" behavior: no line within 1px of either edge.
 */
export const drawGridLines = (
  ctx: CanvasRenderingContext2D,
  {
    width,
    height,
    cellWidth,
    windowStart,
    tick,
    color = DEFAULT_THEME.gridColor,
  }: {
    width: number;
    height: number;
    cellWidth: number;
    windowStart: number;
    tick: number;
    color?: string;
  }
) => {
  if (cellWidth <= 0 || tick <= 0) return;
  const cellTime = cellWidth * tick; // seconds per grid cell
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  // first absolute cell boundary strictly after the left edge
  for (
    let t = Math.floor(windowStart / cellTime) * cellTime + cellTime;
    ;
    t += cellTime
  ) {
    const x = (t - windowStart) / tick;
    if (x >= width || width - x < 1) break; // hide line at/!near the right edge
    if (x < 1) continue; // and at the left edge
    const crisp = Math.round(x) - 0.5;
    ctx.moveTo(crisp, 0);
    ctx.lineTo(crisp, height);
  }
  ctx.stroke();
};

/**
 * Two-row time bar (top row over bottom row) — canvas replacement for the
 * day/hour block divs of time-bar.tsx. The two rows are unit-agnostic
 * (day/hour by default, configurable via TimeBarConfig). Background is left
 * transparent so the .time-bar container color shows through.
 */
export const drawTimeBar = (
  ctx: CanvasRenderingContext2D,
  {
    width,
    height,
    topBlocks,
    bottomBlocks,
    font,
    borderColor = DEFAULT_THEME.timeBarBorder,
    textColor = DEFAULT_THEME.timeBarTextColor,
  }: {
    width: number;
    height: number;
    font: string;
    borderColor?: string;
    textColor?: string;
    topBlocks: TimeBlock[];
    bottomBlocks: TimeBlock[];
  }
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
  for (let i = 0; i < topBlocks.length - 1; i++) {
    const edge = Math.round(topBlocks[i].x + topBlocks[i].width) - 0.5;
    ctx.moveTo(edge, 0);
    ctx.lineTo(edge, mid);
  }
  for (let i = 0; i < bottomBlocks.length - 1; i++) {
    const edge = Math.round(bottomBlocks[i].x + bottomBlocks[i].width) - 0.5;
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
  for (const block of topBlocks) {
    ctx.fillText(
      block.label,
      block.x + block.width / 2,
      mid / 2,
      block.width - inset
    );
  }
  for (const block of bottomBlocks) {
    ctx.fillText(
      block.label,
      block.x + block.width / 2,
      mid + mid / 2,
      block.width - inset
    );
  }
};
