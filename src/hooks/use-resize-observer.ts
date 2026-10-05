import { useEffect } from "react";

/** Rescales on a width change. The window is read when the callback fires, never captured: the first
 *  callback lands a frame after mount, by when a consumer may already have called `setWindow`, and a
 *  captured window would overwrite that window's scale with the one the timeline mounted on. */
export const createWidthObserver = (
  getWindow: () => number[],
  onScale: (tick: number, cellWidth: number) => void
): ResizeObserver => {
  let prevWidth = 0;
  return new ResizeObserver((entries) => {
    for (const entry of entries) {
      const width = entry.borderBoxSize?.[0].inlineSize;
      if (typeof width === "number" && width !== prevWidth) {
        prevWidth = width;
        const [start, end] = getWindow();
        const windowDuration = end - start;
        onScale(windowDuration / entry.contentRect.width,
                entry.contentRect.width / (windowDuration / 3600));
      }
    }
  });
};

const useResizeObserver = ({
  windowTimeRef,
  setTick,
  setCellWidth,
  contentRef,
}: {
  windowTimeRef: React.MutableRefObject<number[]>;
  setTick: React.Dispatch<React.SetStateAction<number | null>>;
  setCellWidth: React.Dispatch<React.SetStateAction<number>>;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
}) => {
  useEffect(() => {
    const observer = createWidthObserver(() => windowTimeRef.current, (tick, cellWidth) => {
      setTick(tick);
      setCellWidth(cellWidth);
    });
    if (contentRef.current) {
      observer.observe(contentRef.current, { box: "border-box" });
    }
    return () => observer.disconnect();
  }, [windowTimeRef, setTick, setCellWidth, contentRef]);
};

export default useResizeObserver;
