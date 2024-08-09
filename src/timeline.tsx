import React, { useEffect, useRef, useState } from "react";
import { EventType, RowsHeightType, TimelineType } from "./types";
import "./style.css";
import TimeBar from "./components/time-bar";
import RowsHeader from "./components/rows-header";
import Content from "./components/content";
import { RowsHeightContext } from "./contexts/row-height-context";
import { DragStartedContext } from "./contexts/drag-started-context";
import useResizeObserver from "./hooks/use-resize-observer";
import { ExternalPropertiesContext } from "./contexts/external-properties-context";
import sortEvents from "./helpers/sort-events";

const Timeline = ({
  rows,
  events,
  staticEvents,
  onDrop,
  startDate,
  endDate,
  additionalClassNames,
}: TimelineType) => {
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

  const [internalEvents, setInternalEvents] = useState<EventType[]>([]);

  const contentRef = useRef<HTMLDivElement | null>(null);

  const mainRef = useRef<HTMLDivElement | null>(null);

  const bodyRef = useRef<HTMLDivElement | null>(null);

  // tick is represent how many seconds is a one pixel
  const [tick, setTick] = useState<number | null>(null);

  const [scrollWidth, setScrollWidth] = useState(0);

  const [rowsHeight, setRowsHeight] = useState<Record<
    string,
    RowsHeightType
  > | null>(null);

  const [allRowsHeight, setAllRowsHeight] = useState<number>(0);

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

  useEffect(() => {
    setInternalEvents(events.sort(sortEvents));
  }, [events]);

  const [dragStarted, setDragStarted] = useState<boolean>(false);

  useEffect(() => {
    let tempRowsHeight: Record<string, RowsHeightType> | null = null;
    rows.forEach((row) => {
      if (tempRowsHeight === null) {
        tempRowsHeight = { [row.id]: { minHeight: 40 } };
      } else {
        tempRowsHeight[row.id] = { minHeight: 40 };
      }
    });
    setRowsHeight(tempRowsHeight);
  }, [rows]);

  useResizeObserver({ contentRef, setCellWidth, setTick, windowTime });

  return (
    <div className="main-wrapper" ref={mainRef}>
      <TimeBar
        windowTime={windowTime}
        tick={tick}
        contentWidth={
          contentRef.current
            ? contentRef.current.getBoundingClientRect().width
            : null
        }
        scrollWidth={scrollWidth}
      />

      <div className="body-wrapper" ref={bodyRef}>
        <RowsHeightContext.Provider
          value={{ rowsHeight, setRowsHeight, allRowsHeight, setAllRowsHeight }}
        >
          <RowsHeader
            rows={rows}
            className={additionalClassNames?.rowsHeader}
          />
          <DragStartedContext.Provider value={{ dragStarted, setDragStarted }}>
            <ExternalPropertiesContext.Provider value={{ onDrop }}>
              <Content
                events={internalEvents}
                staticEvents={staticEvents}
                rows={rows}
                setEvents={setInternalEvents}
                tick={tick}
                windowTime={windowTime}
                cellWidth={cellWidth}
                setWindowTime={setWindowTime}
                ref={contentRef}
                setCellWidth={setCellWidth}
                contentWidth={
                  contentRef.current
                    ? contentRef.current.getBoundingClientRect().width
                    : null
                }
                bodyRef={bodyRef}
                lineClassName={additionalClassNames?.gridLine}
              />
            </ExternalPropertiesContext.Provider>
          </DragStartedContext.Provider>
        </RowsHeightContext.Provider>
      </div>
    </div>
  );
};

export default Timeline;
