import React, { useCallback, useEffect, useRef } from "react";
import { Timeline } from "./timeline";
import { EventPatch, EventType, TimelineHandle } from "./types";
export default {
  title: "Timeline",
};

export const TimelineCanvas = () => {
  const rows = [];
  const events: EventType[] = [];
  for (let i = 1; i < 200; i++) {
    rows.push({ name: `${i}`, id: `${i}` });
    events.push(
      {
        id: `1_${i}`,
        rowId: `${i}`,
        startTime: new Date(2024, 4, 28, 3, 0, 0).getTime() / 1000,
        endTime: (new Date(2024, 4, 28, 3, 0, 0).getTime() + 3000000) / 1000,
        props: { isLocked: true, showPrompt: false },
      },
      {
        id: `2_${i}`,
        rowId: `${i}`,
        startTime: new Date(2024, 4, 28, 6, 0, 0).getTime() / 1000,
        endTime: new Date(2024, 4, 28, 8, 0, 0).getTime() / 1000,
        props: { label: "canvas mode" },
      }
    );
  }
  return (
    // the canvas timeline virtualizes vertically — give it a bounded
    // height so the board scrolls inside it
    <div style={{ height: "90vh" }}>
      <Timeline
        rows={rows}
        events={events}
        startDate={new Date(2024, 4, 27, 23)}
        endDate={new Date(2024, 4, 28, 23)}
      />
    </div>
  );
};

/**
 * 10k events across 500 rows with a fake websocket pushing 200 random
 * event moves every 100ms through the imperative handle — zero React
 * re-renders of the board on the hot path.
 */
export const TimelineStreaming10k = () => {
  const timelineRef = useRef<TimelineHandle>(null);

  const ROWS = 500;
  const EVENTS_PER_ROW = 20;
  const dayStart = new Date(2024, 4, 28, 0, 0, 0).getTime() / 1000;

  const { rows, events } = React.useMemo(() => {
    const rows = [];
    const events: EventType[] = [];
    const operations = ["Milling", "Welding", "Assembly", "Inspection", "Packing"];
    const statuses = ["scheduled", "in progress", "blocked", "done"];
    for (let r = 1; r <= ROWS; r++) {
      rows.push({ name: `M-${r}`, id: `${r}` });
      for (let e = 0; e < EVENTS_PER_ROW; e++) {
        const startTime = dayStart + e * 4300 + ((r * 7919) % 3600);
        events.push({
          id: `${r}_${e}`,
          rowId: `${r}`,
          startTime,
          endTime: startTime + 1800 + ((r + e) % 5) * 600,
          props: {
            label: `${r}/${e}`,
            metadata: {
              order: `WO-${String(r * 100 + e).padStart(6, "0")}`,
              operation: operations[(r + e) % operations.length],
              machine: `M-${r}`,
              status: statuses[(r * 3 + e) % statuses.length],
            },
          },
        });
      }
    }
    return { rows, events };
  }, []);

  const promptTemplate = useCallback((event: EventType) => {
    const meta = event.props?.metadata as {
      order: string;
      operation: string;
      machine: string;
      status: string;
    };
    const statusColor: Record<string, string> = {
      scheduled: "#888",
      "in progress": "#1976d2",
      blocked: "#d32f2f",
      done: "#2e7d32",
    };
    return (
      <div
        style={{
          minWidth: "220px",
          backgroundColor: "white",
          borderRadius: "8px",
          border: "1px solid #ccc",
          boxShadow: "0px 6px 24px rgba(0,0,0,0.35)",
          overflow: "hidden",
          fontFamily: "sans-serif",
          fontSize: "13px",
        }}
      >
        <div
          style={{
            backgroundColor: "rgb(39, 36, 36)",
            color: "white",
            padding: "8px 12px",
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <span style={{ fontWeight: "bold" }}>{meta.order}</span>
          <span>{meta.machine}</span>
        </div>
        <div style={{ padding: "8px 12px", display: "grid", gap: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#666" }}>Operation</span>
            <span>{meta.operation}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#666" }}>Status</span>
            <span
              style={{
                color: statusColor[meta.status],
                fontWeight: "bold",
              }}
            >
              {meta.status}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#666" }}>Start</span>
            <span>
              {new Date(event.startTime * 1000).toLocaleTimeString()}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#666" }}>End</span>
            <span>{new Date(event.endTime * 1000).toLocaleTimeString()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#666" }}>Duration</span>
            <span>
              {Math.round((event.endTime - event.startTime) / 60)} min
            </span>
          </div>
        </div>
      </div>
    );
  }, []);

  useEffect(() => {
    // fake websocket: batches of random updates through the handle
    const interval = setInterval(() => {
      const handle = timelineRef.current;
      if (!handle) return;
      const patches: EventPatch[] = [];
      for (let i = 0; i < 200; i++) {
        const r = 1 + Math.floor(Math.random() * ROWS);
        const e = Math.floor(Math.random() * EVENTS_PER_ROW);
        const existing = handle.getEvent(`${r}_${e}`);
        if (!existing) continue;
        const shift = (Math.random() - 0.5) * 1200;
        patches.push({
          op: "update",
          id: existing.id,
          changes: {
            startTime: existing.startTime + shift,
            endTime: existing.endTime + shift,
          },
        });
      }
      handle.updateEvents(patches);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ height: "90vh" }}>
      <Timeline
        ref={timelineRef}
        rows={rows}
        events={events}
        startDate={new Date(2024, 4, 28, 0)}
        endDate={new Date(2024, 4, 29, 0)}
        eventPromptTemplate={promptTemplate}
        showRTIndicator={false}
      />
    </div>
  );
};

export const TimelinePrimary = () => {
  let rows = [];
  let events = [];
  for (let i = 1; i < 200; i++) {
    rows.push({ name: `${i}`, id: `${i}` });
    events.push(
      {
        id: `1_${i}`,
        rowId: `${i}`,
        startTime: new Date(2024, 4, 28, 3, 0, 0).getTime() / 1000,
        endTime: (new Date(2024, 4, 28, 3, 0, 0).getTime() + 3000000) / 1000,
        props: {
          isLocked: true,
          showPrompt: false,
        },
      },
      {
        id: `2_${i}`,
        rowId: `${i}`,
        startTime: new Date(2024, 4, 27, 0, 0, 0).getTime() / 1000,
        endTime: (new Date(2024, 4, 27, 0, 0, 0).getTime() + 5000000) / 1000,
        props: {
          label: "cosik",
          metadata: {
            title: "cosik",
            jakisprops: "value",
          },
        },
      },
      {
        id: `3_${i}`,
        rowId: `${i}`,
        startTime: new Date(2024, 4, 27, 0, 30, 0).getTime() / 1000,
        endTime: (new Date(2024, 4, 27, 0, 30, 0).getTime() + 5000000) / 1000,
        props: {
          showPrompt: false,
        },
      }
    );
  }

  const promptTemplate = useCallback((event: EventType) => {
    const props = event.props;
    const metadata = props?.metadata as { title?: string } | undefined;
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "5px",
          backgroundColor: "white",
          borderRadius: "5px",
          border: "1px solid black",
          boxShadow: "0px 0px 10px 3px",
        }}
      >
        <div
          style={{
            fontWeight: "bold",
            paddingBottom: "5px",
            borderBottom: "1px solid black",
          }}
        >
          {metadata && metadata.title}
        </div>

        <>
          <div style={{ display: "flex", gap: "3px", marginTop: "5px" }}>
            <div>Start time:</div>
            <div>
              {new Date(event.startTime * 1000).toLocaleString("pl-PL")}
            </div>
          </div>
          <div style={{ display: "flex", gap: "3px" }}>
            <div>End time:</div>
            <div>{new Date(event.endTime * 1000).toLocaleString("pl-PL")}</div>
          </div>
        </>
      </div>
    );
  }, []);

  return (
    <div style={{ height: "90vh" }}>
      <Timeline
        rows={rows}
        events={events}
        startDate={new Date(2024, 4, 27, 23)}
        endDate={new Date(2024, 4, 28, 23)}
        eventPromptTemplate={promptTemplate}
        staticEvents={[
          {
            id: "1",
            rowId: "1",
            startTime: new Date(2024, 4, 30, 0, 0, 0).getTime() / 1000,
            endTime: new Date(2024, 4, 31, 0, 0, 0).getTime() / 1000,
          },
          {
            id: "2",
            rowId: "2",
            startTime: new Date(2024, 4, 29, 0, 0, 0).getTime() / 1000,
            endTime: new Date(2024, 4, 30, 0, 0, 0).getTime() / 1000,
          },
        ]}
      />
    </div>
  );
};

/**
 * Themeable bar geometry: chunky 32px bars with a 6px lane gap, wide row
 * padding, and a larger corner radius. Verifies stacking, hit-testing
 * (hover/resize zones), drag-ghost height, and header alignment all follow the
 * geometry. Compare with TimelineCanvas (default 20px bars).
 */
export const TimelineThemed = () => {
  const rows: { id: string; name: string }[] = [];
  const events: EventType[] = [];
  for (let i = 1; i < 60; i++) {
    rows.push({ name: `${i}`, id: `${i}` });
    events.push(
      {
        id: `a_${i}`,
        rowId: `${i}`,
        startTime: new Date(2024, 4, 28, 3, 0, 0).getTime() / 1000,
        endTime: new Date(2024, 4, 28, 7, 0, 0).getTime() / 1000,
        props: { label: "chunky" },
      },
      // overlaps the first -> forces a second lane to show lane spacing
      {
        id: `b_${i}`,
        rowId: `${i}`,
        startTime: new Date(2024, 4, 28, 5, 0, 0).getTime() / 1000,
        endTime: new Date(2024, 4, 28, 9, 0, 0).getTime() / 1000,
        props: { label: "stacked", style: { fill: "#d6e4ff" } },
      }
    );
  }
  return (
    <div style={{ height: "90vh" }}>
      <Timeline
        rows={rows}
        events={events}
        startDate={new Date(2024, 4, 27, 23)}
        endDate={new Date(2024, 4, 28, 23)}
        theme={{
          barHeight: 32,
          laneGap: 6,
          rowPaddingY: 14,
          barRadius: 10,
          eventFill: "#fff7e6",
          eventStroke: "#d48806",
        }}
      />
    </div>
  );
};

/**
 * A small, sub-day window (~6h). With a window narrower than a day the time
 * bar must still track the hour labels to the actual time as you pan — pan the
 * background and watch the hour labels advance continuously (rather than
 * staying pinned and then jumping by a whole day near midnight).
 */
export const TimelineNarrowWindow = () => {
  const d = (h: number, m = 0) =>
    new Date(2024, 4, 27, h, m, 0).getTime() / 1000;
  const rows = [
    { id: "r1", name: "Resource A" },
    { id: "r2", name: "Resource B" },
    { id: "r3", name: "Resource C" },
  ];
  const events: EventType[] = [
    { id: "e1", rowId: "r1", startTime: d(1), endTime: d(2), props: { label: "Task 1" } },
    { id: "e2", rowId: "r1", startTime: d(2), endTime: d(3), props: { label: "Task 2" } },
    { id: "e3", rowId: "r2", startTime: d(2), endTime: d(3, 30), props: { label: "Task 3" } },
    { id: "e4", rowId: "r2", startTime: d(3, 30), endTime: d(4, 30), props: { label: "Task 4" } },
    { id: "e5", rowId: "r3", startTime: d(3), endTime: d(5), props: { label: "Task 5" } },
  ];
  return (
    <div style={{ height: "60vh" }}>
      <Timeline
        rows={rows}
        events={events}
        startDate={new Date(2024, 4, 27, 0)}
        endDate={new Date(2024, 4, 27, 6)}
      />
    </div>
  );
};

/**
 * Configurable time-bar rows: a day row over 8-hour "shift" blocks instead of
 * hours. The bottom row uses `{ stepSeconds: 8 * 3600 }` with a custom
 * `format`. Grid lines and drop snapping stay on the hour grid, independent of
 * the time-bar rows.
 */
export const TimelineShiftBar = () => {
  const d = (day: number, h: number) =>
    new Date(2024, 4, day, h, 0, 0).getTime() / 1000;
  const rows = [
    { id: "r1", name: "Resource A" },
    { id: "r2", name: "Resource B" },
  ];
  const events: EventType[] = [
    { id: "e1", rowId: "r1", startTime: d(27, 2), endTime: d(27, 9), props: { label: "Task 1" } },
    { id: "e2", rowId: "r1", startTime: d(27, 12), endTime: d(27, 20), props: { label: "Task 2" } },
    { id: "e3", rowId: "r2", startTime: d(27, 6), endTime: d(27, 16), props: { label: "Task 3" } },
    { id: "e4", rowId: "r2", startTime: d(28, 1), endTime: d(28, 10), props: { label: "Task 4" } },
  ];
  return (
    <div style={{ height: "60vh" }}>
      <Timeline
        rows={rows}
        events={events}
        startDate={new Date(2024, 4, 27, 0)}
        endDate={new Date(2024, 4, 29, 0)}
        timeBar={{
          topRow: { unit: "day" },
          bottomRow: {
            unit: { stepSeconds: 8 * 3600 },
            format: (start) => `Shift ${Math.floor(start.getHours() / 8) + 1}`,
          },
        }}
      />
    </div>
  );
};

/**
 * Long row labels: names that exceed the 100px header width wrap to multiple
 * lines, stay centered, and grow the row height (and its canvas dividers) to
 * fit instead of overflowing into the neighbouring row. Mixes short, multi-word,
 * and a single unbroken token (forced to break-word) so the per-row height
 * adapts to whichever label is tallest.
 */
export const TimelineLongRowLabels = () => {
  const d = (h: number, m = 0) =>
    new Date(2024, 4, 27, h, m, 0).getTime() / 1000;
  const rows = [
    { id: "r1", name: "Short" },
    {
      id: "r2",
      name: "Assembly Line 4 — Hydraulic Press Station (North Wing)",
    },
    { id: "r3", name: "CNC Mill" },
    {
      id: "r4",
      name: "Supercalifragilisticexpialidocious-Machine-Identifier-0042",
    },
    { id: "r5", name: "Quality Control & Final Inspection Bay" },
  ];
  const events: EventType[] = [
    { id: "e1", rowId: "r1", startTime: d(1), endTime: d(3), props: { label: "Job A" } },
    { id: "e2", rowId: "r2", startTime: d(2), endTime: d(4, 30), props: { label: "Job B" } },
    { id: "e3", rowId: "r3", startTime: d(1, 30), endTime: d(3), props: { label: "Job C" } },
    { id: "e4", rowId: "r4", startTime: d(3), endTime: d(5), props: { label: "Job D" } },
    { id: "e5", rowId: "r5", startTime: d(2, 30), endTime: d(5, 30), props: { label: "Job E" } },
  ];
  return (
    <div style={{ height: "60vh" }}>
      <Timeline
        rows={rows}
        events={events}
        startDate={new Date(2024, 4, 27, 0)}
        endDate={new Date(2024, 4, 27, 8)}
      />
    </div>
  );
};

/**
 * Selection: `selectable` turns on click selection. A plain click selects one
 * event (it lifts with a shadow while every other event dims); Cmd/Ctrl+click
 * selects the whole connected group (`props.groupId`). Background click or
 * Escape clears. The buttons drive the same state through the imperative
 * handle (`setSelection`/`getSelection`). Dragging/resizing still operate on a
 * single event regardless of how many are selected.
 */
export const TimelineSelectable = () => {
  const timelineRef = useRef<TimelineHandle>(null);
  const d = (h: number, m = 0) =>
    new Date(2024, 4, 27, h, m, 0).getTime() / 1000;
  const rows = [
    { id: "r1", name: "Welder" },
    { id: "r2", name: "Press" },
    { id: "r3", name: "CNC Mill" },
    { id: "r4", name: "Paint" },
  ];
  // colored palettes per group so the elevation/dim reads against filled bars
  const orderA = { fill: "#1e88e5", stroke: "#0d47a1", textColor: "#ffffff" }; // blue
  const orderB = { fill: "#fb8c00", stroke: "#e65100", textColor: "#ffffff" }; // amber
  const loose = { fill: "#43a047", stroke: "#1b5e20", textColor: "#ffffff" }; // green
  const lockedOut = { fill: "#bdbdbd", stroke: "#757575", textColor: "#424242" }; // grey
  // Two connected groups (shared groupId) spread across rows, plus a couple of
  // ungrouped events.
  const events: EventType[] = [
    { id: "a1", rowId: "r1", startTime: d(1), endTime: d(2, 30), props: { label: "Order A · weld", groupId: "order-A", style: orderA } },
    { id: "a2", rowId: "r2", startTime: d(2, 30), endTime: d(4), props: { label: "Order A · press", groupId: "order-A", style: orderA } },
    { id: "a3", rowId: "r4", startTime: d(4), endTime: d(5, 30), props: { label: "Order A · paint", groupId: "order-A", style: orderA } },
    { id: "b1", rowId: "r2", startTime: d(1), endTime: d(2), props: { label: "Order B · press", groupId: "order-B", style: orderB } },
    { id: "b2", rowId: "r3", startTime: d(2), endTime: d(3, 30), props: { label: "Order B · mill", groupId: "order-B", style: orderB } },
    { id: "c1", rowId: "r3", startTime: d(4), endTime: d(5), props: { label: "Loose 1", style: loose } },
    { id: "c2", rowId: "r1", startTime: d(5), endTime: d(6, 30), props: { label: "Locked-out (not selectable)", isSelectable: false, style: lockedOut } },
  ];
  return (
    <div>
      <div style={{ display: "flex", gap: 8, padding: "8px 0" }}>
        <button onClick={() => timelineRef.current?.setSelection(["a1", "a2", "a3"])}>
          Select Order A (API)
        </button>
        <button onClick={() => timelineRef.current?.setSelection([])}>
          Clear (API)
        </button>
        <button
          onClick={() => alert(JSON.stringify(timelineRef.current?.getSelection() ?? []))}
        >
          getSelection()
        </button>
      </div>
      <div style={{ height: "60vh" }}>
        <Timeline
          ref={timelineRef}
          rows={rows}
          events={events}
          selectable
          onSelectionChange={(ids) => console.log("selection:", ids)}
          startDate={new Date(2024, 4, 27, 0)}
          endDate={new Date(2024, 4, 27, 8)}
        />
      </div>
    </div>
  );
};

/**
 * Grouped (collapsible) rows. A parent row owns child rows (`parentId`); a
 * group-parent event (`isGroupParent`) on the parent row summarizes the child
 * events that point at it (`parentEventId`). The parent's span is derived
 * (earliest child start → latest child end) — it is never resizable or
 * draggable. Selecting a parent also selects its children. Collapsing a parent
 * row hides its child rows while the summary bar stays.
 */
export const TimelineGrouped = () => {
  const timelineRef = useRef<TimelineHandle>(null);
  const d = (h: number, m = 0) =>
    new Date(2024, 4, 27, h, m, 0).getTime() / 1000;

  const rows = [
    { id: "m1", name: "Standalone machine" },
    { id: "g1", name: "Order #1001" },
    { id: "g1-weld", name: "Weld", parentId: "g1" },
    { id: "g1-paint", name: "Paint", parentId: "g1" },
    { id: "g2", name: "Order #1002" },
    { id: "g2-cnc", name: "CNC", parentId: "g2" },
    { id: "g2-asm", name: "Assembly", parentId: "g2" },
  ];

  const summary = { fill: "#37474f", stroke: "#102027", textColor: "#ffffff" }; // slate parent bar
  const blue = { fill: "#1e88e5", stroke: "#0d47a1", textColor: "#ffffff" };
  const amber = { fill: "#fb8c00", stroke: "#e65100", textColor: "#ffffff" };

  const events: EventType[] = [
    { id: "loose", rowId: "m1", startTime: d(2), endTime: d(4), props: { label: "Maintenance" } },
    // Group 1 — supplied parent times are placeholders; the scene derives them.
    { id: "P1", rowId: "g1", startTime: d(0), endTime: d(0), props: { label: "Order #1001 (summary)", isGroupParent: true, style: summary } },
    { id: "P1-weld", rowId: "g1-weld", startTime: d(1), endTime: d(2, 30), props: { label: "Weld", parentEventId: "P1", style: blue } },
    { id: "P1-paint", rowId: "g1-paint", startTime: d(3), endTime: d(4, 30), props: { label: "Paint", parentEventId: "P1", style: blue } },
    // Group 2
    { id: "P2", rowId: "g2", startTime: d(0), endTime: d(0), props: { label: "Order #1002 (summary)", isGroupParent: true, style: summary } },
    { id: "P2-cnc", rowId: "g2-cnc", startTime: d(2), endTime: d(3), props: { label: "CNC", parentEventId: "P2", style: amber } },
    { id: "P2-asm", rowId: "g2-asm", startTime: d(5), endTime: d(6, 30), props: { label: "Assembly", parentEventId: "P2", style: amber } },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 8, padding: "8px 0", flexWrap: "wrap" }}>
        <button onClick={() => timelineRef.current?.toggleRow("g1")}>
          Toggle Order #1001
        </button>
        <button onClick={() => timelineRef.current?.toggleRow("g2")}>
          Toggle Order #1002
        </button>
        <button onClick={() => timelineRef.current?.setSelection(["P1"])}>
          Select Order #1001 (parent → children)
        </button>
        <button onClick={() => timelineRef.current?.setSelection([])}>
          Clear
        </button>
        <button
          onClick={() =>
            // stream a child move; the summary bar re-derives live
            timelineRef.current?.updateEvents([
              { op: "update", id: "P1-paint", changes: { startTime: d(5), endTime: d(6, 30) } },
            ])
          }
        >
          Push Paint later (re-derives summary)
        </button>
      </div>
      <div style={{ height: "60vh" }}>
        <Timeline
          ref={timelineRef}
          rows={rows}
          events={events}
          selectable
          defaultCollapsedRowIds={["g2"]}
          onSelectionChange={(ids) => console.log("selection:", ids)}
          startDate={new Date(2024, 4, 27, 0)}
          endDate={new Date(2024, 4, 27, 8)}
        />
      </div>
    </div>
  );
};

/**
 * Per-event drop-target restriction (`props.droppableRowIds`). The blue event
 * can only be dropped onto Welder/CNC (drag it elsewhere → not-allowed cursor,
 * snaps back). The green event is unrestricted. The red event is *misconfigured*
 * — it sits on Paint but its droppableRowIds doesn't include Paint, so the
 * library records `metadata.droppableError`; click "Inspect" to see it.
 */
export const TimelineDroppableRows = () => {
  const timelineRef = useRef<TimelineHandle>(null);
  const d = (h: number, m = 0) =>
    new Date(2024, 4, 27, h, m, 0).getTime() / 1000;

  const rows = [
    { id: "r1", name: "Welder" },
    { id: "r2", name: "Press" },
    { id: "r3", name: "CNC Mill" },
    { id: "r4", name: "Paint" },
  ];
  const blue = { fill: "#1e88e5", stroke: "#0d47a1", textColor: "#ffffff" };
  const green = { fill: "#43a047", stroke: "#1b5e20", textColor: "#ffffff" };
  const red = { fill: "#e53935", stroke: "#b71c1c", textColor: "#ffffff" };

  const events: EventType[] = [
    { id: "restricted", rowId: "r1", startTime: d(1), endTime: d(2, 30), props: { label: "Welder or CNC only", droppableRowIds: ["r1", "r3"], style: blue } },
    { id: "free", rowId: "r2", startTime: d(3), endTime: d(4), props: { label: "Any row", style: green } },
    { id: "bad", rowId: "r4", startTime: d(5), endTime: d(6), props: { label: "Misconfigured", droppableRowIds: ["r1", "r2"], style: red } },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 8, padding: "8px 0" }}>
        <button
          onClick={() =>
            alert(
              JSON.stringify(
                timelineRef.current?.getEvent("bad")?.props?.metadata ?? null,
                null,
                2
              )
            )
          }
        >
          Inspect "bad" metadata
        </button>
      </div>
      <div style={{ height: "60vh" }}>
        <Timeline
          ref={timelineRef}
          rows={rows}
          events={events}
          onDrop={(p) => console.log("dropped:", p)}
          startDate={new Date(2024, 4, 27, 0)}
          endDate={new Date(2024, 4, 27, 8)}
        />
      </div>
    </div>
  );
};
