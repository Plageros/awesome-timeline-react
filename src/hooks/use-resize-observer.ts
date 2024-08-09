import { useEffect, useMemo, useRef } from "react";

const useResizeObserver = ({
  windowTime,
  setTick,
  setCellWidth,
  contentRef,
}: {
  windowTime: number[];
  setTick: React.Dispatch<React.SetStateAction<number | null>>;
  setCellWidth: React.Dispatch<React.SetStateAction<number>>;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
}) => {
  const prevWidthRef = useRef(0);

  const resizeObserver = useMemo(() => {
    return new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.borderBoxSize?.[0].inlineSize;
        if (typeof width === "number" && width !== prevWidthRef.current) {
          prevWidthRef.current = width;
          const windowDuration = windowTime[1] - windowTime[0];
          const numberOfHourBlocks = windowDuration / 3600;
          setTick(windowDuration / entry.contentRect.width);
          setCellWidth(entry.contentRect.width / numberOfHourBlocks);
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
