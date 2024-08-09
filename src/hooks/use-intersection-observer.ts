import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const useIntersectionObserver = ({
  bodyRef,
  rowsContentRef,
}: {
  bodyRef: React.MutableRefObject<HTMLDivElement | null>;
  rowsContentRef: React.MutableRefObject<HTMLDivElement[] | null>;
}) => {
  // In the future it should be extended to cover the display: none property instead of visibility: hidden for better performance
  const callback: IntersectionObserverCallback = useCallback((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.remove("row-hidden");
      } else {
        entry.target.classList.add("row-hidden");
      }
    });
  }, []);

  const observer = new IntersectionObserver(callback, {
    root: bodyRef.current,
  });

  useEffect(() => {
    if (rowsContentRef.current) {
      rowsContentRef.current.forEach((row) => {
        observer.observe(row);
      });
    }

    return () => observer.disconnect();
  }, [observer]);
};

export default useIntersectionObserver;
