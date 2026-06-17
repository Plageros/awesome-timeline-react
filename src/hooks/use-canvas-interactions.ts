import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  EventPromptActionsType,
  EventType,
  OnDropProps,
  OnEventClickProps,
  OnEventHoverProps,
  OnResizeProps,
  PanZoomConfig,
} from "../types";
import { SceneStore } from "../core/scene";
import { TimelineRenderer } from "../canvas/renderer";
import { hitTest, HitTarget } from "../core/hit-test";
import {
  canResizeEvent,
  computeDropTimes,
  computeResizeTimes,
  computeZoom,
  stepCellWidth,
  ZoomLimits,
} from "../core/interactions";

const DRAG_THRESHOLD_PX = 3;
const RESIZE_HOT_ZONE_PX = 8; // matches the legacy .event-resize handle width
const DRAG_ZOOM_PX_PER_DOUBLING = 300; // drag this many px to halve/double the span

/** Window/tick/cellWidth captured at the start of a continuous zoom gesture,
 *  so pinch/drag scale relative to the start rather than compounding. */
type ZoomBase = {
  windowTime: [number, number];
  tick: number;
  cellWidth: number;
};

type InteractionState =
  | { mode: "idle" }
  | { mode: "pan"; lastClientX: number; lastClientY: number; touch: boolean }
  | {
      mode: "drag";
      hit: HitTarget;
      startClientX: number;
      startClientY: number;
      active: boolean; // becomes true past DRAG_THRESHOLD_PX
    }
  | {
      mode: "resize";
      event: EventType;
      direction: "left" | "right";
      startClientX: number;
      deltaPx: number;
    }
  | {
      mode: "zoom"; // ctrl/cmd + background drag
      startClientX: number;
      anchorX: number;
      contentWidth: number;
      snapshot: ZoomBase;
    }
  | {
      mode: "pinch"; // two-finger touch
      startDist: number;
      anchorX: number;
      contentWidth: number;
      snapshot: ZoomBase;
    };

type UseCanvasInteractionsArgs = {
  scene: SceneStore;
  rendererRef: React.MutableRefObject<TimelineRenderer | null>;
  dynamicCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  bodyRef: React.MutableRefObject<HTMLDivElement | null>;
  ghostRef: React.MutableRefObject<HTMLDivElement | null>;
  eventPromptRef: React.MutableRefObject<EventPromptActionsType | null>;
  setWindowTime: React.Dispatch<React.SetStateAction<number[]>>;
  setCellWidth: React.Dispatch<React.SetStateAction<number>>;
  setTick: React.Dispatch<React.SetStateAction<number | null>>;
  onDrop?: (props: OnDropProps) => void;
  onResize?: (props: OnResizeProps) => void;
  onEventClick?: (props: OnEventClickProps) => void;
  onEventHover?: (props: OnEventHoverProps) => void;
  eventsResize: boolean;
  panZoom?: PanZoomConfig;
};

const lockCursor = (cursor: string) => {
  const style = document.createElement("style");
  style.id = "lock-cursor";
  style.innerHTML = `* { cursor: ${cursor} !important; }`;
  document.head.appendChild(style);
};

const unlockCursor = () => {
  document.getElementById("lock-cursor")?.remove();
};

/**
 * Pointer-event state machine for the canvas board: pan the time window,
 * drag events between rows/times (DOM ghost preview), resize event edges,
 * change grid granularity (middle-click mode or ctrl+wheel). Event mutations
 * are applied straight to the SceneStore — no React state on the hot path.
 */
const useCanvasInteractions = ({
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
}: UseCanvasInteractionsArgs) => {
  const stateRef = useRef<InteractionState>({ mode: "idle" });
  const changeGridRef = useRef(false);
  const panFrameRef = useRef<number | null>(null);
  const panPendingDxRef = useRef(0);
  const hoveredRef = useRef<HitTarget | null>(null);
  // active pointers, for two-finger pinch detection
  const pointersRef = useRef(new Map<number, { x: number; y: number; touch: boolean }>());
  const zoomFrameRef = useRef<number | null>(null);
  const zoomPendingRef = useRef<{ anchorX: number; factor: number } | null>(null);

  const config = useMemo(
    () => ({
      panOnDragBackground: panZoom?.panOnDragBackground ?? true,
      ctrlWheelZoom: panZoom?.ctrlWheelZoom ?? true,
      pinchZoom: panZoom?.pinchZoom ?? true,
      dragZoom: panZoom?.dragZoom ?? true,
      zoomWheelFactor: panZoom?.zoomWheelFactor ?? 1.15,
      middleClickGranularity: panZoom?.middleClickGranularity ?? true,
      zoomStepSeconds: panZoom?.zoomStepSeconds ?? 900,
    }),
    [panZoom]
  );

  const limits: ZoomLimits = useMemo(
    () => ({
      minWindowSeconds: panZoom?.minWindowSeconds ?? 900,
      maxWindowSeconds: panZoom?.maxWindowSeconds ?? 30 * 24 * 3600,
    }),
    [panZoom]
  );

  // Apply a zoom by `factor` around `anchorX` (px from canvas left), scaling
  // from `base`. Pushes the result both to the renderer (immediate, so a
  // following wheel notch reads the new window) and to React state (time bar /
  // RT indicator / header virtualization).
  const applyZoom = useCallback(
    (base: ZoomBase, anchorX: number, factor: number, contentWidth: number) => {
      if (contentWidth <= 0) return;
      const next = computeZoom(
        base.windowTime,
        base.tick,
        base.cellWidth,
        anchorX,
        factor,
        contentWidth,
        limits
      );
      rendererRef.current?.setView({
        windowTime: next.windowTime,
        tick: next.tick,
        cellWidth: next.cellWidth,
      });
      setWindowTime(next.windowTime);
      setTick(next.tick);
      setCellWidth(next.cellWidth);
    },
    [rendererRef, setWindowTime, setTick, setCellWidth, limits]
  );

  // Continuous gestures (pinch/drag) coalesce to one apply per frame, scaling
  // from the gesture-start snapshot so they never compound.
  const scheduleContinuousZoom = useCallback(() => {
    if (zoomFrameRef.current !== null) return;
    zoomFrameRef.current = requestAnimationFrame(() => {
      zoomFrameRef.current = null;
      const pending = zoomPendingRef.current;
      const state = stateRef.current;
      if (!pending || (state.mode !== "pinch" && state.mode !== "zoom")) return;
      applyZoom(state.snapshot, pending.anchorX, pending.factor, state.contentWidth);
    });
  }, [applyZoom]);

  const snapshotView = useCallback((): { base: ZoomBase; contentWidth: number } | null => {
    const renderer = rendererRef.current;
    const canvas = dynamicCanvasRef.current;
    if (!renderer || !canvas) return null;
    const view = renderer.getView();
    if (view.tick === null) return null;
    return {
      base: {
        windowTime: [view.windowTime[0], view.windowTime[1]],
        tick: view.tick,
        cellWidth: view.cellWidth,
      },
      contentWidth: canvas.getBoundingClientRect().width,
    };
  }, [rendererRef, dynamicCanvasRef]);

  const hidePrompt = useCallback(() => {
    eventPromptRef.current?.hide();
  }, [eventPromptRef]);

  const currentHit = useCallback(
    (clientX: number, clientY: number): HitTarget | null => {
      const canvas = dynamicCanvasRef.current;
      const renderer = rendererRef.current;
      if (!canvas || !renderer) return null;
      const view = renderer.getView();
      if (view.tick === null) return null;
      const rect = canvas.getBoundingClientRect();
      return hitTest(
        scene,
        {
          windowStart: view.windowTime[0],
          windowEnd: view.windowTime[1],
          tick: view.tick,
          scrollTop: view.scrollTop,
        },
        clientX - rect.left,
        clientY - rect.top
      );
    },
    [scene, dynamicCanvasRef, rendererRef]
  );

  const resizeDirectionAt = useCallback(
    (hit: HitTarget, clientX: number): "left" | "right" | null => {
      if (hit.kind !== "event" || !canResizeEvent(hit.event, eventsResize)) {
        return null;
      }
      const canvas = dynamicCanvasRef.current;
      if (!canvas) return null;
      const x = clientX - canvas.getBoundingClientRect().left;
      const zone = Math.min(RESIZE_HOT_ZONE_PX, hit.rect.width / 3);
      if (x <= hit.rect.x + zone) return "left";
      if (x >= hit.rect.x + hit.rect.width - zone) return "right";
      return null;
    },
    [dynamicCanvasRef, eventsResize]
  );

  // pan applies at most once per frame regardless of pointermove rate
  const schedulePan = useCallback(() => {
    if (panFrameRef.current !== null) return;
    panFrameRef.current = requestAnimationFrame(() => {
      panFrameRef.current = null;
      const renderer = rendererRef.current;
      const dx = panPendingDxRef.current;
      panPendingDxRef.current = 0;
      const tick = renderer?.getView().tick;
      if (!tick || dx === 0) return;
      const dt = Math.round(dx * tick);
      if (dt === 0) {
        panPendingDxRef.current = dx; // accumulate sub-second moves
        return;
      }
      setWindowTime((prev) => [prev[0] - dt, prev[1] - dt]);
    });
  }, [rendererRef, setWindowTime]);

  const updateGhost = useCallback(
    (
      state: Extract<InteractionState, { mode: "drag" }>,
      clientX: number,
      clientY: number
    ) => {
      const ghost = ghostRef.current;
      if (!ghost) return;
      const rawLeft = state.hit.rect.x + (clientX - state.startClientX);
      const rawTop = state.hit.rect.y + (clientY - state.startClientY);
      // Clamp the preview pill to the visible viewport. It's absolutely
      // positioned inside the scrolling body, so letting it run past the edge
      // (dragging left/up or below/right of the visible range) would inflate
      // the scroll area and flash scrollbars. The drop still uses the real
      // pointer position, so only the preview stops at the edge.
      const view = rendererRef.current?.getView();
      const ghostWidth = state.hit.rect.width;
      const ghostHeight = state.hit.rect.height;
      const left = view
        ? Math.max(0, Math.min(rawLeft, Math.max(0, view.width - ghostWidth)))
        : rawLeft;
      const top = view
        ? Math.max(0, Math.min(rawTop, Math.max(0, view.height - ghostHeight)))
        : rawTop;
      ghost.style.display = "flex";
      ghost.style.left = `${left}px`;
      ghost.style.top = `${top}px`;
      ghost.style.width = `${ghostWidth}px`;
    },
    [ghostRef, rendererRef]
  );

  // The ghost is a DOM pill, so it can't run a custom canvas drawEvent — but it
  // should at least inherit the picked event's resolved style + label so a
  // themed event doesn't drag as the default white pill.
  const styleGhost = useCallback(
    (event: EventType) => {
      const ghost = ghostRef.current;
      const theme = rendererRef.current?.getView().theme;
      if (!ghost || !theme) return;
      const style = event.props?.style;
      ghost.style.backgroundColor = style?.fill ?? theme.eventFill;
      ghost.style.border = `${style?.strokeWidth ?? 1}px solid ${
        style?.stroke ?? theme.eventStroke
      }`;
      ghost.style.borderRadius = `${style?.borderRadius ?? theme.barRadius}px`;
      ghost.style.color = style?.textColor ?? theme.eventTextColor;
      ghost.style.font = style?.font ?? theme.font ?? "";
      ghost.style.justifyContent = "flex-start";
      ghost.style.alignItems = "center";
      ghost.style.paddingInline = "13px"; // matches the canvas EVENT_TEXT_INSET
      ghost.style.overflow = "hidden";
      ghost.style.whiteSpace = "nowrap";
      ghost.textContent = event.props?.label ?? "";
    },
    [ghostRef, rendererRef]
  );

  const handlePointerDown = useCallback(
    (pointerEvent: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = dynamicCanvasRef.current;
      if (!canvas) return;
      const isTouch = pointerEvent.pointerType === "touch";
      pointersRef.current.set(pointerEvent.pointerId, {
        x: pointerEvent.clientX,
        y: pointerEvent.clientY,
        touch: isTouch,
      });

      // second touch finger -> pinch zoom (cancels any single-finger gesture)
      if (config.pinchZoom && isTouch && pointersRef.current.size === 2) {
        const snap = snapshotView();
        if (snap) {
          if (ghostRef.current) ghostRef.current.style.display = "none";
          rendererRef.current?.setView({ draggedEventId: null });
          const pts = [...pointersRef.current.values()];
          const startDist =
            Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
          const rect = canvas.getBoundingClientRect();
          stateRef.current = {
            mode: "pinch",
            startDist,
            anchorX: (pts[0].x + pts[1].x) / 2 - rect.left,
            contentWidth: snap.contentWidth,
            snapshot: snap.base,
          };
          canvas.setPointerCapture(pointerEvent.pointerId);
          hidePrompt();
        }
        return;
      }

      if (pointerEvent.button !== 0) return;
      const hit = currentHit(pointerEvent.clientX, pointerEvent.clientY);

      if (hit?.kind === "event" && !hit.event.props?.isLocked) {
        const direction = resizeDirectionAt(hit, pointerEvent.clientX);
        if (direction) {
          stateRef.current = {
            mode: "resize",
            event: hit.event,
            direction,
            startClientX: pointerEvent.clientX,
            deltaPx: 0,
          };
          lockCursor("e-resize");
        } else {
          stateRef.current = {
            mode: "drag",
            hit,
            startClientX: pointerEvent.clientX,
            startClientY: pointerEvent.clientY,
            active: false,
          };
          styleGhost(hit.event);
        }
      } else if (
        config.dragZoom &&
        (pointerEvent.ctrlKey || pointerEvent.metaKey) &&
        !isTouch
      ) {
        // ctrl/cmd + background drag -> time-frame zoom (anchored at press)
        const snap = snapshotView();
        if (!snap) return;
        const rect = canvas.getBoundingClientRect();
        stateRef.current = {
          mode: "zoom",
          startClientX: pointerEvent.clientX,
          anchorX: pointerEvent.clientX - rect.left,
          contentWidth: snap.contentWidth,
          snapshot: snap.base,
        };
      } else if (config.panOnDragBackground) {
        stateRef.current = {
          mode: "pan",
          lastClientX: pointerEvent.clientX,
          lastClientY: pointerEvent.clientY,
          touch: isTouch,
        };
        canvas.style.cursor = "grabbing";
      } else {
        return;
      }
      hidePrompt();
      canvas.setPointerCapture(pointerEvent.pointerId);
    },
    [
      currentHit,
      resizeDirectionAt,
      dynamicCanvasRef,
      hidePrompt,
      config,
      snapshotView,
      ghostRef,
      rendererRef,
      styleGhost,
    ]
  );

  const handleHover = useCallback(
    (pointerEvent: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = dynamicCanvasRef.current;
      if (!canvas) return;
      const hit = currentHit(pointerEvent.clientX, pointerEvent.clientY);
      const prevHovered = hoveredRef.current;
      hoveredRef.current = hit;

      if (hit?.kind === "event") {
        if (hit.event.props?.isLocked) {
          canvas.style.cursor = "not-allowed";
        } else if (resizeDirectionAt(hit, pointerEvent.clientX)) {
          canvas.style.cursor = "e-resize";
        } else {
          canvas.style.cursor = "pointer";
        }
      } else {
        canvas.style.cursor = "grab";
      }

      const hoveredId = hit?.kind === "event" ? hit.event.id : null;
      const prevId = prevHovered?.kind === "event" ? prevHovered.event.id : null;
      if (hoveredId !== prevId) {
        rendererRef.current?.setView({ hoveredEventId: hoveredId });
        if (onEventHover) {
          onEventHover({
            eventId: hoveredId,
            rowId: hoveredId !== null && hit ? hit.rowId : null,
          });
        }
      }

      const prompt = eventPromptRef.current;
      if (!prompt) return;
      if (
        hit?.kind === "event" &&
        (hit.event.props?.showPrompt ||
          hit.event.props?.showPrompt === undefined)
      ) {
        if (prevId !== hit.event.id) {
          const canvasRect = canvas.getBoundingClientRect();
          // anchor in viewport coordinates; floating-ui handles flip/shift
          prompt.show(hit.event, {
            x: canvasRect.left + hit.rect.x,
            y: canvasRect.top + hit.rect.y,
            width: hit.rect.width,
            height: hit.rect.height,
          });
        }
      } else {
        prompt.hide();
      }
    },
    [
      currentHit,
      resizeDirectionAt,
      dynamicCanvasRef,
      eventPromptRef,
      rendererRef,
      onEventHover,
    ]
  );

  const handlePointerMove = useCallback(
    (pointerEvent: React.PointerEvent<HTMLCanvasElement>) => {
      const tracked = pointersRef.current.get(pointerEvent.pointerId);
      if (tracked) {
        tracked.x = pointerEvent.clientX;
        tracked.y = pointerEvent.clientY;
      }

      const state = stateRef.current;
      if (state.mode === "idle") {
        handleHover(pointerEvent);
        return;
      }
      if (state.mode === "pinch") {
        const pts = [...pointersRef.current.values()];
        if (pts.length < 2) return;
        const dist =
          Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
        zoomPendingRef.current = {
          anchorX: state.anchorX,
          factor: state.startDist / dist, // fingers apart -> factor<1 -> zoom in
        };
        scheduleContinuousZoom();
        return;
      }
      if (state.mode === "zoom") {
        const dx = pointerEvent.clientX - state.startClientX;
        zoomPendingRef.current = {
          anchorX: state.anchorX,
          factor: Math.pow(2, -dx / DRAG_ZOOM_PX_PER_DOUBLING), // right -> zoom in
        };
        scheduleContinuousZoom();
        return;
      }
      if (state.mode === "pan") {
        panPendingDxRef.current += pointerEvent.clientX - state.lastClientX;
        // touch has no wheel for vertical scroll, so single-finger drag also
        // scrolls rows (canvas touch-action is none, so we drive it manually)
        if (state.touch && bodyRef.current) {
          bodyRef.current.scrollTop -= pointerEvent.clientY - state.lastClientY;
        }
        state.lastClientX = pointerEvent.clientX;
        state.lastClientY = pointerEvent.clientY;
        schedulePan();
        return;
      }
      if (state.mode === "drag") {
        if (
          !state.active &&
          Math.abs(pointerEvent.clientX - state.startClientX) +
            Math.abs(pointerEvent.clientY - state.startClientY) >
            DRAG_THRESHOLD_PX
        ) {
          state.active = true;
          rendererRef.current?.setView({ draggedEventId: state.hit.event.id });
        }
        if (state.active) {
          updateGhost(state, pointerEvent.clientX, pointerEvent.clientY);
        }
        return;
      }
      // resize
      state.deltaPx = pointerEvent.clientX - state.startClientX;
      rendererRef.current?.setView({
        resizePreview: {
          eventId: state.event.id,
          deltaPx: state.deltaPx,
          direction: state.direction,
        },
      });
    },
    [
      handleHover,
      schedulePan,
      updateGhost,
      rendererRef,
      scheduleContinuousZoom,
      bodyRef,
    ]
  );

  const commitDrop = useCallback(
    (
      state: Extract<InteractionState, { mode: "drag" }>,
      clientX: number,
      clientY: number
    ) => {
      const canvas = dynamicCanvasRef.current;
      const renderer = rendererRef.current;
      if (!canvas || !renderer) return;
      const view = renderer.getView();
      if (view.tick === null || view.cellWidth <= 0) return;
      const canvasRect = canvas.getBoundingClientRect();
      const yContent = clientY - canvasRect.top + view.scrollTop;

      // target row by accumulated heights (same walk the drawing uses)
      let rowTop = 0;
      let targetRowId: string | null = null;
      for (const id of scene.getRowIds()) {
        const height = scene.getRowHeight(
          id,
          view.windowTime[0],
          view.windowTime[1]
        );
        if (yContent >= rowTop && yContent < rowTop + height) {
          targetRowId = id;
          break;
        }
        rowTop += height;
      }
      if (targetRowId === null) return; // dropped outside all rows -> cancel

      const liveEvent = scene.getEvent(state.hit.event.id);
      if (!liveEvent) return;

      const { startTime, endTime } = computeDropTimes({
        pointerX: clientX - canvasRect.left,
        cellWidth: view.cellWidth,
        tick: view.tick,
        windowStart: view.windowTime[0],
        duration: liveEvent.endTime - liveEvent.startTime,
      });

      if (onDrop) {
        onDrop({
          eventId: liveEvent.id,
          oldRowId: liveEvent.rowId,
          newRowId: targetRowId,
          startTime,
          endTime,
        });
      }
      // the ghost already previewed the destination — the dropped event must
      // land instantly; only the events re-stacking around it animate
      renderer.animator.snapEventTop(liveEvent.id);
      scene.applyPatches([
        {
          op: "update",
          id: liveEvent.id,
          changes: { startTime, endTime, rowId: targetRowId },
        },
      ]);
    },
    [scene, dynamicCanvasRef, rendererRef, onDrop]
  );

  const commitResize = useCallback(
    (state: Extract<InteractionState, { mode: "resize" }>) => {
      const renderer = rendererRef.current;
      const tick = renderer?.getView().tick;
      renderer?.setView({ resizePreview: null });
      unlockCursor();
      if (!tick) return;
      const liveEvent = scene.getEvent(state.event.id);
      if (!liveEvent) return;
      const next = computeResizeTimes(
        liveEvent,
        state.deltaPx,
        tick,
        state.direction
      );
      if (next) {
        scene.applyPatches([
          { op: "update", id: liveEvent.id, changes: next },
        ]);
      }
      if (onResize) {
        // legacy reported the (possibly unchanged) committed values
        const committed = next ?? {
          startTime: liveEvent.startTime,
          endTime: liveEvent.endTime,
        };
        onResize({ eventId: liveEvent.id, ...committed });
      }
    },
    [scene, rendererRef, onResize]
  );

  const handlePointerUp = useCallback(
    (pointerEvent: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = dynamicCanvasRef.current;
      const state = stateRef.current;
      pointersRef.current.delete(pointerEvent.pointerId);
      stateRef.current = { mode: "idle" };
      if (canvas?.hasPointerCapture(pointerEvent.pointerId)) {
        canvas.releasePointerCapture(pointerEvent.pointerId);
      }
      if (canvas) canvas.style.cursor = "grab";

      if (state.mode === "drag" && state.active) {
        if (ghostRef.current) ghostRef.current.style.display = "none";
        rendererRef.current?.setView({ draggedEventId: null });
        commitDrop(state, pointerEvent.clientX, pointerEvent.clientY);
      } else if (state.mode === "drag" && !state.active) {
        // press + release without movement = click
        if (onEventClick) {
          onEventClick({
            eventId: state.hit.event.id,
            rowId: state.hit.rowId,
            nativeEvent: pointerEvent.nativeEvent,
            modifiers: {
              shift: pointerEvent.shiftKey,
              ctrl: pointerEvent.ctrlKey,
              meta: pointerEvent.metaKey,
              alt: pointerEvent.altKey,
            },
          });
        }
      } else if (state.mode === "resize") {
        commitResize(state);
      }
    },
    [
      dynamicCanvasRef,
      ghostRef,
      rendererRef,
      commitDrop,
      commitResize,
      onEventClick,
    ]
  );

  const handlePointerCancel = useCallback(
    (pointerEvent: React.PointerEvent<HTMLCanvasElement>) => {
      pointersRef.current.delete(pointerEvent.pointerId);
      stateRef.current = { mode: "idle" };
      const canvas = dynamicCanvasRef.current;
      if (canvas?.hasPointerCapture(pointerEvent.pointerId)) {
        canvas.releasePointerCapture(pointerEvent.pointerId);
      }
      if (ghostRef.current) ghostRef.current.style.display = "none";
      rendererRef.current?.setView({ draggedEventId: null });
    },
    [dynamicCanvasRef, ghostRef, rendererRef]
  );

  const handlePointerLeave = useCallback(() => {
    if (stateRef.current.mode !== "idle") return; // captured pointer still active
    if (hoveredRef.current?.kind === "event") {
      rendererRef.current?.setView({ hoveredEventId: null });
      if (onEventHover) onEventHover({ eventId: null, rowId: null });
    }
    hoveredRef.current = null;
    if (dynamicCanvasRef.current) {
      dynamicCanvasRef.current.style.cursor = "";
    }
    hidePrompt();
  }, [dynamicCanvasRef, rendererRef, hidePrompt, onEventHover]);

  // middle-click toggles grid-granularity mode (legacy "awesome feature")
  const handleAuxClick = useCallback(
    (pointerEvent: React.MouseEvent<HTMLCanvasElement>) => {
      pointerEvent.preventDefault();
      if (pointerEvent.button === 1 && config.middleClickGranularity) {
        changeGridRef.current = !changeGridRef.current;
        if (bodyRef.current) {
          bodyRef.current.style.overflowY = changeGridRef.current
            ? "hidden"
            : "auto";
        }
      }
    },
    [bodyRef, config]
  );

  // wheel must be non-passive to preventDefault (browser zoom / scroll)
  useEffect(() => {
    const canvas = dynamicCanvasRef.current;
    if (!canvas) return;
    const handleWheel = (wheelEvent: WheelEvent) => {
      const view = rendererRef.current?.getView();
      if (!view || view.tick === null) return;
      const tick = view.tick;

      // middle-click granularity mode: wheel adjusts the grid cell width
      if (changeGridRef.current) {
        wheelEvent.preventDefault();
        setCellWidth((cellWidth) =>
          stepCellWidth(
            cellWidth,
            wheelEvent.deltaY,
            (tick * 900) / config.zoomStepSeconds
          )
        );
        return;
      }

      // ctrl/cmd + wheel (and Mac trackpad pinch) zooms the time frame
      if ((wheelEvent.ctrlKey || wheelEvent.metaKey) && config.ctrlWheelZoom) {
        wheelEvent.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const factor =
          wheelEvent.deltaY > 0
            ? config.zoomWheelFactor
            : 1 / config.zoomWheelFactor;
        applyZoom(
          {
            windowTime: [view.windowTime[0], view.windowTime[1]],
            tick,
            cellWidth: view.cellWidth,
          },
          wheelEvent.clientX - rect.left,
          factor,
          rect.width
        );
        return;
      }
      // otherwise: let the body scroll the rows natively
    };
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [dynamicCanvasRef, rendererRef, setCellWidth, applyZoom, config]);

  useEffect(() => unlockCursor, []); // safety on unmount

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    handlePointerCancel,
    handleAuxClick,
  };
};

export default useCanvasInteractions;
