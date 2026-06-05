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
  font: undefined,
};

export const resolveTheme = (theme?: Theme): ResolvedTheme => ({
  ...DEFAULT_THEME,
  ...theme,
});
