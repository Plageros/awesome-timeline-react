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
  stepCellWidth,
} from "../core/interactions";

const DRAG_THRESHOLD_PX = 3;
const RESIZE_HOT_ZONE_PX = 8; // matches the legacy .event-resize handle width

type InteractionState =
  | { mode: "idle" }
  | { mode: "pan"; lastClientX: number }
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

  const config = useMemo(
    () => ({
      panOnDragBackground: panZoom?.panOnDragBackground ?? true,
      ctrlWheelZoom: panZoom?.ctrlWheelZoom ?? true,
      middleClickGranularity: panZoom?.middleClickGranularity ?? true,
      zoomStepSeconds: panZoom?.zoomStepSeconds ?? 900,
    }),
    [panZoom]
  );

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
      ghost.style.display = "flex";
      ghost.style.left = `${state.hit.rect.x + (clientX - state.startClientX)}px`;
      ghost.style.top = `${state.hit.rect.y + (clientY - state.startClientY)}px`;
      ghost.style.width = `${state.hit.rect.width}px`;
    },
    [ghostRef]
  );

  const handlePointerDown = useCallback(
    (pointerEvent: React.PointerEvent<HTMLCanvasElement>) => {
      if (pointerEvent.button !== 0) return;
      const canvas = dynamicCanvasRef.current;
      if (!canvas) return;
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
        }
      } else if (config.panOnDragBackground) {
        stateRef.current = { mode: "pan", lastClientX: pointerEvent.clientX };
        canvas.style.cursor = "grabbing";
      } else {
        return;
      }
      hidePrompt();
      canvas.setPointerCapture(pointerEvent.pointerId);
    },
    [currentHit, resizeDirectionAt, dynamicCanvasRef, hidePrompt, config]
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
      const state = stateRef.current;
      if (state.mode === "idle") {
        handleHover(pointerEvent);
        return;
      }
      if (state.mode === "pan") {
        panPendingDxRef.current += pointerEvent.clientX - state.lastClientX;
        state.lastClientX = pointerEvent.clientX;
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
    [handleHover, schedulePan, updateGhost, rendererRef]
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
      const viaCtrl =
        (wheelEvent.ctrlKey || wheelEvent.metaKey) && config.ctrlWheelZoom;
      if (!changeGridRef.current && !viaCtrl) return;
      wheelEvent.preventDefault();
      const tick = rendererRef.current?.getView().tick;
      if (!tick) return;
      setCellWidth((cellWidth) =>
        stepCellWidth(
          cellWidth,
          wheelEvent.deltaY,
          (tick * 900) / config.zoomStepSeconds
        )
      );
    };
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [dynamicCanvasRef, rendererRef, setCellWidth, config]);

  useEffect(() => unlockCursor, []); // safety on unmount

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    handleAuxClick,
  };
};

export default useCanvasInteractions;
