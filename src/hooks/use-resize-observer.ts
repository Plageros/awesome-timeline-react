import { useEffect, useMemo, useRef } from "react";
import getDenominator from "../helpers/get-denominator";
import { TimeBarPatternType } from "../types";

const useResizeObserver = ({
  windowTime,
  setTick,
  setCellWidth,
  contentRef,
  timeBarPattern
}: {
  windowTime: number[];
  setTick: React.Dispatch<React.SetStateAction<number | null>>;
  setCellWidth: React.Dispatch<React.SetStateAction<number>>;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
  timeBarPattern: TimeBarPatternType
}) => {
  const prevWidthRef = useRef(0);

  const resizeObserver = useMemo(() => {
    return new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.borderBoxSize?.[0].inlineSize;
        if (typeof width === "number" && width !== prevWidthRef.current) {
          prevWidthRef.current = width;
          const windowDuration = windowTime[1] - windowTime[0];
          const numberOfBlocks = windowDuration / getDenominator(timeBarPattern);;
          setTick(windowDuration / entry.contentRect.width);
          setCellWidth(entry.contentRect.width / numberOfBlocks);
        }
      }
    });
  }, [windowTime]);

  useEffect(() => {
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current, { box: "border-box" });
    }
    return () => resizeObserver.disconnect();
  }, [resizeObserver]);
};

export default useResizeObserver;
