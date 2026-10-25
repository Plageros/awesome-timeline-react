import { SceneStore } from "../core/scene";
import { LinkMarker } from "../core/links";
import { DrawEventFn, LinkType, ResolvedTheme, TimeBarConfig } from "../types";
import { drawLinks } from "./draw-links";
import { generateUnitBlocks, resolveTimeBar } from "../core/time-blocks";
import { FrameScheduler, Layer, LayerDirty } from "./frame-scheduler";
import { sizeCanvas, watchDpr } from "./dpr";
import { drawBlockGridLines, drawGridLines } from "./draw-grid";
import {
  drawEvents,
  drawGroupShading,
  drawRowDividers,
} from "./draw-events";
import { DEFAULT_THEME } from "./theme";
import { LayoutAnimator } from "./animator";

export type ResizePreview = {
  eventId: string;
  deltaPx: number; // raw pointer delta, sign preserved
  direction: "left" | "right";
};

export type RendererView = {
  windowTime: [number, number];
  tick: number | null; // seconds per pixel; null until the container is measured
  cellWidth: number;
  scrollTop: number;
  width: number; // viewport CSS px
  height: number;
  theme: ResolvedTheme;
  drawEvent?: DrawEventFn;
  eventsResize: boolean;
  stripeOverlap: boolean;
  timeBar?: TimeBarConfig;
  // interaction state
  hoveredEventId: string | null;
  draggedEventId: string | null;
  resizePreview: ResizePreview | null;
  selectedEventIds: ReadonlySet<string>;
  links: LinkType[];
};

/**
 * Owns the two viewport-sized canvases and the frame loop.
 *
 * - static layer: grid lines, day/hour bands, time bar (Phase 2)
 * - dynamic layer: events (Phase 3)
 *
 * React pushes view-state via setView(); the SceneStore pushes data changes
 * via its subscription. Both only flip dirty flags — actual drawing happens
 * once per animation frame.
 */
export class TimelineRenderer {
  private view: RendererView = {
    windowTime: [0, 0],
    tick: null,
    cellWidth: 0,
    scrollTop: 0,
    width: 0,
    height: 0,
    theme: DEFAULT_THEME,
    drawEvent: undefined,
    eventsResize: true,
    stripeOverlap: false,
    hoveredEventId: null,
    draggedEventId: null,
    resizePreview: null,
    selectedEventIds: new Set<string>(),
    links: [],
  };
  private linkMarkers: LinkMarker[] = [];
  readonly animator = new LayoutAnimator();
  private scheduler: FrameScheduler;
  private unsubscribeScene: () => void;
  private unwatchDpr: () => void;
  private dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
  private font = "16px sans-serif";

  constructor(
    private staticCanvas: HTMLCanvasElement,
    private dynamicCanvas: HTMLCanvasElement,
    private scene: SceneStore
  ) {
    this.scheduler = new FrameScheduler((dirty) => this.drawFrame(dirty));
    // data changes can move row heights, which both layers draw from
    this.unsubscribeScene = scene.subscribe(() => this.invalidate("all"));
    this.unwatchDpr = watchDpr((dpr) => {
      this.dpr = dpr;
      this.resizeCanvases();
      this.invalidate("all");
      this.scheduler.flush(); // repaint in-frame; see setView's resize branch
    });
  }

  getView(): RendererView {
    return this.view;
  }

  /** the link edge markers as last drawn, in viewport px */
  getLinkMarkers(): LinkMarker[] {
    return this.linkMarkers;
  }

  setView(partial: Partial<RendererView>) {
    const sizeChanged =
      (partial.width !== undefined && partial.width !== this.view.width) ||
      (partial.height !== undefined && partial.height !== this.view.height);
    this.view = { ...this.view, ...partial };
    if (sizeChanged) {
      // Setting canvas.width/height clears both backing stores. setView is
      // usually called from a ResizeObserver/effect that fires AFTER this
      // frame's rAF redraw, so a deferred (scheduled) redraw would leave the
      // canvas blank until the next frame — a one-frame flash of every event
      // (seen e.g. when a row re-stacks and the viewport height changes).
      // Repaint synchronously so the clear and the redraw land in the same
      // frame.
      this.resizeCanvases();
      this.invalidate("all");
      this.scheduler.flush();
      return;
    }
    // scroll/pan/zoom move both layers; scrollTop alone still shifts the grid
    this.invalidate("all");
  }

  invalidate(layer: Layer | "all") {
    this.scheduler.invalidate(layer);
  }

  /** Force a synchronous draw of anything pending (tests, screenshots). */
  flush() {
    this.scheduler.flush();
  }

  dispose() {
    this.scheduler.dispose();
    this.unsubscribeScene();
    this.unwatchDpr();
  }

  private resizeCanvases() {
    sizeCanvas(this.staticCanvas, this.view.width, this.view.height, this.dpr);
    sizeCanvas(this.dynamicCanvas, this.view.width, this.view.height, this.dpr);
    if (typeof getComputedStyle === "function") {
      this.font = getComputedStyle(this.dynamicCanvas).font || this.font;
    }
  }

  private drawGrid(ctx: CanvasRenderingContext2D, tick: number) {
    const { width, height, windowTime, timeBar, theme } = this.view;
    if (timeBar?.auto) {
      const [windowStart, windowEnd] = windowTime;
      const { bottomRow } = resolveTimeBar(timeBar, windowStart, windowEnd, tick);
      drawBlockGridLines(ctx, {
        width,
        height,
        blocks: generateUnitBlocks({ ...bottomRow, windowStart, windowEnd, tick }),
        color: theme.gridColor,
      });
      return;
    }
    drawGridLines(ctx, {
      width,
      height,
      cellWidth: this.view.cellWidth,
      windowStart: windowTime[0],
      tick,
      color: theme.gridColor,
    });
  }

  private drawFrame(dirty: LayerDirty) {
    if (this.view.tick === null) return;
    this.animator.beginFrame(performance.now());
    if (dirty.static) {
      const ctx = this.staticCanvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, this.view.width, this.view.height);
        // recessed-group tint/shadow first, so grid lines + dividers stay crisp
        // on top of it
        drawGroupShading(ctx, this.view, this.scene);
        this.drawGrid(ctx, this.view.tick);
        drawRowDividers(ctx, this.view, this.scene);
      }
    }
    if (dirty.dynamic) {
      const ctx = this.dynamicCanvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, this.view.width, this.view.height);
        drawEvents(ctx, this.view, this.scene, this.font, this.animator, () => {
          this.linkMarkers = drawLinks(ctx, this.view, this.scene, this.font);
        });
      }
    }
    // layout tweens in progress -> keep the frame loop running
    if (this.animator.isAnimating()) {
      this.scheduler.invalidate("all");
    }
  }
}
