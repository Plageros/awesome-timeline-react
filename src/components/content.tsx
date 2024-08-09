import React, {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { EventType, RowType } from "../types";
import LinesCanvas from "./lines-canvas";
import useProduceContent from "../hooks/use-produce-content";
import useGetBlockProperties from "../hooks/use-get-block-properties";
import { RowsHeightContext } from "../contexts/row-height-context";

type ContentType = {
  rows: RowType[];
  events: EventType[];
  staticEvents?: EventType[];
  setEvents: React.Dispatch<React.SetStateAction<EventType[]>>;
  tick: number | null;
  windowTime: number[];
  cellWidth: number;
  setWindowTime: React.Dispatch<React.SetStateAction<number[]>>;
  contentWidth: number | null;
  setCellWidth: React.Dispatch<React.SetStateAction<number>>;
  bodyRef: React.MutableRefObject<HTMLDivElement | null>;
  lineClassName?: string;
};

const Content = forwardRef<HTMLDivElement, ContentType>(
  (
    {
      rows,
      events,
      staticEvents,
      setEvents,
      tick,
      windowTime,
      cellWidth,
      setWindowTime,
      contentWidth,
      setCellWidth,
      bodyRef,
      lineClassName,
    },
    ref
  ) => {
    const [mouseDown, setMouseDown] = useState(false);
    const startMovePosition = useRef<number | null>(null);

    const [changeGrid, setChangeGrid] = useState(false);

    const { blockWidth } = useGetBlockProperties({ windowTime, contentWidth });

    const rowsHeightContext = useContext(RowsHeightContext);

    const handleOnMouseMove = useCallback(
      (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        event.preventDefault();
        if (!mouseDown) {
          return;
        }
        const element = event.target as HTMLElement;
        const { left } = element.getBoundingClientRect();
        const movePosition = event.clientX - left;

        const moveTimestamp = tick ? Math.floor(tick * blockWidth) : 0;

        if (
          startMovePosition.current &&
          startMovePosition.current - movePosition >= blockWidth
        ) {
          startMovePosition.current = movePosition;
          setWindowTime((prev) => [
            prev[0] + moveTimestamp,
            prev[1] + moveTimestamp,
          ]);
        } else if (
          startMovePosition.current &&
          movePosition - startMovePosition.current >= blockWidth
        ) {
          startMovePosition.current = movePosition;
          setWindowTime((prev) => [
            prev[0] - moveTimestamp,
            prev[1] - moveTimestamp,
          ]);
        }
      },
      [blockWidth, setWindowTime, mouseDown]
    );

    const handleOnMouseDown = useCallback(
      (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        setMouseDown(true);
        // disable auto-scroll when adjusting the grid granulation by wheeling
        if (event.button === 1) {
          event.preventDefault();
        }
        const element = event.target as HTMLElement;
        const { left } = element.getBoundingClientRect();
        startMovePosition.current = event.clientX - left;
      },
      [setMouseDown]
    );

    const handleOnMouseUp = useCallback(() => {
      setMouseDown(false);
    }, [setMouseDown]);

    const handleOnMouseLeave = useCallback(
      () => setMouseDown(false),
      [setMouseDown]
    );

    const content = useProduceContent({
      rows,
      windowTime,
      tick,
      events,
      staticEvents,
      cellWidth,
      setEvents,
      bodyRef,
    });

    const handleAuxClick = useCallback(
      (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        event.preventDefault();
        if (event.button === 1) {
          setChangeGrid((prev) => !prev);
        }
      },
      []
    );

    const handleOnWheel = useCallback(
      (event: React.WheelEvent<HTMLDivElement>) => {
        const pixelsToCalculate = tick ? 900 / tick : 0;
        if (changeGrid) {
          setCellWidth((cellWidth) => {
            const newCellWidth =
              event.deltaY > 0
                ? cellWidth + pixelsToCalculate
                : cellWidth - pixelsToCalculate;

            if (
              newCellWidth < pixelsToCalculate ||
              newCellWidth > pixelsToCalculate * 12
            ) {
              return cellWidth;
            }

            return newCellWidth;
          });
        }
      },
      [changeGrid, cellWidth, tick]
    );

    useEffect(() => {
      if (bodyRef.current) {
        bodyRef.current.style.overflow = changeGrid ? "hidden" : "auto";
      }
    }, [changeGrid]);

    return (
      <div
        key="content"
        ref={ref}
        className="content-wrapper"
        onMouseDown={handleOnMouseDown}
        onMouseUp={handleOnMouseUp}
        onMouseMove={handleOnMouseMove}
        onMouseLeave={handleOnMouseLeave}
        onAuxClick={handleAuxClick}
        onWheel={handleOnWheel}
        style={{
          cursor: mouseDown ? "grabbing" : "grab",
          height: rowsHeightContext?.allRowsHeight,
        }}
      >
        <LinesCanvas
          contentWidth={contentWidth}
          cellWidth={cellWidth}
          lineClassName={lineClassName}
        ></LinesCanvas>
        {content}
      </div>
    );
  }
);

export default Content;
