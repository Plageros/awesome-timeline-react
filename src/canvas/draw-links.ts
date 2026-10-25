import { SceneStore } from "../core/scene";
import { Rect } from "../core/types";
import { eventRect, LinkMarker, linkMarkers, linkRoute } from "../core/links";
import type { RendererView } from "./renderer";
import { roundedRect } from "./draw-events";

const ARROW = 6;

/** The view's links and their edge markers; returns the markers so a click can find them. */
export const drawLinks = (ctx: CanvasRenderingContext2D, view: RendererView, scene: SceneStore,
                          font: string): LinkMarker[] => {
  if (view.tick === null || !view.links.length) return [];
  const { offsetOf } = scene.getRowOffsets();
  const at = { windowStart: view.windowTime[0], tick: view.tick, scrollTop: view.scrollTop };
  const rects = new Map<string, Rect | null>();
  const rectOf = (id: string) => {
    if (!rects.has(id)) rects.set(id, eventRect(scene, offsetOf, id, at));
    return rects.get(id) ?? null;
  };
  const { theme } = view;

  ctx.save();
  ctx.lineJoin = "round";
  for (const link of view.links) {
    const a = rectOf(link.fromEventId), b = rectOf(link.toEventId);
    if (!a || !b) continue;
    const color = link.style?.stroke ?? theme.linkColor;
    const points = linkRoute(a, b);
    ctx.strokeStyle = color;
    ctx.lineWidth = link.style?.strokeWidth ?? theme.linkWidth;
    ctx.setLineDash(link.style?.dash ?? []);
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    const [bx, by] = points[points.length - 1];
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - ARROW, by - ARROW / 1.4);
    ctx.lineTo(bx - ARROW, by + ARROW / 1.4);
    ctx.closePath();
    ctx.fill();
  }

  ctx.font = theme.font ?? font;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const markers = linkMarkers(scene, view.links, rectOf, view, (text) => ctx.measureText(text).width);
  for (const m of markers) {
    const { x, y, width, height } = m.rect;
    ctx.fillStyle = theme.linkColor;
    roundedRect(ctx, x, y, width, height, height / 2);
    ctx.fill();
    ctx.fillStyle = theme.linkMarkerTextColor;
    ctx.fillText(m.label, x + 8, y + height / 2);
  }
  ctx.restore();
  return markers;
};
