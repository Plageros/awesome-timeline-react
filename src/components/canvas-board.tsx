import React, {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  DrawEventFn,
  EventPromptActionsType,
  OnDropProps,
  OnEventClickProps,
  OnEventHoverProps,
  OnResizeProps,
  PanZoomConfig,
  ResolvedTheme,
  RowType,
} from "../types";
import { SceneStore } from "../core/scene";
import { TimelineRenderer } from "../canvas/renderer";
import useCanvasInteractions from "../hooks/use-canvas-interactions";
import "./style.css";

type CanvasBoardProps = {
  scene: SceneStore;
  rows: RowType[];
  windowTime: number[];
  tick: number | null;
  cellWidth: number;
  theme: ResolvedTheme;
  drawEvent?: DrawEventFn;
  bodyRef: React.MutableRefObject<HTMLDivElement | null>;
  rendererRef: React.MutableRefObject<TimelineRenderer | null>;
  eventPromptRef: React.MutableRefObject<EventPromptActionsType | null>;
  rowsHeaderClassName?: string;
  setWindowTime: React.Dispatch<React.SetStateAction<number[]>>;
  setCellWidth: React.Dispatch<React.SetStateAction<number>>;
  setTick: React.Dispatch<React.SetStateAction<number | null>>;
  onDrop?: (props: OnDropProps) => void;
  onResize?: (props: OnResizeProps) => void;
  onEventClick?: (props: OnEventClickProps) => void;
  onEventHover?: (props: OnEventHoverProps) => void;
  eventsResize: boolean;
  stripeOverlap: boolean;
  panZoom?: PanZoomConfig;
  animations: { layoutMs: number; fadeMs: number };
  selectable: boolean;
  applySelection: (eventIds: string[]) => void;
  getSelection: () => string[];
};

/**
 * Canvas board: two viewport-sized canvases (grid + events) kept fixed
 * inside the scrolling body via position:sticky, with a tall spacer div
 * providing the native scrollbar. Drawing is translated by scrollTop, so the
 * canvas never exceeds browser size limits regardless of row count.
 *
 * The forwarded ref targets the content column — the element timeline.tsx
 * measures for tick/cellWidth.
 */
const CanvasBoard = forwardRef<HTMLDivElement, CanvasBoardProps>(
  (
    {
      scene,
      rows,
      windowTime,
      tick,
      cellWidth,
      theme,
      drawEvent,
      bodyRef,
      rendererRef,
      eventPromptRef,
      rowsHeaderClassName,
      setWindowTime,
      setCellWidth,
      setTick,
      onDrop,
      onResize,
      onEventClick,
      onEventHover,
      eventsResize,
      stripeOverlap,
      panZoom,
      animations,
      selectable,
      applySelection,
      getSelection,
    },
    contentRef
  ) => {
    const staticCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const dynamicCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const ghostRef = useRef<HTMLDivElement | null>(null);
    const headerWrapperRef = useRef<HTMLDivElement | null>(null);
    // Latest content height, read by measureViewport (which is defined before
    // totalHeight is computed). Assigned during render below.
    const totalHeightRef = useRef(0);

    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);

    // renderer lifecycle
    useEffect(() => {
      if (!staticCanvasRef.current || !dynamicCanvasRef.current) return;
      const renderer = new TimelineRenderer(
        staticCanvasRef.current,
        dynamicCanvasRef.current,
        scene
      );
      rendererRef.current = renderer;
      return () => {
        renderer.dispose();
        rendererRef.current = null;
      };
    }, [scene, rendererRef]);

    // view-state -> renderer
    useEffect(() => {
      rendererRef.current?.animator.setDurations(
        animations.layoutMs,
        animations.fadeMs
      );
      rendererRef.current?.setView({
        windowTime: [windowTime[0], windowTime[1]],
        tick,
        cellWidth,
        theme,
        drawEvent,
        eventsResize,
        stripeOverlap,
      });
    }, [
      windowTime,
      tick,
      cellWidth,
      theme,
      drawEvent,
      eventsResize,
      stripeOverlap,
      animations,
      rendererRef,
    ]);

    // viewport size (content column width x body height)
    const measureViewport = useCallback(() => {
      const column =
        contentRef && "current" in contentRef ? contentRef.current : null;
      const body = bodyRef.current;
      if (!column || !body) return;
      // Clamp the viewport-sized canvas to:
      //  - window.innerHeight: a content-sized board (unbounded host) would
      //    otherwise blow past browser canvas limits on large boards;
      //  - totalHeight (content): body.clientHeight is inflated by the
      //    absolutely-positioned canvas itself, so deriving the canvas height
      //    purely from it feeds back on itself and sticks at a stale value
      //    after the content shrinks (canvas taller than the column). The
      //    content height is the clean upper bound.
      const cap = totalHeightRef.current > 0 ? totalHeightRef.current : Infinity;
      const height = Math.min(body.clientHeight, cap, window.innerHeight);
      setViewportHeight(height);
      rendererRef.current?.setView({
        width: column.getBoundingClientRect().width,
        height,
      });
    }, [bodyRef, contentRef, rendererRef]);

    useEffect(() => {
      const column =
        contentRef && "current" in contentRef ? contentRef.current : null;
      const body = bodyRef.current;
      if (!column || !body) return;
      measureViewport();
      const observer = new ResizeObserver(measureViewport);
      observer.observe(column);
      observer.observe(body);
      return () => observer.disconnect();
    }, [bodyRef, contentRef, measureViewport]);

    // scroll: renderer gets it imperatively, React only re-renders the
    // virtualized header list
    useEffect(() => {
      const body = bodyRef.current;
      if (!body) return;
      const handleScroll = () => {
        rendererRef.current?.setView({ scrollTop: body.scrollTop });
        setScrollTop(body.scrollTop);
      };
      body.addEventListener("scroll", handleScroll, { passive: true });
      return () => body.removeEventListener("scroll", handleScroll);
    }, [bodyRef, rendererRef]);

    // re-render header/spacer when scene data changes row heights
    useSyncExternalStore(
      useCallback((listener) => scene.subscribe(listener), [scene]),
      () => scene.version
    );

    // Measure how tall each row's label is when wrapped at the header width and
    // feed it into the scene as a per-row minimum height. A long label thus
    // grows its row (and the matching canvas dividers) instead of overflowing.
    // All rows are measured — not just the visible ones — so scrolling doesn't
    // jump as off-screen labels are discovered. Measurement uses one reused
    // off-screen node styled like the real label so fonts/wrapping match.
    useLayoutEffect(() => {
      const wrapper = headerWrapperRef.current;
      if (!wrapper) return;

      const measurer = document.createElement("div");
      measurer.className = "row-header-label";
      measurer.setAttribute("aria-hidden", "true");
      measurer.style.position = "absolute";
      measurer.style.left = "-9999px";
      measurer.style.top = "0";
      measurer.style.visibility = "hidden";
      measurer.style.height = "auto";
      wrapper.appendChild(measurer);

      let lastWidth = -1;
      const measure = () => {
        const width = wrapper.clientWidth;
        // ResizeObserver also fires when the wrapper grows in height (our own
        // height changes feed back here); only re-measure when the wrapping
        // width actually changed, otherwise the result is identical.
        if (width === 0 || width === lastWidth) return;
        lastWidth = width;
        measurer.style.width = `${width}px`;
        const heights = new Map<string, number>();
        for (const row of rows) {
          measurer.textContent = row.name ?? "";
          heights.set(
            row.id,
            Math.ceil(measurer.offsetHeight) + 2 * theme.rowPaddingY
          );
        }
        scene.setLabelMinHeights(heights);
      };
      measure();

      const observer = new ResizeObserver(measure);
      observer.observe(wrapper);
      return () => {
        observer.disconnect();
        wrapper.removeChild(measurer);
      };
    }, [rows, scene, theme.rowPaddingY, rowsHeaderClassName]);

    const {
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
      handlePointerLeave,
      handlePointerCancel,
      handleAuxClick,
    } = useCanvasInteractions({
      scene,
      rendererRef,
      dynamicCanvasRef,
      bodyRef,
      ghostRef,
      eventPromptRef,
      setWindowTime,
      setCellWidth,
      setTick,
      onDrop,
      onResize,
      onEventClick,
      onEventHover,
      eventsResize,
      panZoom,
      selectable,
      applySelection,
      getSelection,
    });

    // Seed the renderer with the current selection (e.g. defaultSelectedEventIds)
    // once it exists. Later changes flow through applySelection directly.
    useEffect(() => {
      rendererRef.current?.setView({
        selectedEventIds: new Set(getSelection()),
      });
    }, [getSelection, rendererRef]);

    const { offsetOf, totalHeight } = scene.getRowOffsets(
      windowTime[0],
      windowTime[1]
    );
    totalHeightRef.current = totalHeight;

    // Keep the canvas height locked to the content in the SAME commit the DOM
    // (header panel + scroll spacer) resizes in. The ResizeObserver above is
    // async, so on its own the canvas lags a frame behind a row re-stack — the
    // canvas/timeline momentarily taller than the header panel, leaving empty
    // space and a transient scrollbar. Re-measure synchronously, before paint.
    useLayoutEffect(() => {
      measureViewport();
    }, [totalHeight, measureViewport]);

    // last child row id per parent (in `rows` order) — drives the └─ vs ├─
    // connector shape so the tree spine stops at the final child.
    const lastChildOf = new Map<string, string>();
    for (const row of rows) {
      if (row.parentId !== undefined) lastChildOf.set(row.parentId, row.id);
    }
    // the rows header has a dark background, so the connector uses the (light)
    // grid/divider color rather than the dark group-shadow color
    const connectorColor = theme.gridColor;
    const SPINE_X = 11; // px from the left edge of the header

    // virtualized rows header: only headers intersecting the viewport. Rows
    // hidden inside a collapsed parent are skipped entirely (and aren't in
    // offsetOf, which now walks the visible rows). Parent rows get a collapse
    // caret; child rows show a tree connector linking them to their parent.
    const visibleHeaders: JSX.Element[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (scene.isRowHidden(row.id)) continue;
      const top = offsetOf.get(row.id);
      if (top === undefined) continue;
      const height = scene.getRowHeight(row.id, windowTime[0], windowTime[1]);
      if (top + height < scrollTop) continue;
      if (top > scrollTop + viewportHeight) break;
      const isParent = scene.isRowParent(row.id);
      const parentId = row.parentId;
      const isChild = parentId !== undefined;
      const isLastChild =
        parentId !== undefined && lastChildOf.get(parentId) === row.id;
      const collapsed = scene.isRowCollapsed(row.id);
      const grouped = isParent || isChild;
      visibleHeaders.push(
        <div
          key={`row_header_${row.id}`}
          className="row-header canvas-row-header"
          style={{
            top,
            height,
            borderBottom:
              i === rows.length - 1 ? "none" : "1px solid yellow",
            // Row heights/positions apply instantly (no layout tween) so the
            // header snaps in lockstep with its canvas row — see draw-events.
            // Grouped rows left-align so the caret + tree spine line up; plain
            // rows keep the centered default.
            justifyContent: grouped ? "flex-start" : undefined,
            paddingLeft: isChild ? 24 : isParent ? 6 : undefined,
          }}
        >
          {isChild && (
            // tree connector: a vertical spine + a horizontal tick at the row's
            // vertical center. The spine runs the full height for a mid child
            // (├─) and stops at the center for the last child (└─), so stacked
            // children form one continuous spine descending from the parent.
            <>
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: SPINE_X,
                  top: 0,
                  width: 1,
                  height: isLastChild ? "50%" : "100%",
                  backgroundColor: connectorColor,
                  pointerEvents: "none",
                }}
              />
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: SPINE_X,
                  top: "50%",
                  width: 9,
                  height: 1,
                  backgroundColor: connectorColor,
                  pointerEvents: "none",
                }}
              />
            </>
          )}
          {isParent && (
            <span
              className="row-header-caret"
              role="button"
              aria-label={collapsed ? "Expand group" : "Collapse group"}
              onClick={() => scene.toggleCollapsed(row.id)}
              style={{ cursor: "pointer", marginRight: 4, userSelect: "none" }}
            >
              {collapsed ? "▸" : "▾"}
            </span>
          )}
          <span
            className="row-header-label"
            style={grouped ? { textAlign: "left" } : undefined}
          >
            {row.name}
          </span>
        </div>
      );
    }

    const headerClassNames = rowsHeaderClassName
      ? `rows-header-wrapper canvas-rows-header ${rowsHeaderClassName}`
      : "rows-header-wrapper canvas-rows-header";

    return (
      <>
        <div
          ref={headerWrapperRef}
          className={headerClassNames}
          style={{ height: totalHeight }}
        >
          {visibleHeaders}
        </div>
        <div className="canvas-content-column" ref={contentRef}>
          <div className="canvas-sticky">
            <canvas ref={staticCanvasRef}></canvas>
            <canvas
              ref={dynamicCanvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerLeave}
              onPointerCancel={handlePointerCancel}
              onAuxClick={handleAuxClick}
            ></canvas>
            <div
              ref={ghostRef}
              className="event canvas-drag-ghost"
              style={{ height: scene.getGeometry().barHeight }}
            ></div>
          </div>
          <div
            className="canvas-scroll-spacer"
            style={{ height: totalHeight }}
          ></div>
        </div>
      </>
    );
  }
);

export default CanvasBoard;
