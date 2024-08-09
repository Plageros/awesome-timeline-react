import React, { CSSProperties, useCallback, useContext } from "react";
import { DragStartedContext } from "../contexts/drag-started-context";

const StaticEvent = ({
  id,
  startPosition,
  width,
  top,
  height,
}: {
  id: string;
  startPosition: CSSProperties["left"];
  width: CSSProperties["width"];
  top: CSSProperties["top"];
  height: CSSProperties["height"];
}) => {
  return (
    <div
      id={`static_event_${id}`}
      key={`static_event_${id}`}
      className="static-event"
      onDrop={(event) => event.stopPropagation()}
      style={{
        left: startPosition,
        width: width,
        top: top,
        minHeight: height,
      }}
    ></div>
  );
};
export default StaticEvent;
