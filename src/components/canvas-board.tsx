import React, {
  forwardRef,
  useCallback,
  useEffect,
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
  panZoom?: PanZoomConfig;
  animations: { layoutMs: number; fadeMs: number };
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
      panZoom,
      animations,
    },
    contentRef
  ) => {
    const staticCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const dynamicCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const ghostRef = useRef<HTMLDivElement | null>(null);

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
      });
    }, [
      windowTime,
      tick,
      cellWidth,
      theme,
      drawEvent,
      eventsResize,
      animations,
      rendererRef,
    ]);

    // viewport size (content column width x body height)
    useEffect(() => {
      const column =
        contentRef && "current" in contentRef ? contentRef.current : null;
      const body = bodyRef.current;
      if (!column || !body) return;
      const measure = () => {
        // Clamp to the window: if the consumer didn't bound the timeline's
        // height the body grows to its content, and a content-sized canvas
        // would blow past browser canvas limits on large boards.
        const height = Math.min(body.clientHeight, window.innerHeight);
        setViewportHeight(height);
        rendererRef.current?.setView({
          width: column.getBoundingClientRect().width,
          height,
        });
      };
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(column);
      observer.observe(body);
      return () => observer.disconnect();
    }, [bodyRef, contentRef, rendererRef]);

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
    });

    const { offsetOf, totalHeight } = scene.getRowOffsets(
      windowTime[0],
      windowTime[1]
    );

    // virtualized rows header: only headers intersecting the viewport
    const visibleHeaders: JSX.Element[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const top = offsetOf.get(row.id) as number;
      const height = scene.getRowHeight(row.id, windowTime[0], windowTime[1]);
      if (top + height < scrollTop) continue;
      if (top > scrollTop + viewportHeight) break;
      visibleHeaders.push(
        <div
          key={`row_header_${row.id}`}
          className="row-header canvas-row-header"
          style={{
            top,
            height,
            borderBottom:
              i === rows.length - 1 ? "none" : "1px solid yellow",
            // keeps the DOM header in step with the canvas layout tween
            transition:
              animations.layoutMs > 0
                ? `top ${animations.layoutMs}ms ease-in-out, height ${animations.layoutMs}ms ease-in-out`
                : "none",
          }}
        >
          {row.name}
        </div>
      );
    }

    const headerClassNames = rowsHeaderClassName
      ? `rows-header-wrapper canvas-rows-header ${rowsHeaderClassName}`
      : "rows-header-wrapper canvas-rows-header";

    return (
      <>
        <div className={headerClassNames} style={{ height: totalHeight }}>
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
