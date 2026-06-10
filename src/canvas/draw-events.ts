import { SceneStore } from "../core/scene";
import { cullToWindow } from "../core/culling";
import { timeToWidth, timeToX } from "../core/coords";
import { laneTop, staticEventHeight } from "../core/lanes";
import { EventState, EventType } from "../types";
import type { Rect } from "../core/types";
import type { RendererView } from "./renderer";
import { canResizeEvent } from "../core/interactions";
import { LayoutAnimator } from "./animator";

const EVENT_TEXT_INSET = 13; // legacy .event-content margin-inline
// legacy .event-resize / .resize-bar geometry
const HANDLE_INSET = 4;
const HANDLE_BAR_WIDTH = 3;
const HANDLE_BAR_GAP = 1;
const HANDLE_BAR_HEIGHT = 10;

const roundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }
};

/** Horizontal row dividers — replaces .row-content border-bottom. */
export const drawRowDividers = (
  ctx: CanvasRenderingContext2D,
  view: RendererView,
  scene: SceneStore,
  animator: LayoutAnimator
) => {
  const [windowStart, windowEnd] = view.windowTime;
  const rowIds = scene.getRowIds();
  ctx.strokeStyle = view.theme.gridColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  let y = 0;
  for (let i = 0; i < rowIds.length; i++) {
    y += animator.rowHeight(
      rowIds[i],
      scene.getRowHeight(rowIds[i], windowStart, windowEnd)
    );
    if (i === rowIds.length - 1) break; // :not(:last-child)
    const screenY = y - view.scrollTop;
    if (screenY < 0) continue;
    if (screenY > view.height) break;
    const crisp = Math.round(screenY) - 0.5;
    ctx.moveTo(0, crisp);
    ctx.lineTo(view.width, crisp);
  }
  ctx.stroke();
};

/** Legacy ResizeIcon: two small rounded bars at each end, shown on hover. */
const drawResizeHandles = (
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  alpha: number,
  strokeColor: string
) => {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1;
  const barY = rect.y + (rect.height - HANDLE_BAR_HEIGHT) / 2;
  const xs = [
    rect.x + HANDLE_INSET,
    rect.x + HANDLE_INSET + HANDLE_BAR_WIDTH + HANDLE_BAR_GAP,
    rect.x + rect.width - HANDLE_INSET - HANDLE_BAR_WIDTH,
    rect.x +
      rect.width -
      HANDLE_INSET -
      HANDLE_BAR_WIDTH * 2 -
      HANDLE_BAR_GAP,
  ];
  for (const barX of xs) {
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(
        barX + 0.5,
        barY + 0.5,
        HANDLE_BAR_WIDTH - 1,
        HANDLE_BAR_HEIGHT - 1,
        1.5
      );
    } else {
      ctx.rect(barX + 0.5, barY + 0.5, HANDLE_BAR_WIDTH - 1, HANDLE_BAR_HEIGHT - 1);
    }
    ctx.stroke();
  }
  ctx.restore();
};

const defaultDrawEvent = (
  ctx: CanvasRenderingContext2D,
  event: EventType,
  rect: Rect,
  view: RendererView,
  font: string,
  barRadius: number
) => {
  const theme = view.theme;
  const style = event.props?.style;

  if (style?.opacity !== undefined) ctx.globalAlpha *= style.opacity;
  ctx.fillStyle = style?.fill ?? theme.eventFill;
  ctx.strokeStyle = style?.stroke ?? theme.eventStroke;
  ctx.lineWidth = style?.strokeWidth ?? 1;
  roundedRect(
    ctx,
    rect.x + 0.5,
    rect.y + 0.5,
    rect.width - 1,
    rect.height - 1,
    style?.borderRadius ?? barRadius
  );
  ctx.fill();
  ctx.stroke();

  const label = event.props?.label;
  if (label && rect.width > EVENT_TEXT_INSET * 2) {
    ctx.fillStyle = style?.textColor ?? theme.eventTextColor;
    ctx.font = style?.font ?? theme.font ?? font;
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      rect.x + EVENT_TEXT_INSET,
      rect.y,
      rect.width - EVENT_TEXT_INSET * 2,
      rect.height
    );
    ctx.clip();
    ctx.fillText(label, rect.x + EVENT_TEXT_INSET, rect.y + rect.height / 2);
    ctx.restore();
  }
};

/**
 * All window- and viewport-visible events in one pass. Rows fully outside
 * the vertical viewport are skipped without touching their events. Custom
 * renderers resolve per-event drawEvent -> Timeline drawEvent -> default.
 */
export const drawEvents = (
  ctx: CanvasRenderingContext2D,
  view: RendererView,
  scene: SceneStore,
  font: string,
  animator: LayoutAnimator
) => {
  if (view.tick === null) return;
  const [windowStart, windowEnd] = view.windowTime;
  const tick = view.tick;
  const geometry = scene.getGeometry();

  ctx.font = view.theme.font ?? font;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  let rowTop = 0;
  for (const rowId of scene.getRowIds()) {
    const rowHeight = animator.rowHeight(
      rowId,
      scene.getRowHeight(rowId, windowStart, windowEnd)
    );
    const rowY = rowTop - view.scrollTop;
    rowTop += rowHeight;
    if (rowY + rowHeight < 0) continue;
    if (rowY > view.height) break;

    const lanes = scene.getLanes(rowId, windowStart, windowEnd);

    // static events sit below interactive ones (legacy z-index 0 vs 1)
    for (const event of cullToWindow(
      scene.getRowStaticEvents(rowId),
      windowStart,
      windowEnd
    )) {
      const x = timeToX(event.startTime, windowStart, tick);
      const width = timeToWidth(event.startTime, event.endTime, tick);
      ctx.fillStyle = view.theme.staticEventFill;
      roundedRect(
        ctx,
        x,
        rowY + geometry.laneTopOffset,
        width,
        staticEventHeight(lanes.highestLane, geometry),
        geometry.barRadius
      );
      ctx.fill();
    }

    for (const event of cullToWindow(
      scene.getRowEvents(rowId),
      windowStart,
      windowEnd
    )) {
      let x = timeToX(event.startTime, windowStart, tick);
      let width = timeToWidth(event.startTime, event.endTime, tick);
      // The lane offset tweens in ROW-LOCAL coordinates (legacy .event
      // transition on `top`), while the row's animated position applies
      // instantly. Tweening the absolute top instead would chase the
      // moving row with a perpetual lag, desyncing events from their
      // row dividers/headers under rapid updates.
      const y =
        rowY +
        animator.eventTop(
          event.id,
          laneTop(lanes.laneOf.get(event.id) as number, geometry)
        );

      const resize = view.resizePreview;
      const resizing = resize !== null && resize.eventId === event.id;
      if (resizing) {
        // live edge preview, same arithmetic as the legacy inline style
        if (resize.direction === "left") {
          x += resize.deltaPx;
          width -= resize.deltaPx;
        } else {
          width += resize.deltaPx;
        }
      }

      const rect: Rect = { x, y, width, height: geometry.barHeight };
      const state: EventState = {
        hovered: view.hoveredEventId === event.id,
        dragging: view.draggedEventId === event.id,
        resizing,
        selected: false,
      };

      ctx.save();
      if (state.dragging) ctx.globalAlpha = 0.5; // legacy drag opacity

      const custom = event.props?.drawEvent ?? view.drawEvent;
      const drawn =
        custom !== undefined &&
        custom(ctx, event, rect, state, view.theme) !== false;
      if (!drawn) {
        defaultDrawEvent(ctx, event, rect, view, font, geometry.barRadius);
      }

      if (canResizeEvent(event, view.eventsResize)) {
        const alpha = animator.handleAlpha(
          event.id,
          state.hovered || state.resizing ? 1 : 0
        );
        if (alpha > 0.01) {
          drawResizeHandles(
            ctx,
            rect,
            alpha,
            event.props?.style?.stroke ?? view.theme.eventStroke
          );
        }
      }
      ctx.restore();
    }
  }
};
