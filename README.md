# Awesome Timeline React

## Introduction

**Awesome Timeline React** is a Gantt timeline component for visualizing and managing events. Since version **0.2.0** it renders on **HTML canvas** with vertical virtualization and an imperative streaming API — designed to hold **10,000+ events at 60 fps**, including boards fed by live data (websockets). If you have any ideas for features or encounter any bugs, please email me at [jakub.plata@yahoo.pl](mailto:jakub.plata@yahoo.pl).

![](https://raw.githubusercontent.com/Plageros/awesome-timeline-react/master/public/gifs/demo-overview.gif)

## Instalation

```sh
npm install awesome-timeline-react
```

## Ladle

To run ladle stories, type:

```sh
npm run ladle
```

The `TimelineStreaming10k` story demonstrates 10k events with 2,000 live updates per second.

## Configuration

Import the `Timeline` component and css into your project.

```tsx
import { Timeline } from "awesome-timeline-react";
import "awesome-timeline-react/dist/index.css";
```

> **Important:** the timeline virtualizes vertically — render it inside a container with a bounded height (e.g. `height: 90vh`), otherwise the board cannot scroll.

The following properties for Timeline component are available:

- `rows` – an array of objects that define rows. The order within the array will be preserved in the Timeline.

- `events` – an array of objects that define events assigned to particular rows. Each object includes:

  - `id`: `string`
  - `rowId`: `string`
  - `startTime`: `number` (timestamp in seconds)
  - `endTime`: `number` (timestamp in seconds)
  - `props`:
    - `isLocked`: `boolean` (defines if event is locked, meaning it cannot be moved. Default is `false`)
    - `label`: `string` (plain-text label drawn inside the event bar)
    - `style`: `EventStyle` (per-event appearance: `fill`, `stroke`, `strokeWidth`, `textColor`, `font`, `borderRadius`, `opacity`)
    - `drawEvent`: `DrawEventFn` (per-event custom canvas renderer, see below)
    - `isResizable`: `boolean` (defines if event is resizable, overrides the default property `eventsResize`)
    - `showPrompt`: `boolean` (defines if prompt will be shown after hover. Works only if `showEventPrompt` is set as true)
    - `metadata`: `unknown` (some data that can be used by event prompt template)

- `staticEvents` – an array of objects that define static events for particular rows, meaning the events are not interactable by the user.

- `onDrop` – an external callback for the drop after dragging an event. The callback receives the following properties:

  - `eventId`: `string`
  - `oldRowId`: `string`
  - `newRowId`: `string`
  - `startTime`: `number` (timestamp in seconds)
  - `endTime`: `number` (timestamp in seconds)

- `onResize` – an external callback after the resize event was done. The callback receives the following properties:

  - `eventId`: `string`
  - `startTime`: `number` (timestamp in seconds)
  - `endTime`: `number` (timestamp in seconds)

- `onEventClick` – callback for a click on an event (`eventId`, `rowId`, `nativeEvent`, `modifiers`).

- `onEventHover` – callback when the hovered event changes (`eventId`/`rowId`, `null` on hover-out).

- `theme` – color/font tokens for everything drawn to canvas (see Theming).

- `drawEvent` – custom canvas renderer for all events (see Custom event rendering).

- `additionalClassNames` – only `rowsHeader` still applies; everything else is canvas-drawn, use `theme` instead.

- `showRTIndicator` – property that controls wheter Real Time Indicator will be show (default as true)

- `eventsResize` - property that define if events are resizeable (default as true)

- `showEventPrompt` - property that define if prompt for events will be shown after hover (defualt as true)

- `eventPromptTemplate` - function that can be passed for event prompt. Function receives currently hovered `event` object. It returns JSX Element so it can be customize in various ways. The example is in story. (The prompt is regular DOM — JSX still works here.)

- `panZoom` – interaction configuration:
  - `panOnDragBackground` (default true) – drag the background to pan.
  - `ctrlWheelZoom` (default true) – **Ctrl/Cmd + wheel** (and Mac trackpad pinch) zooms the visible time frame around the cursor.
  - `pinchZoom` (default true) – two-finger pinch zooms the time frame on touch devices.
  - `dragZoom` (default true) – **Ctrl/Cmd + drag** the background to zoom (right = in, left = out).
  - `minWindowSeconds` / `maxWindowSeconds` – zoom limits (defaults 900s / 30 days).
  - `zoomWheelFactor` (default 1.15) – span multiplier per wheel notch.
  - `middleClickGranularity` (default true) – middle-click toggles **wheel = grid granularity** mode.
  - `zoomStepSeconds` (default 900) – grid-granularity step.

  > Time-frame zoom changes how much time is visible; grid granularity (`cellWidth`) changes how wide a grid cell is drawn. Since 0.2.x, Ctrl+wheel does time-frame zoom and grid granularity lives on middle-click+wheel.

- `timeBar` – configure the two-row time bar (see Time bar rows). Defaults to a day row over an hour row.

- `animations` – layout animations when events re-stack (rows growing, events changing lanes). `true` (default), `false` to disable, or `{ layoutMs?: number, fadeMs?: number }` to tune (defaults 200/120; `layoutMs` is the stacking tween, `fadeMs` the resize-handle fade). A dropped event always lands instantly — only the events re-stacking around it animate.

## Theming

CSS classes cannot style canvas pixels, so canvas-drawn elements are themed with the `theme` prop. Defaults mirror the pre-0.2.0 stylesheet:

```tsx
<Timeline
  theme={{
    eventFill: "#ffffff",
    eventStroke: "#000000",
    eventTextColor: "#000000",
    staticEventFill: "#e0e0e0",
    gridColor: "#e4dcdc",
    timeBarBorder: "yellow",
    timeBarTextColor: "white",
    font: "12px Inter", // defaults to the canvas element's computed font
    // bar geometry — themeable since 0.2.x (defaults shown)
    barHeight: 20, // event bar height
    laneGap: 2, // gap between stacked lanes (laneHeight = barHeight + laneGap)
    rowPaddingY: 10, // vertical padding above/below bars in a row
    barRadius: 5, // event bar corner radius
  }}
  ...
/>
```

Bar geometry tokens drive row heights, lane stacking, hit-testing, and the drag
ghost together — changing `barHeight`/`laneGap` restacks and re-measures rows
automatically. (Per-event `style.borderRadius` still overrides `barRadius`.)

## Time bar rows

The time bar has two rows. By default the top row shows calendar days and the
bottom row shows hours, but each row's unit and label are configurable via
`timeBar`:

```tsx
<Timeline
  timeBar={{
    topRow: { unit: "day" }, // "hour" | "day" | "week" | "month"
    bottomRow: {
      unit: { stepSeconds: 8 * 3600 }, // or a fixed step in seconds
      format: (start, end) => `Shift ${Math.floor(start.getHours() / 8) + 1}`,
    },
  }}
  ...
/>
```

- `unit` – `"hour" | "day" | "week" | "month"`, or `{ stepSeconds }` for fixed
  steps (weeks start on Monday; custom steps anchor to local midnight).
- `format(blockStart, blockEnd)` – optional label override; defaults mirror the
  built-in `Mon 1 Jan` (day) and `HH:00` (hour) labels.

The time bar is purely presentational: it never changes the visible time range
or the grid. Vertical grid lines and drop snapping stay on the grid cell
(`cellWidth`), independent of the time-bar rows — so e.g. an 8-hour bottom row
can sit over an hourly grid.

## Custom event rendering (`drawEvent`)

For visuals beyond `label` + `style`, draw the event yourself. Resolution order: per-event `props.drawEvent` → Timeline-level `drawEvent` → built-in default. Return `false` to fall through to the default.

```tsx
const drawEvent: DrawEventFn = (ctx, event, rect, state, theme) => {
  if (!event.props?.metadata) return false; // default drawing
  ctx.fillStyle = state.hovered ? "#ffe8a3" : "#a3d5ff";
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.fillStyle = theme.eventTextColor;
  ctx.fillText(event.props.label ?? "", rect.x + 4, rect.y + rect.height / 2);
};
```

`state` carries `{ hovered, dragging, resizing, selected }`.

## Streaming / imperative updates

For live boards, diffing a 10k-element `events` prop per tick is wasteful. Use the imperative handle — patches go straight to the internal store and coalesce into a single redraw per animation frame, with zero React re-renders on the hot path:

```tsx
const ref = useRef<TimelineHandle>(null);

<Timeline ref={ref} rows={rows} events={initialEvents} ... />;

// e.g. from a websocket:
ref.current?.updateEvents([
  { op: "update", id: "42", changes: { startTime, endTime } },
  { op: "upsert", event: newEvent },
  { op: "remove", id: "17" },
]);
```

The full handle: `setEvents`, `updateEvents`, `getEvent`, `scrollToRow`, `scrollToTime`, `setWindow`, `getVisibleRange`, `redraw`.

**Reconciliation rule:** the `events` prop is authoritative whenever its reference changes — a new array fully resets the store and discards imperative state. Pick one mode: declarative (swap the prop) or imperative (stable prop + handle calls).

## Awesome Features

Adjusting the granulation of the grid: click the wheel on the mouse. This will hide the scroll bar, and you can adjust the grid granulation by scrolling the wheel. Each scroll iteration adjusts the grid by ±15 minutes, depending on the scroll direction. Since 0.2.0, `ctrl`/`cmd` + wheel does the same without the mode toggle.

![](https://raw.githubusercontent.com/Plageros/awesome-timeline-react/master/public/gifs/demo-grid-granulation.gif)

Panning is smooth since 0.2.0: drag the background to move the time window with sub-hour precision (no more snapping to full hours).

## Migration 0.1.x → 0.2.0

0.2.0 replaces DOM rendering with a canvas engine. Breaking changes:

| 0.1.x | 0.2.0 |
| --- | --- |
| `props.content: JSX.Element \| string` | `props.label: string` for text, or `drawEvent` for rich visuals |
| `props.classNames: string[]` | `props.style: EventStyle` |
| `additionalClassNames.timeBar/dayRow/hourRow/gridLine` | `theme.timeBar*/gridColor` |
| CSS overrides via imported stylesheet | `theme` object (only rows header + prompt remain CSS-styleable) |
| `TimelineType` | renamed `TimelineProps` (deprecated alias kept) |
| unbounded height grew the page | bounded-height container required (virtualized scrolling) |
| `onDrop` / `onResize` / `metadata` / `eventPromptTemplate` | unchanged |

New in 0.2.0: `ref` (`TimelineHandle`), `theme`, `drawEvent`, `onEventClick`, `onEventHover`, `panZoom`.

New in 0.3.0:
- Themeable bar geometry — `theme.barHeight` / `laneGap` / `rowPaddingY` / `barRadius`.
- Configurable time-bar rows — `timeBar.topRow` / `bottomRow` (`unit` + `format`), units `hour`/`day`/`week`/`month` or `{ stepSeconds }`.
- Time-frame zoom — Ctrl/Cmd + wheel (and trackpad/touch pinch) and Ctrl + drag; grid granularity moved to middle-click + wheel. New `panZoom` keys: `pinchZoom`, `dragZoom`, `minWindowSeconds`, `maxWindowSeconds`, `zoomWheelFactor`.
- Fixes: time-bar hour labels follow panning on sub-day windows; grid lines stay aligned to the time-bar blocks while panning and zooming; the drag ghost inherits the dragged event's style; corrected weekday names.

## Roadmap

Here, we will store major features planned for future releases (from highest to lowest priority):

1. ~~Resize events~~ - published in 0.1.8 version
2. ~~Real time line~~ - published in 0.1.7 version
3. ~~Customizable prompts after hovering over an event~~ - published in 0.1.14 version
4. ~~Canvas rendering engine, virtualization, streaming API~~ - published in 0.2.0 version
5. ~~Customizable second row of the time bar~~ - `timeBar.topRow/bottomRow` (unit + format)
6. ~~Themeable bar geometry (heights, lane spacing, radius)~~ - `theme.barHeight/laneGap/rowPaddingY/barRadius`
7. Multi-select and rubber-band selection
