import { ResolvedTheme } from "../types";

/**
 * Resolved vertical layout for event bars and rows (px). Derived once from the
 * theme (see `geometryFromTheme`) and owned by the SceneStore, which both the
 * renderer (`draw-events`) and hit-testing read so positioning stays in sync.
 *
 * Only `barHeight`, `laneGap`, `rowPaddingY`, and `barRadius` are themeable;
 * the rest are derived from them.
 */
export type Geometry = {
  /** event bar height */
  barHeight: number;
  /** vertical stride between stacked lanes (barHeight + laneGap) */
  laneHeight: number;
  /** top padding before the first lane (== rowPaddingY) */
  laneTopOffset: number;
  /** minimum row height with no stacking (barHeight + 2*rowPaddingY) */
  rowBaseHeight: number;
  /** static-event height with no stacking (== barHeight) */
  staticEventBaseHeight: number;
  /** event bar corner radius */
  barRadius: number;
};

/** Defaults mirror the pre-0.2.x constants (20px bars, 22px lanes, 10px pad). */
export const DEFAULT_GEOMETRY: Geometry = {
  barHeight: 20,
  laneHeight: 22,
  laneTopOffset: 10,
  rowBaseHeight: 40,
  staticEventBaseHeight: 20,
  barRadius: 5,
};

/** Derive the full Geometry from the resolved theme's geometry tokens. */
export const geometryFromTheme = (theme: ResolvedTheme): Geometry => {
  const barHeight = theme.barHeight;
  const rowPaddingY = theme.rowPaddingY;
  return {
    barHeight,
    laneHeight: barHeight + theme.laneGap,
    laneTopOffset: rowPaddingY,
    rowBaseHeight: barHeight + 2 * rowPaddingY,
    staticEventBaseHeight: barHeight,
    barRadius: theme.barRadius,
  };
};
