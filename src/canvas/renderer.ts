import { SceneStore } from "../core/scene";
import { DrawEventFn, ResolvedTheme } from "../types";
import { FrameScheduler, Layer, LayerDirty } from "./frame-scheduler";
import { sizeCanvas, watchDpr } from "./dpr";
import { drawGridLines } from "./draw-grid";
import { drawEvents, drawRowDividers } from "./draw-events";
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
  // interaction state
  hoveredEventId: string | null;
  draggedEventId: string | null;
  resizePreview: ResizePreview | null;
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
    hoveredEventId: null,
    draggedEventId: null,
    resizePreview: null,
  };
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
    });
  }

  getView(): RendererView {
    return this.view;
  }

  setView(partial: Partial<RendererView>) {
    const sizeChanged =
      (partial.width !== undefined && partial.width !== this.view.width) ||
      (partial.height !== undefined && partial.height !== this.view.height);
    this.view = { ...this.view, ...partial };
    if (sizeChanged) {
      this.resizeCanvases();
      this.invalidate("all");
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

  private drawFrame(dirty: LayerDirty) {
    if (this.view.tick === null) return;
    this.animator.beginFrame(performance.now());
    if (dirty.static) {
      const ctx = this.staticCanvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, this.view.width, this.view.height);
        drawGridLines(ctx, {
          width: this.view.width,
          height: this.view.height,
          cellWidth: this.view.cellWidth,
          windowStart: this.view.windowTime[0],
          tick: this.view.tick,
          color: this.view.theme.gridColor,
        });
        drawRowDividers(ctx, this.view, this.scene, this.animator);
      }
    }
    if (dirty.dynamic) {
      const ctx = this.dynamicCanvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, this.view.width, this.view.height);
        drawEvents(ctx, this.view, this.scene, this.font, this.animator);
      }
    }
    // layout tweens in progress -> keep the frame loop running
    if (this.animator.isAnimating()) {
      this.scheduler.invalidate("all");
    }
  }
}
