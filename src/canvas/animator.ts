// defaults — snappier than the legacy CSS (0.5s / 0.3s) by user request
export const DEFAULT_LAYOUT_DURATION_MS = 200;
export const DEFAULT_FADE_DURATION_MS = 120;

type Tween = {
  from: number;
  to: number;
  start: number;
  duration: number;
};

// smoothstep — visually equivalent to CSS ease-in-out
const ease = (t: number) => t * t * (3 - 2 * t);

/**
 * Replaces the CSS transitions the DOM renderer got for free: event tops
 * tween when stacking changes, and resize handles fade in/out. (Row heights
 * apply instantly so the canvas rows stay locked to the DOM headers, which
 * also snap.) Values are queried per frame; while any tween is live the
 * renderer keeps scheduling frames.
 *
 * Durations are configurable via the Timeline `animations` prop; a duration
 * of 0 disables that animation (values jump straight to target).
 *
 * Coordinate rules: row heights are content-space; event tops are
 * ROW-LOCAL lane offsets. Tweens must never target a value that is itself
 * animated (e.g. an absolute top including the animated row position) —
 * a moving target retargets every frame and the tween lags behind it
 * perpetually, desyncing the layers.
 */
export class LayoutAnimator {
  private eventTops = new Map<string, Tween>();
  private handleAlphas = new Map<string, Tween>();
  private now = 0;
  private activeUntil = 0;
  private layoutDuration = DEFAULT_LAYOUT_DURATION_MS;
  private fadeDuration = DEFAULT_FADE_DURATION_MS;

  setDurations(layoutMs: number, fadeMs: number) {
    this.layoutDuration = layoutMs;
    this.fadeDuration = fadeMs;
  }

  beginFrame(now: number) {
    this.now = now;
  }

  eventTop(eventId: string, target: number): number {
    return this.value(this.eventTops, eventId, target, this.layoutDuration);
  }

  /** 0..1 opacity of an event's resize handles; target 1 = hovered. */
  handleAlpha(eventId: string, target: number): number {
    return this.value(this.handleAlphas, eventId, target, this.fadeDuration);
  }

  isAnimating(): boolean {
    return this.now < this.activeUntil;
  }

  /**
   * Drop an event's top tween so its next draw renders at the target
   * instantly — used on drag-drop commit, where the ghost already previewed
   * the final position and a tween would feel like a rubber-band.
   */
  snapEventTop(eventId: string) {
    this.eventTops.delete(eventId);
  }

  /** Drop all state, e.g. when the scene is reset wholesale. */
  reset() {
    this.eventTops.clear();
    this.handleAlphas.clear();
    this.activeUntil = 0;
  }

  private value(
    map: Map<string, Tween>,
    key: string,
    target: number,
    duration: number
  ): number {
    let tween = map.get(key);
    if (!tween) {
      // first sighting renders at the target instantly (legacy: a newly
      // mounted element has no previous value to transition from)
      tween = { from: target, to: target, start: 0, duration };
      map.set(key, tween);
      return target;
    }
    if (tween.to !== target) {
      if (duration <= 0) {
        tween.from = target;
        tween.to = target;
        return target;
      }
      const current = this.current(tween);
      tween.from = current;
      tween.to = target;
      tween.start = this.now;
      tween.duration = duration;
      this.activeUntil = Math.max(this.activeUntil, this.now + duration);
    }
    return this.current(tween);
  }

  private current(tween: Tween): number {
    if (tween.from === tween.to || tween.duration <= 0) return tween.to;
    const t = Math.min(1, (this.now - tween.start) / tween.duration);
    return tween.from + (tween.to - tween.from) * ease(t);
  }
}
