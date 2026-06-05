export type { Rect } from "./core/types";
import type { Rect } from "./core/types";

export type RowType = {
  id: string;
  name: string;
};

/** Interaction state passed to custom drawEvent renderers. */
export type EventState = {
  hovered: boolean;
  dragging: boolean;
  resizing: boolean;
  selected: boolean;
};

/** Per-event appearance overrides, merged over the theme defaults. */
export type EventStyle = {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  textColor?: string;
  font?: string; // CSS font shorthand, e.g. "12px Inter"
  borderRadius?: number;
  opacity?: number;
};

/**
 * Custom canvas renderer for an event. Return false to fall through to the
 * library's default drawing.
 */
export type DrawEventFn = (
  ctx: CanvasRenderingContext2D,
  event: EventType,
  rect: Rect,
  state: EventState,
  theme: ResolvedTheme
) => void | false;

/**
 * Color/font tokens for everything drawn to canvas. Defaults mirror the
 * pre-0.2.0 stylesheet. (Bar geometry — heights, lane spacing, radius — is
 * not yet themeable.)
 */
export type Theme = {
  eventFill?: string;
  eventStroke?: string;
  eventTextColor?: string;
  staticEventFill?: string;
  gridColor?: string;
  timeBarBorder?: string;
  timeBarTextColor?: string;
  /** canvas text font; defaults to the canvas element's computed font */
  font?: string;
};

export type ResolvedTheme = Required<Omit<Theme, "font">> &
  Pick<Theme, "font">;

export type EventPropsType = {
  isLocked?: boolean;
  isResizable?: boolean;
  showPrompt?: boolean;
  /** plain-text label drawn inside the bar (was `content` before 0.2.0) */
  label?: string;
  /** per-event appearance (was `classNames` before 0.2.0) */
  style?: EventStyle;
  /** per-event custom renderer; overrides the Timeline-level drawEvent */
  drawEvent?: DrawEventFn;
  /** arbitrary data for eventPromptTemplate */
  metadata?: unknown;
};

export type EventType = {
  id: string;
  rowId: string;
  startTime: number;
  endTime: number;
  props?: EventPropsType;
};

export type OnDropProps = {
  eventId: string;
  oldRowId: string;
  newRowId: string;
  startTime: number;
  endTime: number;
};

export type OnResizeProps = {
  eventId: string;
  startTime: number;
  endTime: number;
};

export type OnEventClickProps = {
  eventId: string;
  rowId: string;
  nativeEvent: PointerEvent;
  modifiers: { shift: boolean; ctrl: boolean; meta: boolean; alt: boolean };
};

export type OnEventHoverProps = {
  /** null when the pointer leaves all events */
  eventId: string | null;
  rowId: string | null;
};

/**
 * Layout animation configuration. `false` disables all animations;
 * an object tunes the durations (0 disables that animation).
 */
export type AnimationConfig =
  | boolean
  | {
      /** event stacking / row height tween, ms (default 200) */
      layoutMs?: number;
      /** resize-handle fade, ms (default 120) */
      fadeMs?: number;
    };

export type PanZoomConfig = {
  /** drag the empty background to pan the time window (default true) */
  panOnDragBackground?: boolean;
  /** ctrl/cmd + wheel changes grid granularity (default true) */
  ctrlWheelZoom?: boolean;
  /** middle-click toggles wheel-granularity mode (default true) */
  middleClickGranularity?: boolean;
  /** seconds per granularity step (default 900 = 15 min) */
  zoomStepSeconds?: number;
};

/** Imperative event mutation, applied without React re-renders. */
export type EventPatch =
  | { op: "upsert"; event: EventType }
  | { op: "update"; id: string; changes: Partial<Omit<EventType, "id">> }
  | { op: "remove"; id: string };

/**
 * Imperative handle for streaming/live updates: `const ref =
 * useRef<TimelineHandle>(null); <Timeline ref={ref} ...>`.
 *
 * Reconciliation rule: the `events` PROP is authoritative whenever its
 * reference changes — a new array resets the internal store and discards all
 * imperative state. Pick one mode: declarative (swap the prop) or imperative
 * (stable prop + handle calls).
 */
export type TimelineHandle = {
  /** full replace of all events (does not touch the `events` prop) */
  setEvents(events: EventType[]): void;
  /** batched patches, coalesced into a single redraw per animation frame */
  updateEvents(patches: EventPatch[]): void;
  getEvent(id: string): EventType | undefined;
  /** scroll vertically so the row is at the top of the viewport */
  scrollToRow(rowId: string): void;
  /** move the visible time window, preserving its duration */
  scrollToTime(time: number): void;
  /** set the visible time window explicitly (unix seconds) */
  setWindow(startTime: number, endTime: number): void;
  getVisibleRange(): { startTime: number; endTime: number };
  /** force a full redraw of both canvas layers */
  redraw(): void;
};

export type ModifableElements = {
  timeBar: string;
  dayRow: string;
  hourRow: string;
  gridLine: string;
  rowsHeader: string;
};

export type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>;

export type TimelineProps = {
  rows: RowType[];
  events: EventType[];
  staticEvents?: EventType[];
  startDate: Date;
  endDate: Date;
  onDrop?: (props: OnDropProps) => void;
  onResize?: (props: OnResizeProps) => void;
  onEventClick?: (props: OnEventClickProps) => void;
  onEventHover?: (props: OnEventHoverProps) => void;
  theme?: Theme;
  drawEvent?: DrawEventFn;
  /** only `rowsHeader` still applies — everything else is canvas-drawn (use `theme`) */
  additionalClassNames?: PartialRecord<keyof ModifableElements, string>;
  showRTIndicator?: boolean;
  eventsResize?: boolean;
  showEventPrompt?: boolean;
  eventPromptTemplate?: (event: EventType) => JSX.Element;
  panZoom?: PanZoomConfig;
  /** layout animations: true (default), false to disable, or durations */
  animations?: AnimationConfig;
};

/** @deprecated renamed to TimelineProps in 0.2.0 */
export type TimelineType = TimelineProps;

export type EventPromptActionsType = {
  /** show the prompt for an event, anchored to its rect (viewport coords) */
  show: (event: EventType, anchorRect: Rect) => void;
  hide: () => void;
};
