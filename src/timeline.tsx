import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  EventPromptActionsType,
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
import CanvasTimeBar from "./components/canvas-time-bar";
import CanvasBoard from "./components/canvas-board";
import { SceneStore } from "./core/scene";
import { TimelineRenderer } from "./canvas/renderer";
import { resolveTheme } from "./canvas/theme";
import { geometryFromTheme } from "./core/geometry";

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
      startDate,
      endDate,
      theme,
      drawEvent,
      additionalClassNames,
      showRTIndicator = true,
      eventsResize = true,
      eventPromptTemplate,
      showEventPrompt = true,
      panZoom,
      timeBar,
      animations = true,
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
    }, [scene, events]);
    useEffect(() => {
      scene.setStaticEvents(staticEvents ? [...staticEvents] : []);
    }, [scene, staticEvents]);

    const windowTimeRef = useRef(windowTime);
    windowTimeRef.current = windowTime;

    useImperativeHandle(
      handleRef,
      (): TimelineHandle => ({
        setEvents: (next) => scene.setEvents([...next].sort(sortEvents)),
        updateEvents: (patches) => scene.applyPatches(patches),
        getEvent: (id) => scene.getEvent(id),
        scrollToRow: (rowId) => {
          const [windowStart, windowEnd] = windowTimeRef.current;
          const offset = scene
            .getRowOffsets(windowStart, windowEnd)
            .offsetOf.get(rowId);
          if (offset !== undefined && bodyRef.current) {
            bodyRef.current.scrollTop = offset;
          }
        },
        scrollToTime: (time) => {
          setWindowTime((prev) => [time, time + (prev[1] - prev[0])]);
        },
        setWindow: (startTime, endTime) => setWindowTime([startTime, endTime]),
        getVisibleRange: () => ({
          startTime: windowTimeRef.current[0],
          endTime: windowTimeRef.current[1],
        }),
        redraw: () => rendererRef.current?.invalidate("all"),
      }),
      [scene]
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

    useEffect(() => {
      if (bodyRef.current) {
        setScrollWidth(
          bodyRef.current.getBoundingClientRect().width -
            bodyRef.current.scrollWidth
        );
      }
    }, []);

    useResizeObserver({ contentRef, setCellWidth, setTick, windowTime });

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

        <div className="body-wrapper" ref={bodyRef}>
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
            setWindowTime={setWindowTime}
            setCellWidth={setCellWidth}
            setTick={setTick}
            onDrop={onDrop}
            onResize={onResize}
            onEventClick={onEventClick}
            onEventHover={onEventHover}
            eventsResize={eventsResize}
            panZoom={panZoom}
            animations={resolvedAnimations}
            ref={contentRef}
          />
          {showEventPrompt && eventPrompt}
        </div>
      </div>
    );
  }
);
