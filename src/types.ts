export type { Rect } from "./core/types";
import type { Rect } from "./core/types";

export type RowType = {
  id: string;
  name: string;
  /** group this row under a parent row (one level of nesting only in v1). Child
   *  rows are hidden when their parent row is collapsed. List child rows
   *  immediately after their parent row for the clearest visual nesting. */
  parentId?: string;
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
 * Color/font/geometry tokens for everything drawn to canvas. Defaults mirror
 * the pre-0.2.0 stylesheet. Bar geometry (height, lane spacing, row padding,
 * radius) is themeable since 0.2.x — see `core/geometry.ts`.
 */
export type Theme = {
  eventFill?: string;
  eventStroke?: string;
  eventTextColor?: string;
  staticEventFill?: string;
  gridColor?: string;
  timeBarBorder?: string;
  timeBarTextColor?: string;
  /** opacity applied to NON-selected events while a selection is active, so the
   *  selection stands out (default 0.35). 1 disables dimming. */
  dimmedOpacity?: number;
  /** shadow color for the "lifted" look of selected events (default
   *  "rgba(0,0,0,0.35)") */
  selectionShadowColor?: string;
  /** shadow blur in px for selected events (default 8) */
  selectionShadowBlur?: number;
  /** px the selected event bar is lifted (drawn offset upward) to read as
   *  elevated above the others (default 2) */
  selectionElevation?: number;
  /** canvas text font; defaults to the canvas element's computed font */
  font?: string;
  /** event bar height in px (default 20) */
  barHeight?: number;
  /** gap between stacked lanes in px; laneHeight = barHeight + laneGap (default 2) */
  laneGap?: number;
  /** vertical padding above/below the bars within a row in px (default 10) */
  rowPaddingY?: number;
  /** event bar corner radius in px (default 5) */
  barRadius?: number;
  /** faint fill laid over the child-row block of an expanded group so it reads
   *  as recessed beneath its parent row (default "rgba(0,0,0,0.05)"). Also used
   *  to tint child row headers. */
  groupChildBackground?: string;
  /** color of the inset shadow drawn at the top (and left) of an expanded
   *  group's child block — the "sitting beneath the parent" depth cue (default
   *  "rgba(0,0,0,0.22)"). Also tints the header tree connector lines if no
   *  gridColor contrast is desired. */
  groupShadowColor?: string;
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
  /** connects this event to others sharing the same tag. Cmd/Ctrl+click on any
   *  member selects the whole connected group (requires `selectable`). */
  groupId?: string;
  /** opt this event out of selection while the Timeline is `selectable`
   *  (default: selectable). A non-selectable event can't be clicked into the
   *  selection, is excluded from a group selection, and is ignored by
   *  `setSelection`. */
  isSelectable?: boolean;
  /** mark this event as a group summary bar. Its `startTime`/`endTime` are
   *  derived by the scene from its children (earliest start → latest end) and
   *  ignored on input — supplied values are kept only as a fallback while the
   *  parent has no resolved children yet. A parent event is never resizable and
   *  (in v1) never draggable; it stays clickable/selectable. Selecting it also
   *  selects all of its children. Must live on a row that is some row's
   *  `parentId`. */
  isGroupParent?: boolean;
  /** child → parent-event link. The referenced parent event is expected to live
   *  on this row's `parentId` row. An unresolved link is harmless — the event
   *  draws as a plain event (a dev warning is logged). */
  parentEventId?: string;
  /** rows this event may be dragged/dropped onto. `undefined` = any row (the
   *  default). When set, a drag only commits if the target row is in the list —
   *  otherwise the event snaps back (no `onDrop`). An empty array therefore pins
   *  the event (every drop snaps back).
   *
   *  If the event's own `rowId` is not in this list, the library records a
   *  `{ droppableError: DroppableError }` on `props.metadata` (merging, not
   *  clobbering, any object you already put there) so the host app can surface
   *  the misconfiguration. The error is cleared automatically once the event is
   *  on an allowed row. */
  droppableRowIds?: string[];
  /** arbitrary data for eventPromptTemplate. The library may merge a
   *  `droppableError` key here — see `droppableRowIds`. */
  metadata?: unknown;
};

/**
 * Written by the library into `props.metadata.droppableError` when an event's
 * current `rowId` is absent from its `droppableRowIds`. Read it off events your
 * app holds (or via the handle's `getEvent`) to flag the misconfiguration.
 */
export type DroppableError = {
  /** the event's current rowId, which is not among its droppableRowIds */
  rowId: string;
  /** the rows the event declared it may live on */
  droppableRowIds: string[];
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

/** Calendar unit for a time-bar row, or a fixed step in seconds. */
export type TimeBarUnit = "hour" | "day" | "week" | "month";

export type TimeBarRowConfig = {
  /** the unit each block spans (default: "day" for the top row, "hour" for
   *  the bottom row), or a fixed step like `{ stepSeconds: 8 * 3600 }`. */
  unit?: TimeBarUnit | { stepSeconds: number };
  /** label for a block; receives the block's start and end. Defaults mirror
   *  the built-in day ("Mon 1 Jan") and hour ("HH:00") labels. */
  format?: (blockStart: Date, blockEnd: Date) => string;
};

/** Per-row configuration for the two-row time bar. */
export type TimeBarConfig = {
  topRow?: TimeBarRowConfig; // default { unit: "day" }
  bottomRow?: TimeBarRowConfig; // default { unit: "hour" }
};

export type PanZoomConfig = {
  /** drag the empty background to pan the time window (default true) */
  panOnDragBackground?: boolean;
  /** ctrl/cmd + wheel (and trackpad pinch) zooms the visible time frame,
   *  anchored at the cursor (default true). Since 0.2.x this is time-frame
   *  zoom — grid granularity now lives on middle-click+wheel only. */
  ctrlWheelZoom?: boolean;
  /** two-finger pinch zooms the time frame on touch devices (default true) */
  pinchZoom?: boolean;
  /** ctrl/cmd + drag on the background zooms the time frame: drag right to zoom
   *  in, left to zoom out (default true) */
  dragZoom?: boolean;
  /** smallest visible window in seconds the zoom will go to (default 900 = 15 min) */
  minWindowSeconds?: number;
  /** largest visible window in seconds the zoom will go to (default 30 days) */
  maxWindowSeconds?: number;
  /** multiplier applied to the window per wheel notch (default 1.15) */
  zoomWheelFactor?: number;
  /** middle-click toggles wheel grid-granularity mode (default true) */
  middleClickGranularity?: boolean;
  /** seconds per grid-granularity step (default 900 = 15 min) */
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
  /** replace the current selection with these event ids. No `groupId`-tag
   *  expansion (that's Cmd/Ctrl+click only), but a group-parent id still pulls
   *  in its child events (parent → children). Requires `selectable`; fires
   *  `onSelectionChange`. */
  setSelection(eventIds: string[]): void;
  /** the currently selected event ids */
  getSelection(): string[];
  /** toggle a parent row's collapsed state (hides/shows its child rows) */
  toggleRow(rowId: string): void;
  /** explicitly collapse or expand a parent row */
  setCollapsed(rowId: string, collapsed: boolean): void;
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
  /** enable click selection: click selects one event (elevated + others dimmed),
   *  Cmd/Ctrl+click selects its whole connected group (`props.groupId`),
   *  background click / Escape clears. Default false (no selection). */
  selectable?: boolean;
  /** initial selection for the uncontrolled selection state */
  defaultSelectedEventIds?: string[];
  /** fires whenever the selection changes (click, group-click, clear, or the
   *  imperative handle) */
  onSelectionChange?: (eventIds: string[]) => void;
  /** rows collapsed initially (uncontrolled). After mount, collapse state lives
   *  in the scene and survives every data update — streaming patches,
   *  `setEvents`, and `events`-prop resets never change it; only a user caret
   *  click or the imperative handle (`toggleRow`/`setCollapsed`) does. */
  defaultCollapsedRowIds?: string[];
  theme?: Theme;
  drawEvent?: DrawEventFn;
  /** only `rowsHeader` still applies — everything else is canvas-drawn (use `theme`) */
  additionalClassNames?: PartialRecord<keyof ModifableElements, string>;
  showRTIndicator?: boolean;
  eventsResize?: boolean;
  showEventPrompt?: boolean;
  eventPromptTemplate?: (event: EventType) => JSX.Element;
  panZoom?: PanZoomConfig;
  /** configure each row's unit/label in the two-row time bar */
  timeBar?: TimeBarConfig;
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
