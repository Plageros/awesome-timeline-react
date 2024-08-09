import { useContext, useEffect, useMemo, useRef } from "react";
import { EventType, RowsHeightType, RowType } from "../types";
import React from "react";
import StaticEvent from "../components/static-event";
import RowContent from "../components/row-content";
import Event from "../components/event";
import { RowsHeightContext } from "../contexts/row-height-context";
import useIntersectionObserver from "./use-intersection-observer";

type ProduceContentType = {
  rows: RowType[];
  events: EventType[];
  staticEvents?: EventType[];
  setEvents: React.Dispatch<React.SetStateAction<EventType[]>>;
  tick: number | null;
  windowTime: number[];
  cellWidth: number;
  bodyRef: React.MutableRefObject<HTMLDivElement | null>;
};

const useProduceContent = ({
  rows,
  windowTime,
  tick,
  events,
  staticEvents,
  cellWidth,
  setEvents,
  bodyRef,
}: ProduceContentType) => {
  const rowsHeightContext = useContext(RowsHeightContext);

  let tempRowsHeight: Record<string, RowsHeightType> | null = null;

  const rowsContentRef = useRef<HTMLDivElement[]>([]);

  let allRowsHeight = 0;

  const content = useMemo(
    () =>
      rows.map((row, i) => {
        let eventOrder = 0;
        let prevEvent: EventType[] = [];
        let highestEventOrder = 0;
        const rowEvents = tick
          ? events
              .filter((event) => event.rowId === row.id)
              .map((event) => {
                if (
                  event.endTime >= windowTime[0] &&
                  event.startTime <= windowTime[1]
                ) {
                  let tempEventOrder = 0;
                  let assignEventOrder = true;
                  for (let i = 0; i <= eventOrder; i++) {
                    if (
                      prevEvent &&
                      prevEvent[i] &&
                      prevEvent[i].endTime > event.startTime
                    ) {
                      tempEventOrder += 1;
                    } else {
                      if (eventOrder > highestEventOrder) {
                        highestEventOrder = eventOrder;
                      }
                      eventOrder = 0;
                      assignEventOrder = false;
                      break;
                    }
                  }

                  if (assignEventOrder) {
                    eventOrder = tempEventOrder;
                  }

                  prevEvent[tempEventOrder] = event;
                  return (
                    <Event
                      key={`event_${event.id}`}
                      id={event.id}
                      startPosition={(event.startTime - windowTime[0]) / tick}
                      width={(event.endTime - event.startTime) / tick}
                      top={10 + 22 * tempEventOrder}
                      props={event.props}
                    ></Event>
                  );
                }
              })
          : null;

        if (eventOrder > highestEventOrder) {
          highestEventOrder = eventOrder;
        }

        if (tempRowsHeight === null) {
          tempRowsHeight = {
            [row.id]: { minHeight: 40 + highestEventOrder * 22 },
          };
        } else {
          tempRowsHeight[row.id] = {
            minHeight: 40 + highestEventOrder * 22,
          };
        }
        allRowsHeight += 40 + highestEventOrder * 22;

        const rowStaticEvents =
          tick && staticEvents
            ? staticEvents
                .filter((event) => event.rowId === row.id)
                .map((event) => {
                  if (
                    event.endTime >= windowTime[0] &&
                    event.startTime <= windowTime[1]
                  ) {
                    return (
                      <StaticEvent
                        key={`static_event_${event.id}`}
                        id={event.id}
                        startPosition={(event.startTime - windowTime[0]) / tick}
                        width={(event.endTime - event.startTime) / tick}
                        top={10}
                        height={20 + highestEventOrder * 22}
                      ></StaticEvent>
                    );
                  }
                })
            : null;

        return (
          <React.Fragment key={`row_content_${row.id}`}>
            <RowContent
              id={row.id}
              ref={(el) => {
                if (rowsContentRef.current && rowsContentRef.current[i] && el) {
                  rowsContentRef.current[i] = el;
                } else if (rowsContentRef.current && el) {
                  rowsContentRef.current.push(el);
                }
              }}
              setEvents={setEvents}
              tick={tick}
              windowTime={windowTime}
              cellWidth={cellWidth}
            >
              {rowEvents}
              {rowStaticEvents}
            </RowContent>
          </React.Fragment>
        );
      }),
    [rows, events, tick, windowTime, cellWidth]
  );

  useIntersectionObserver({
    rowsContentRef,
    bodyRef,
  });

  useEffect(() => {
    if (rowsHeightContext) {
      rowsHeightContext.setRowsHeight(tempRowsHeight);
      rowsHeightContext.setAllRowsHeight(allRowsHeight);
    }
  }, [content]);

  return content;
};

export default useProduceContent;