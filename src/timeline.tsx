import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  EventPromptActionsType,
  LinkType,
  OnEventHoverProps,
  TimelineHandle,
  TimelineProps,
} from "./types";
import {
  DEFAULT_FADE_DURATION_MS,
  DEFAULT_LAYOUT_DURATION_MS,
} from "./canvas/animator";
import "./style.css";
import useResizeObserver from "./hooks/use-resize-observer";
import sortEvents from "./helpers/sort-events";
import RTIndicator from "./components/rt-indicator";
import EventPrompt from "./components/event-prompt";
import CanvasTimeBar, { TIME_BAR_HEIGHT } from "./components/canvas-time-bar";
import CanvasBoard from "./components/canvas-board";
import PointerLine, { PointerLineActions } from "./components/pointer-line";
import { SceneStore } from "./core/scene";
import { TimelineRenderer } from "./canvas/renderer";
import { resolveTheme } from "./canvas/theme";
import { geometryFromTheme } from "./core/geometry";

const defaultPointerFormat = (time: number) => new Date(time * 1000).toLocaleString();
const NO_LINKS: LinkType[] = [];

export const Timeline = forwardRef<TimelineHandle, TimelineProps>(
  (
    {
      rows,
      events,
      staticEvents,
      onDrop,
      onResize,
      onEventClick,
      onEventHover,
      selectable = false,
      defaultSelectedEventIds,
      onSelectionChange,
      onWindowChange,
      defaultCollapsedRowIds,
      startDate,
      endDate,
      theme,
      drawEvent,
      additionalClassNames,
      renderRowLabel,
      showRTIndicator = true,
      eventsResize = true,
      stripeOverlap = false,
      eventPromptTemplate,
      showEventPrompt = true,
      panZoom,
      timeBar,
      showTimeBar = true,
      showPointerLine = false,
      formatPointerTime,
      onPointerTime,
      animations = true,
      links = NO_LINKS,
      onLinkReveal,
    },
    handleRef
  ) => {
    const [windowTime, setWindowTime] = useState([
      new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        startDate.getHours(),
        0,
        0
      ).getTime() / 1000,
      new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        endDate.getHours(),
        0,
        0
      ).getTime() / 1000,
    ]);

    // cellWidth is in px
    const [cellWidth, setCellWidth] = useState(0);

    const contentRef = useRef<HTMLDivElement | null>(null);

    const mainRef = useRef<HTMLDivElement | null>(null);

    const bodyRef = useRef<HTMLDivElement | null>(null);

    // tick is represent how many seconds is a one pixel
    const [tick, setTick] = useState<number | null>(null);

    const [scrollWidth, setScrollWidth] = useState(0);

    const eventPromptRef = useRef<EventPromptActionsType | null>(null);

    const rendererRef = useRef<TimelineRenderer | null>(null);

    // The SceneStore is the single source of truth for event data. The
    // `events` prop is authoritative on every reference change (full reset);
    // interactions and the imperative handle mutate the store directly.
    const sceneRef = useRef<SceneStore | null>(null);
    if (sceneRef.current === null) {
      sceneRef.current = new SceneStore();
    }
    const scene = sceneRef.current;

    // Uncontrolled selection state. Lives in a ref (off the React render path,
    // like the SceneStore) and is mirrored into the renderer view for drawing.
    // `applySelection` is the single write path used by both the click handler
    // and the imperative handle.
    const selectionRef = useRef<Set<string>>(
      new Set(defaultSelectedEventIds ?? [])
    );
    const onSelectionChangeRef = useRef(onSelectionChange);
    onSelectionChangeRef.current = onSelectionChange;
    const applySelection = useCallback(
      (ids: string[]) => {
        // group expansion (parent → children): selecting a group-parent event
        // also selects all of its child events. Done here so click, group-click,
        // and the imperative setSelection all inherit it. Direction is
        // parent → children only — selecting a child alone selects just it.
        const expanded: string[] = [];
        for (const id of ids) {
          expanded.push(id);
          for (const childId of scene.getChildEventIds(id)) {
            expanded.push(childId);
          }
        }
        // single enforcement point: events opted out via props.isSelectable
        // never enter the selection — covers click, group-click and the
        // imperative setSelection alike.
        selectionRef.current = new Set(
          expanded.filter((id) => scene.isEventSelectable(id))
        );
        rendererRef.current?.setView({
          selectedEventIds: selectionRef.current,
        });
        onSelectionChangeRef.current?.([...selectionRef.current]);
      },
      [scene]
    );
    const getSelection = useCallback(() => [...selectionRef.current], []);

    // A `rows`/`events` reference change is a full scene reset. The animator's
    // per-row tweens are keyed by rowId and would otherwise survive the swap,
    // leaving the canvas drawing a row at the previous dataset's (stale) height
    // while the DOM header already shows the new one — most visibly on rows
    // whose height differs between datasets. Drop the tweens so every row is a
    // "first sighting" and renders at its true height instantly.
    useEffect(() => {
      scene.setRows(rows);
      rendererRef.current?.animator.reset();
    }, [scene, rows]);
    useEffect(() => {
      scene.setEvents([...events].sort(sortEvents));
      rendererRef.current?.animator.reset();
      // Reconcile the selection with the new dataset. A selected id that no longer exists (e.g. the
      // consumer re-keyed or dropped that event on an update) would otherwise linger — and because a
      // non-empty selection dims every *unselected* event, a selection that matches nothing dims the
      // ENTIRE plan (looks like the events vanished). Drop the vanished ids; keep the rest selected.
      const survivors = [...selectionRef.current].filter(
        (id) => scene.getEvent(id) !== undefined
      );
      if (survivors.length !== selectionRef.current.size) {
        selectionRef.current = new Set(survivors);
        rendererRef.current?.setView({ selectedEventIds: selectionRef.current });
        onSelectionChangeRef.current?.(survivors);
      }
    }, [scene, events]);
    useEffect(() => {
      scene.setStaticEvents(staticEvents ? [...staticEvents] : []);
    }, [scene, staticEvents]);

    // Seed the uncontrolled collapse state once. After this the scene owns it and
    // it survives every data update — we never re-apply the prop.
    const seededCollapseRef = useRef(false);
    useEffect(() => {
      if (seededCollapseRef.current) return;
      seededCollapseRef.current = true;
      for (const id of defaultCollapsedRowIds ?? []) {
        scene.setCollapsed(id, true);
      }
    }, [scene, defaultCollapsedRowIds]);

    const windowTimeRef = useRef(windowTime);
    windowTimeRef.current = windowTime;

    const onWindowChangeRef = useRef(onWindowChange);
    onWindowChangeRef.current = onWindowChange;
    useEffect(() => {
      onWindowChangeRef.current?.({ startTime: windowTime[0], endTime: windowTime[1] });
    }, [windowTime[0], windowTime[1]]);

    const tickRef = useRef(tick);
    tickRef.current = tick;
    const pointerLineRef = useRef<PointerLineActions | null>(null);
    // the pointer over these rows (`x` into the column), or a time a linked timeline asked for
    const pointerRef = useRef<{ x: number } | { time: number } | null>(null);
    const pointerOpts = useRef({ showPointerLine, showTimeBar, formatPointerTime, onPointerTime });
    pointerOpts.current = { showPointerLine, showTimeBar, formatPointerTime, onPointerTime };

    const drawPointer = useCallback(() => {
      const line = pointerLineRef.current;
      const p = pointerRef.current;
      const t = tickRef.current;
      if (!line) return;
      if (!p || !t) return line.hide();
      // its time label would cover the hovered event's prompt
      if ("x" in p && rendererRef.current?.getView().hoveredEventId) return line.hide();
      const start = windowTimeRef.current[0];
      const time = "x" in p ? start + p.x * t : p.time;
      const x = "x" in p ? p.x : (p.time - start) / t;
      const width = contentRef.current?.getBoundingClientRect().width ?? 0;
      if (x < 0 || x > width) return line.hide();
      const { showTimeBar: labelled, formatPointerTime: format } = pointerOpts.current;
      line.show(x, labelled ? (format ?? defaultPointerFormat)(time) : null);
    }, []);

    useEffect(() => {
      const column = contentRef.current;
      if (!column) return;
      const move = (e: PointerEvent) => {
        const t = tickRef.current;
        if (!t) return;
        const x = e.clientX - column.getBoundingClientRect().left;
        pointerOpts.current.onPointerTime?.(windowTimeRef.current[0] + x * t);
        if (!pointerOpts.current.showPointerLine) return;
        pointerRef.current = { x };
        drawPointer();
      };
      const leave = () => {
        pointerOpts.current.onPointerTime?.(null);
        if (pointerRef.current && "x" in pointerRef.current) {
          pointerRef.current = null;
          drawPointer();
        }
      };
      column.addEventListener("pointermove", move);
      column.addEventListener("pointerleave", leave);
      return () => {
        column.removeEventListener("pointermove", move);
        column.removeEventListener("pointerleave", leave);
      };
    }, [drawPointer]);

    // a pan or zoom under a still pointer moves the time beneath it
    useEffect(() => {
      const p = pointerRef.current;
      if (p && "x" in p && tick) pointerOpts.current.onPointerTime?.(windowTime[0] + p.x * tick);
      drawPointer();
    }, [windowTime[0], windowTime[1], tick, drawPointer]);

    const onEventHoverRef = useRef(onEventHover);
    onEventHoverRef.current = onEventHover;
    const handleEventHover = useCallback((hover: OnEventHoverProps) => {
      drawPointer();
      onEventHoverRef.current?.(hover);
    }, [drawPointer]);

    useImperativeHandle(
      handleRef,
      (): TimelineHandle => ({
        setEvents: (next) => scene.setEvents([...next].sort(sortEvents)),
        updateEvents: (patches) => scene.applyPatches(patches),
        getEvent: (id) => scene.getEvent(id),
        scrollToRow: (rowId) => {
          const offset = scene.getRowOffsets().offsetOf.get(rowId);
          if (offset !== undefined && bodyRef.current) {
            bodyRef.current.scrollTop = offset;
          }
        },
        scrollToTime: (time) => {
          setWindowTime((prev) => [time, time + (prev[1] - prev[0])]);
        },
        // the scale follows the window, or a zoom applied from outside draws and pans at the old one
        setWindow: (startTime, endTime) => {
          windowTimeRef.current = [startTime, endTime];
          setWindowTime([startTime, endTime]);
          const width = contentRef.current?.getBoundingClientRect().width;
          if (width && endTime > startTime) {
            setTick((endTime - startTime) / width);
            setCellWidth(width / ((endTime - startTime) / 3600));
          }
        },
        getVisibleRange: () => ({
          startTime: windowTimeRef.current[0],
          endTime: windowTimeRef.current[1],
        }),
        setPointerTime: (time) => {
          pointerRef.current = time === null ? null : { time };
          drawPointer();
        },
        setSelection: (ids) => applySelection(ids),
        getSelection,
        toggleRow: (rowId) => scene.toggleCollapsed(rowId),
        setCollapsed: (rowId, collapsed) => scene.setCollapsed(rowId, collapsed),
        redraw: () => rendererRef.current?.invalidate("all"),
      }),
      [scene, applySelection, getSelection, drawPointer]
    );

    useEffect(() => {
      if (contentRef.current) {
        const windowDuration = windowTime[1] - windowTime[0];
        const numberOfHourBlocks = windowDuration / 3600;
        setTick(
          windowDuration / contentRef.current.getBoundingClientRect().width
        );
        setCellWidth(
          contentRef.current.getBoundingClientRect().width / numberOfHourBlocks
        );
      }
    }, []);

    // Follow startDate/endDate when the range they describe actually changes, re-fitting the visible
    // window AND recomputing `tick`/`cellWidth` together. Without this the window is frozen at mount
    // (its initial useState), so a consumer that swaps in a re-ranged dataset without remounting would
    // keep the stale window+tick — culling or mis-scaling the new events until a manual zoom.
    //
    // We compare the HOUR-ROUNDED range (the same rounding the initial window uses), so a re-render
    // with the same span — or a sub-hour nudge — does NOT stomp the user's pan/zoom; only a genuine
    // range change re-fits.
    const fitStart =
      new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        startDate.getHours(),
        0,
        0
      ).getTime() / 1000;
    const fitEnd =
      new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        endDate.getHours(),
        0,
        0
      ).getTime() / 1000;
    const lastFitRef = useRef<[number, number]>([fitStart, fitEnd]);
    useEffect(() => {
      if (lastFitRef.current[0] === fitStart && lastFitRef.current[1] === fitEnd) {
        return; // same span (incl. first run) — leave the window where the user left it
      }
      lastFitRef.current = [fitStart, fitEnd];
      setWindowTime([fitStart, fitEnd]);
      const width = contentRef.current?.getBoundingClientRect().width;
      if (width) {
        const windowDuration = fitEnd - fitStart;
        setTick(windowDuration / width);
        setCellWidth(width / (windowDuration / 3600));
      }
    }, [fitStart, fitEnd]);

    useEffect(() => {
      if (bodyRef.current) {
        setScrollWidth(
          bodyRef.current.getBoundingClientRect().width -
            bodyRef.current.scrollWidth
        );
      }
    }, []);

    useResizeObserver({ contentRef, setCellWidth, setTick, windowTimeRef });

    const resolvedTheme = useMemo(() => resolveTheme(theme), [theme]);

    // Push themeable bar geometry into the scene (single source of truth for
    // row heights / lane offsets, read by the renderer and hit-testing).
    const geometry = useMemo(
      () => geometryFromTheme(resolvedTheme),
      [resolvedTheme]
    );
    useEffect(() => {
      scene.setGeometry(geometry);
    }, [scene, geometry]);

    const resolvedAnimations = useMemo(() => {
      if (animations === false) return { layoutMs: 0, fadeMs: 0 };
      if (animations === true) {
        return {
          layoutMs: DEFAULT_LAYOUT_DURATION_MS,
          fadeMs: DEFAULT_FADE_DURATION_MS,
        };
      }
      return {
        layoutMs: animations.layoutMs ?? DEFAULT_LAYOUT_DURATION_MS,
        fadeMs: animations.fadeMs ?? DEFAULT_FADE_DURATION_MS,
      };
    }, [animations]);

    const eventPrompt = useMemo(
      () => (
        <EventPrompt
          ref={eventPromptRef}
          template={eventPromptTemplate}
        ></EventPrompt>
      ),
      [eventPromptTemplate]
    );

    return (
      <div className="main-wrapper" ref={mainRef}>
        {showRTIndicator && (
          <RTIndicator tick={tick} windowTime={windowTime}></RTIndicator>
        )}
        {showTimeBar && (
          <CanvasTimeBar
            windowTime={windowTime}
            tick={tick}
            contentWidth={
              contentRef.current
                ? contentRef.current.getBoundingClientRect().width
                : null
            }
            scrollWidth={scrollWidth}
            theme={resolvedTheme}
            timeBar={timeBar}
          />
        )}

        <div className="body-wrapper" ref={bodyRef} style={{ borderColor: resolvedTheme.borderColor }}>
          <CanvasBoard
            scene={scene}
            rows={rows}
            windowTime={windowTime}
            tick={tick}
            cellWidth={cellWidth}
            theme={resolvedTheme}
            drawEvent={drawEvent}
            bodyRef={bodyRef}
            rendererRef={rendererRef}
            eventPromptRef={eventPromptRef}
            rowsHeaderClassName={additionalClassNames?.rowsHeader}
            renderRowLabel={renderRowLabel}
            setWindowTime={setWindowTime}
            setCellWidth={setCellWidth}
            setTick={setTick}
            onDrop={onDrop}
            onResize={onResize}
            onEventClick={onEventClick}
            onEventHover={handleEventHover}
            eventsResize={eventsResize}
            stripeOverlap={stripeOverlap}
            links={links}
            onLinkReveal={onLinkReveal}
            timeBar={timeBar}
            panZoom={panZoom}
            animations={resolvedAnimations}
            selectable={selectable}
            applySelection={applySelection}
            getSelection={getSelection}
            ref={contentRef}
          />
          {showEventPrompt && eventPrompt}
        </div>
        <PointerLine ref={pointerLineRef} contentRef={contentRef} mainRef={mainRef}
          top={showTimeBar ? TIME_BAR_HEIGHT : 0} color={resolvedTheme.pointerLineColor}
          labelColor={resolvedTheme.pointerLabelColor} font={resolvedTheme.font} />
      </div>
    );
  }
);
