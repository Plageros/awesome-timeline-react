import React, { CSSProperties, useCallback, useContext } from "react";
import { DragStartedContext } from "../contexts/drag-started-context";
import { EventPropsType } from "../types";

const Event = ({
  id,
  startPosition,
  width,
  top,
  props,
}: {
  id: string;
  startPosition: CSSProperties["left"];
  width: CSSProperties["width"];
  top: CSSProperties["top"];
  props?: EventPropsType;
}) => {
  const { setDragStarted } = useContext(DragStartedContext);
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

  return (
    <div
      id={`event_${id}`}
      key={`event_${id}`}
      className={classNames}
      draggable={props?.isLocked ? false : true}
      onDragStart={handleOnDragStart}
      onDragEnd={handleOnDragEnd}
      onMouseDown={(event) => event.stopPropagation()}
      onMouseMove={(event) => event.stopPropagation()}
      onDrop={(event) => event.stopPropagation()}
      style={{
        left: startPosition,
        width: width,
        top: top,
        cursor: props?.isLocked ? "not-allowed" : "pointer",
      }}
    >
      <div className="event-content">
        {props?.content ? props.content : null}
      </div>
    </div>
  );
};
export default Event;
