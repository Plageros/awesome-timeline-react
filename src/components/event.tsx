import React, {
  CSSProperties,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { DragStartedContext } from "../contexts/drag-started-context";
import { EventPropsType, EventType } from "../types";
// import { ReactComponent as Resize Icon } from "../assets/grip-lines-vertical-solid.svg";
import { produce } from "immer";
import sortEvents from "../helpers/sort-events";
import { ExternalPropertiesContext } from "../contexts/external-properties-context";
import ResizeIcon from "./resize-icon";

const Event = ({
  eventData,
  startPosition,
  width,
  top,
  setEvents,
  tick,
}: {
  eventData: EventType;
  startPosition: number;
  width: number;
  top: CSSProperties["top"];
  setEvents: React.Dispatch<React.SetStateAction<EventType[]>>;
  tick: number | null;
}) => {
  const { setDragStarted } = useContext(DragStartedContext);

  const { onResize, eventsResize, eventPromptRef } = useContext(
    ExternalPropertiesContext
  );

  const initialPositionForResizeRef = useRef(0);

  const handleOnDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.stopPropagation();
      event.dataTransfer.setData("eventId", eventData.id);

      setTimeout(() => setDragStarted(true), 0);
      const target = event.target as HTMLElement;
      target.style.opacity = "50%";
      if (eventPromptRef?.current) {
        eventPromptRef.current.setDisplay("none");
      }
    },
    [setDragStarted]
  );

  const handleOnDragEnd = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.stopPropagation();
      setDragStarted(false);
      const target = event.target as HTMLElement;
      target.style.opacity = "100%";
    },
    [setDragStarted]
  );

  const classNames = eventData.props?.classNames
    ? "event " + eventData.props.classNames.join(" ")
    : "event";

  const [draggableEvent, setDraggableEvent] = useState(true);

  const [resizeOffset, setResizeOffset] = useState(0);

  const resizeOffsetRef = useRef(0);

  const [resizeStarted, setResizeStarted] = useState(false);

  const resizeDirectionRef = useRef<"left" | "right" | null>(null);

  const handleDocumentOnMouseMoveResize = useCallback(
    (event: MouseEvent) => {
      const offset = event.clientX - initialPositionForResizeRef.current;
      let internalResizeOffset =
        resizeDirectionRef.current === "left" ? offset * -1 : offset;
      setResizeOffset(internalResizeOffset);
      resizeOffsetRef.current = offset;
    },
    [setResizeOffset]
  );

  const handleDocumentOnMouseUp = useCallback(
    (event: MouseEvent, resizeDirection: "left" | "right") => {
      initialPositionForResizeRef.current = 0;
      setResizeStarted(false);
      document.removeEventListener(
        "mousemove",
        handleDocumentOnMouseMoveResize
      );
      const lockedStyle = document.getElementById("lock-cursor");
      if (lockedStyle) {
        lockedStyle.remove();
      }
      setEvents(
        produce((draft) => {
          const event = draft.find((event) => event.id === eventData.id);
          if (event && tick) {
            if (resizeDirection === "left") {
              const newStartTime = Math.round(
                event.startTime + resizeOffsetRef.current * tick
              );
              if (event.endTime - newStartTime > 0) {
                event.startTime = newStartTime;
              }
            } else {
              const newEndTime = Math.round(
                event.endTime + resizeOffsetRef.current * tick
              );
              if (newEndTime - event.startTime > 0) {
                event.endTime = newEndTime;
              }
            }
            if (onResize) {
              onResize({
                eventId: event.id,
                startTime: event.startTime,
                endTime: event.endTime,
              });
            }
          }
          draft.sort(sortEvents);
          resizeOffsetRef.current = 0;
          setResizeOffset(0);
        })
      );
    },
    [
      handleDocumentOnMouseMoveResize,
      setEvents,
      tick,
      setResizeOffset,
      sortEvents,
    ]
  );

  const handleOnMouseDownEventResizer = useCallback(
    (
      event: React.MouseEvent<HTMLDivElement>,
      resizeDirection: "left" | "right"
    ) => {
      event.stopPropagation();
      resizeDirectionRef.current = resizeDirection;
      setResizeStarted(true);
      // Create a style element
      const style = document.createElement("style");
      style.id = "lock-cursor";
      style.innerHTML = "* { cursor: e-resize !important; }";

      // Append it to the head
      document.head.appendChild(style);
      document.addEventListener("mousemove", handleDocumentOnMouseMoveResize);
      document.addEventListener(
        "mouseup",
        (event) => handleDocumentOnMouseUp(event, resizeDirection),
        { once: true }
      );
      initialPositionForResizeRef.current = event.clientX;
    },
    [handleDocumentOnMouseMoveResize, handleDocumentOnMouseUp]
  );

  const handleOnMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!resizeStarted) {
        event.stopPropagation();
      }
    },
    [resizeStarted]
  );

  const handleOnMouseOver = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
      if (
        eventData.props?.showPrompt ||
        eventData.props?.showPrompt === undefined
      ) {
        const target = event.target as HTMLElement;
        if (eventPromptRef?.current) {
          eventPromptRef.current.setDisplay("block");
          eventPromptRef.current.setRight(
            `calc(100% - ${target.getBoundingClientRect().left}px + 60px)`
          );
          eventPromptRef.current.setBottom(
            `calc(100% - ${target.getBoundingClientRect().top}px + 60px)`
          );
          eventPromptRef.current.setEvent(eventData);
        }
      }
    },
    [eventData]
  );

  const handleOnMouseOut = useCallback(() => {
    if (eventPromptRef?.current) {
      eventPromptRef.current.setDisplay("none");
    }
  }, []);

  return (
    <div
      id={`event_${eventData.id}`}
      key={`event_${eventData.id}`}
      className={classNames}
      draggable={eventData.props?.isLocked ? false : draggableEvent}
      onDragStart={handleOnDragStart}
      onDragEnd={handleOnDragEnd}
      onMouseDown={(event) => event.stopPropagation()}
      onMouseMove={handleOnMouseMove}
      onMouseOut={handleOnMouseOut}
      onDrop={(event) => event.stopPropagation()}
      style={{
        left:
          resizeDirectionRef.current === "left"
            ? startPosition - resizeOffset
            : startPosition,
        width: width + resizeOffset,
        top: top,
        cursor: eventData.props?.isLocked ? "not-allowed" : "pointer",
      }}
    >
      {!eventData.props?.isLocked &&
        ((eventsResize &&
          (eventData.props?.isResizable === true ||
            eventData.props?.isResizable === undefined)) ||
          (!eventsResize && eventData.props?.isResizable)) && (
          <div
            className="event-resize"
            style={resizeStarted ? { opacity: "100%" } : undefined}
            draggable={false}
            onMouseEnter={() => setDraggableEvent(false)}
            onMouseLeave={() => setDraggableEvent(true)}
            onMouseDown={(event) =>
              handleOnMouseDownEventResizer(event, "left")
            }
            onMouseOver={(event) => event.stopPropagation()}
          >
            <ResizeIcon></ResizeIcon>
          </div>
        )}
      <div className="event-content" onMouseOver={handleOnMouseOver}>
        {eventData.props?.content ? eventData.props.content : null}
      </div>
      {!eventData.props?.isLocked &&
        ((eventsResize &&
          (eventData.props?.isResizable === true ||
            eventData.props?.isResizable === undefined)) ||
          (!eventsResize && eventData.props?.isResizable)) && (
          <div
            className="event-resize"
            style={resizeStarted ? { opacity: "100%" } : undefined}
            draggable={false}
            onMouseEnter={() => setDraggableEvent(false)}
            onMouseLeave={() => setDraggableEvent(true)}
            onMouseDown={(event) =>
              handleOnMouseDownEventResizer(event, "right")
            }
            onMouseOver={(event) => event.stopPropagation()}
          >
            <ResizeIcon></ResizeIcon>
          </div>
        )}
    </div>
  );
};
export default Event;
