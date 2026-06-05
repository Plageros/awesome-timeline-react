/**
 * Sizes a canvas backing store for the given devicePixelRatio and resets the
 * context transform so ALL drawing code works in CSS pixels.
 */
export const sizeCanvas = (
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number,
  dpr: number
) => {
  canvas.width = Math.max(1, Math.round(cssWidth * dpr));
  canvas.height = Math.max(1, Math.round(cssHeight * dpr));
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  return ctx;
};

/** Notifies when devicePixelRatio changes (browser zoom, monitor switch). */
export const watchDpr = (onChange: (dpr: number) => void): (() => void) => {
  let disposed = false;
  let cleanup = () => {};

  const listen = () => {
    if (disposed) return;
    const media = window.matchMedia(
      `(resolution: ${window.devicePixelRatio}dppx)`
    );
    const handler = () => {
      onChange(window.devicePixelRatio);
      media.removeEventListener("change", handler);
      listen(); // re-arm for the new ratio
    };
    media.addEventListener("change", handler);
    cleanup = () => media.removeEventListener("change", handler);
  };

  listen();
  return () => {
    disposed = true;
    cleanup();
  };
};
