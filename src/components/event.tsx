import React, {
  CSSProperties,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { DragStartedContext } from "../contexts/drag-started-context";
import { EventPropsType, EventType } from "../types";
import resizeIcon from "../assets/grip-lines-vertical-solid.svg";
import { produce } from "immer";
import sortEvents from "../helpers/sort-events";
import { ExternalPropertiesContext } from "../contexts/external-properties-context";

const Event = ({
  id,
  startPosition,
  width,
  top,
  props,
  setEvents,
  tick,
}: {
  id: string;
  startPosition: number;
  width: number;
  top: CSSProperties["top"];
  props?: EventPropsType;
  setEvents: React.Dispatch<React.SetStateAction<EventType[]>>;
  tick: number | null;
}) => {
  const { setDragStarted } = useContext(DragStartedContext);

  const { onResize, eventsResize } = useContext(ExternalPropertiesContext);

  const initialPositionForResizeRef = useRef(0);

  const handleOnDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.stopPropagation();
      event.dataTransfer.setData("eventId", id);

      setTimeout(() => setDragStarted(true), 0);
      const target = event.target as HTMLElement;
      target.style.opacity = "50%";
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

  const classNames = props?.classNames
    ? "event " + props.classNames.join(" ")
    : "event";

  const [draggableEvent, setDraggableEvent] = useState(true);

  const [resizeOffset, setResizeOffset] = useState(0);

  const resizeOffsetRef = useRef(0);

  const [resizeStarted, setResizeStarted] = useState(false);

  const resizeDirectionRef = useRef<"left" | "right" | null>(null);

  const handleDocumentOnMouseMoveResize = useCallback(
    (event: MouseEvent) => {
      const offset = event.clientX - initialPositionForResizeRef.current;
      setResizeOffset(
        resizeDirectionRef.current === "left" ? offset * -1 : offset
      );
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
          const event = draft.find((event) => event.id === id);
          if (event && tick) {
            if (resizeDirection === "left") {
              const newStartTime = Math.round(
                event.startTime + resizeOffsetRef.current * tick
              );

              event.startTime = newStartTime;
            } else {
              const newEndTime = Math.round(
                event.endTime + resizeOffsetRef.current * tick
              );
              event.endTime = newEndTime;
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
      event: React.MouseEvent<HTMLImageElement>,
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

  return (
    <div
      id={`event_${id}`}
      key={`event_${id}`}
      className={classNames}
      draggable={props?.isLocked ? false : draggableEvent}
      onDragStart={handleOnDragStart}
      onDragEnd={handleOnDragEnd}
      onMouseDown={(event) => event.stopPropagation()}
      onMouseMove={handleOnMouseMove}
      onDrop={(event) => event.stopPropagation()}
      style={{
        left:
          resizeDirectionRef.current === "left"
            ? startPosition - resizeOffset
            : startPosition,
        width: width + resizeOffset,
        top: top,
        cursor: props?.isLocked ? "not-allowed" : "pointer",
      }}
    >
      <div className="event-content">
        {!props?.isLocked && (eventsResize || props?.isResizable) && (
          <img
            className="event-resize"
            style={resizeStarted ? { opacity: "100%" } : undefined}
            src={resizeIcon}
            alt="resize-icon"
            draggable={false}
            onMouseEnter={() => setDraggableEvent(false)}
            onMouseLeave={() => setDraggableEvent(true)}
            onMouseDown={(event) =>
              handleOnMouseDownEventResizer(event, "left")
            }
          ></img>
        )}
        {props?.content ? props.content : null}
        {!props?.isLocked && (eventsResize || props?.isResizable) && (
          <img
            className="event-resize"
            style={resizeStarted ? { opacity: "100%" } : undefined}
            src={resizeIcon}
            alt="resize-icon"
            draggable={false}
            onMouseEnter={() => setDraggableEvent(false)}
            onMouseLeave={() => setDraggableEvent(true)}
            onMouseDown={(event) =>
              handleOnMouseDownEventResizer(event, "right")
            }
          ></img>
        )}
      </div>
    </div>
  );
};
export default Event;
