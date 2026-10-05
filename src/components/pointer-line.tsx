import React, { forwardRef, useImperativeHandle, useRef } from "react";

export type PointerLineActions = {
  /** draw the line `x` px into the content column; `label` null draws it without a time label */
  show: (x: number, label: string | null) => void;
  hide: () => void;
};

/** A dashed vertical line under the pointer, with its time in the time bar. Moved imperatively, so a
 *  pointer move costs one transform rather than a React render or a canvas redraw. */
const PointerLine = forwardRef<PointerLineActions, {
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
  mainRef: React.MutableRefObject<HTMLDivElement | null>;
  top: number;
  color: string;
  labelColor: string;
  font?: string;
}>(({ contentRef, mainRef, top, color, labelColor, font }, ref) => {
  const lineRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);

  useImperativeHandle(ref, () => ({
    show: (x, label) => {
      const line = lineRef.current, tag = labelRef.current;
      const content = contentRef.current, main = mainRef.current;
      if (!line || !tag || !content || !main) return;
      const box = content.getBoundingClientRect();
      const frame = main.getBoundingClientRect();
      const left = box.left - frame.left;
      const bottom = Math.min(box.bottom, content.parentElement?.getBoundingClientRect().bottom ?? box.bottom);
      line.style.height = `${Math.max(bottom - frame.top - top, 0)}px`;
      line.style.display = "block";
      line.style.transform = `translateX(${Math.round(left + x)}px)`;
      if (label === null) {
        tag.style.display = "none";
        return;
      }
      tag.textContent = label;
      tag.style.display = "block";
      const w = tag.offsetWidth;
      const at = Math.min(Math.max(x - w / 2, 0), Math.max(box.width - w, 0));
      tag.style.transform = `translateX(${Math.round(left + at)}px)`;
    },
    hide: () => {
      if (lineRef.current) lineRef.current.style.display = "none";
      if (labelRef.current) labelRef.current.style.display = "none";
    },
  }), [contentRef, mainRef, top]);

  return (
    <>
      <div ref={lineRef} className="pointer-line" style={{ top, borderLeftColor: color }} />
      <div ref={labelRef} className="pointer-label" style={{ background: color, color: labelColor, font }} />
    </>
  );
});

export default PointerLine;
