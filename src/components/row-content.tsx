import React, {
  forwardRef,
  PropsWithChildren,
  useCallback,
  useContext,
} from "react";
import { EventType } from "../types";
import { produce } from "immer";
import { RowsHeightContext } from "../contexts/row-height-context";
import { DragStartedContext } from "../contexts/drag-started-context";
import { ExternalPropertiesContext } from "../contexts/external-properties-context";
import sortEvents from "../helpers/sort-events";

type RowContentProps = {
  id: string;
  setEvents: React.Dispatch<React.SetStateAction<EventType[]>>;
  tick: number | null;
  windowTime: number[];
  cellWidth: number;
};

const RowContent = forwardRef<
  HTMLDivElement,
  PropsWithChildren<RowContentProps>
>((props: PropsWithChildren<RowContentProps>, ref) => {
  const { setEvents, tick, id, windowTime, cellWidth, children } = props;

  const { dragStarted, setDragStarted } = useContext(DragStartedContext);

  const { onDrop } = useContext(ExternalPropertiesContext);

  const handleOnDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const element = event.target as HTMLElement;
      const { left } = element.getBoundingClientRect();
      const draggedEventId = event.dataTransfer.getData("eventId");
      //new position in px within container
      const closestCell = Math.round((event.clientX - left) / cellWidth);
      const newPosition = cellWidth * closestCell;
      setEvents(
        produce((draft) => {
          const event = draft.find((event) => event.id === draggedEventId);

          if (event && tick) {
            const newStartTime = windowTime[0] + newPosition * tick;
            const eventDuration = event.endTime - event.startTime;
            const newEndTime =
              windowTime[0] + eventDuration + newPosition * tick;

            if (onDrop) {
              onDrop({
                eventId: event.id,
                oldRowId: event.rowId,
                newRowId: props.id,
                startTime: newStartTime,
                endTime: newEndTime,
              });
            }

            event.startTime = newStartTime;
            event.endTime = newEndTime;
            event.rowId = props.id;
          }
          draft.sort(sortEvents);
        })
      );
      setDragStarted(false);
    },
    [setEvents, tick, windowTime, cellWidth]
  );

  const rowsHeightContext = useContext(RowsHeightContext);

  const minHeight =
    rowsHeightContext &&
    rowsHeightContext.rowsHeight &&
    rowsHeightContext.rowsHeight[id]
      ? rowsHeightContext.rowsHeight[id].minHeight
      : 40;

  return (
    <div
      id={`row_${id}`}
      ref={ref}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleOnDrop}
      className={dragStarted ? "row-content not-clickable" : "row-content"}
      data-index={id}
      style={{
        minHeight: minHeight,
      }}
    >
      {children}
    </div>
  );
});

export default RowContent;
