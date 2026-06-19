import { ResolvedTheme, Theme } from "../types";

/** Defaults mirror the pre-0.2.0 stylesheet values. */
export const DEFAULT_THEME: ResolvedTheme = {
  eventFill: "#ffffff",
  eventStroke: "#000000",
  eventTextColor: "#000000",
  staticEventFill: "#e0e0e0",
  gridColor: "#e4dcdc",
  timeBarBorder: "yellow",
  timeBarTextColor: "white",
  dimmedOpacity: 0.35,
  selectionShadowColor: "rgba(0,0,0,0.35)",
  selectionShadowBlur: 8,
  selectionElevation: 2,
  font: undefined,
  barHeight: 20,
  laneGap: 2,
  rowPaddingY: 10,
  barRadius: 5,
};

export const resolveTheme = (theme?: Theme): ResolvedTheme => ({
  ...DEFAULT_THEME,
  ...theme,
});
