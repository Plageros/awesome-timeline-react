export type Layer = "static" | "dynamic";

export type LayerDirty = { static: boolean; dynamic: boolean };

/**
 * Coalesces invalidations into a single requestAnimationFrame callback.
 * Any number of invalidate() calls within one frame produce exactly one
 * onFrame() with the union of dirty layers — the backbone of 60fps under
 * streaming updates.
 */
export class FrameScheduler {
  private rafId: number | null = null;
  private dirty: LayerDirty = { static: false, dynamic: false };

  constructor(private onFrame: (dirty: LayerDirty) => void) {}

  invalidate(layer: Layer | "all") {
    if (layer === "all" || layer === "static") this.dirty.static = true;
    if (layer === "all" || layer === "dynamic") this.dirty.dynamic = true;
    this.schedule();
  }

  /** Runs a pending frame immediately (tests, synchronous reads). */
  flush() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
      this.run();
    }
  }

  dispose() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.dirty = { static: false, dynamic: false };
  }

  private schedule() {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.run();
    });
  }

  private run() {
    const dirty = this.dirty;
    this.dirty = { static: false, dynamic: false };
    if (dirty.static || dirty.dynamic) this.onFrame(dirty);
  }
}
