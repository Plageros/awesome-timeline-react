import React, { useCallback, useEffect, useRef, useState } from "react";
import { Timeline } from "./timeline";
import { EventPatch, EventType, TimelineHandle } from "./types";
import { assignLanes } from "./core/lanes";
import sortEvents from "./helpers/sort-events";
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
 * `renderRowLabel` slot: custom React in the row-header cell instead of the plain name. Here each
 * header shows a small circular value control ("dial") stacked over the row name — proving custom
 * content fits the fixed-width (100px) header, stacks when narrow, and vertically centers within each
 * row's DYNAMIC height (rows here have different numbers of stacked events, so heights vary). The
 * header width is NOT changed (it feeds the canvas time-scale); the dial sizes to the space it's given.
 */
export const TimelineRowHeaderSlot = () => {
  const day = new Date(2024, 4, 28).getTime() / 1000;
  const hr = 3600;
  // rows with a varying number of overlapping events → varying (dynamic) row heights.
  const rows = [
    { id: "M1", name: "CNC Mill A" },
    { id: "M2", name: "Heat-treat oven (long label wraps)" },
    { id: "M3", name: "Assembly" },
    { id: "M4", name: "Packing" },
  ];
  const lanes: Record<string, number> = { M1: 1, M2: 3, M3: 2, M4: 1 };
  const events: EventType[] = [];
  for (const r of rows) {
    for (let l = 0; l < lanes[r.id]; l++) {
      events.push({
        id: `${r.id}_${l}`,
        rowId: r.id,
        startTime: day + (4 + l) * hr,
        endTime: day + (7 + l) * hr,
        props: { label: `${r.id} op${l + 1}` },
      });
    }
  }

  const [eff, setEff] = useState<Record<string, number>>({ M1: 100, M2: 130, M3: 60, M4: 100 });
  // red (0) → green (100) → violet (200): a diverging ramp with green at nominal.
  const rampColor = (pct: number) => {
    const p = Math.max(0, Math.min(200, pct));
    if (p <= 100) { const t = p / 100; return `hsl(${Math.round(0 + t * 120)} 70% 45%)`; } // red→green
    const t = (p - 100) / 100; return `hsl(${Math.round(120 + t * 160)} 60% 50%)`; // green→violet
  };
  return (
    <div style={{ height: "90vh" }}>
      <Timeline
        rows={rows}
        events={events}
        startDate={new Date(2024, 4, 27, 23)}
        endDate={new Date(2024, 4, 28, 23)}
        renderRowLabel={(row) => {
          const v = eff[row.id] ?? 100;
          const color = rampColor(v);
          // deliberately TALL stacked content (circle + slider + label) to show the row grows to fit
          // it now — no overflow into the neighbouring row.
          return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, width: "100%", padding: "2px 0" }}>
              <div
                title={`${row.name} — efficiency ${v}%`}
                style={{
                  width: 34, height: 34, borderRadius: "50%", flex: "0 0 auto",
                  border: `3px solid ${color}`, color,
                  display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700,
                }}
              >
                {v}
              </div>
              <input
                type="range" min={0} max={200} step={5} value={v}
                onChange={(e) => setEff((prev) => ({ ...prev, [row.id]: Number(e.target.value) }))}
                style={{ width: "88%" }}
              />
              <span style={{ fontSize: 10, lineHeight: 1.1, textAlign: "center", overflowWrap: "anywhere" }}>{row.name}</span>
            </div>
          );
        }}
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

/**
 * `stripeOverlap`: where an event bar overlaps a static event (an off-shift /
 * downtime band) on the same row, its overlapping slice is hatched with 45°
 * stripes so an over-wide bar has a visible cause (spec §6.4 — "why is my 2h op
 * 14h wide?"). Toggle it to compare. Row 1's op straddles the band (striped over
 * the gap only); row 2's op starts at the band's end (no overlap → no stripes),
 * modelling a "continuous / no-straddle" op that shifted whole. Stripe color is
 * `theme.overlapStripeColor`.
 */
export const TimelineStripedOverlap = () => {
  const [stripeOverlap, setStripeOverlap] = useState(true);
  const h = (hour: number) => new Date(2024, 4, 27, hour, 0, 0).getTime() / 1000;
  const rows = [
    { id: "mill", name: "Mill (pausable)" },
    { id: "auto", name: "Autoclave (continuous)" },
  ];
  // Both rows carry the same off-shift band 10:00–14:00.
  const staticEvents: EventType[] = [
    { id: "gap-mill", rowId: "mill", startTime: h(10), endTime: h(14) },
    { id: "gap-auto", rowId: "auto", startTime: h(10), endTime: h(14) },
  ];
  const events: EventType[] = [
    // straddles the band → its bar stretches over the gap; stripes mark the slice
    {
      id: "op-mill",
      rowId: "mill",
      startTime: h(8),
      endTime: h(18),
      props: { label: "Mill job", style: { fill: "#2563eb", stroke: "#1e3a8a" } },
    },
    // starts at the band's end → no overlap → no stripes (continuous op moved whole)
    {
      id: "op-auto",
      rowId: "auto",
      startTime: h(14),
      endTime: h(20),
      props: { label: "Autoclave job", style: { fill: "#059669", stroke: "#064e3b" } },
    },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type="checkbox"
          checked={stripeOverlap}
          onChange={(e) => setStripeOverlap(e.target.checked)}
        />
        stripeOverlap
      </label>
      <div style={{ height: "60vh" }}>
        <Timeline
          rows={rows}
          events={events}
          staticEvents={staticEvents}
          stripeOverlap={stripeOverlap}
          startDate={new Date(2024, 4, 27, 6)}
          endDate={new Date(2024, 4, 27, 22)}
        />
      </div>
    </div>
  );
};

/**
 * Lane stacking on a row whose events genuinely run in parallel (a shared pool / capacity row: one
 * row, many concurrent bars). A row must open as many lanes as its peak concurrency so every bar is
 * drawn in full — no bar may be laid over another.
 *
 * Both rows here are the same story with different data:
 *  - **Pool A** is the minimal case: four bars stack up, then lane 0's occupant ends and a new bar
 *    takes the freed lane, and the bars after it collide.
 *  - **Pool B** is the same failure in a realistic shape: a pool admitting a bar every 15 min, with
 *    runs of mixed length (one short "Hold"), so lane releases stop lining up with admissions.
 *
 * The panel above the board is computed by calling the SAME `assignLanes` the renderer uses, next to
 * the peak concurrency the data actually needs — so it reports whether the layout is correct rather
 * than asking you to eyeball it. `overlapping pairs` must be 0 and `lanes` must equal `needs`.
 */
export const TimelineLaneStacking = () => {
  const t = (h: number, m = 0) => new Date(2024, 4, 27, h, m, 0).getTime() / 1000;
  const rows = [
    { id: "poolA", name: "Pool A (minimal)" },
    { id: "poolB", name: "Pool B (mixed lengths)" },
  ];

  // hue per bar so a bar drawn over another is unmistakable
  const bar = (
    id: string,
    rowId: string,
    startTime: number,
    endTime: number,
    label: string,
    hue: number
  ): EventType => ({
    id,
    rowId,
    startTime,
    endTime,
    props: {
      label,
      style: { fill: `hsl(${hue} 70% 62%)`, stroke: `hsl(${hue} 65% 34%)` },
    },
  });

  const events: EventType[] = [
    // --- Pool A: stack of four, then lane 0 frees at 10:00 -------------------------------------
    bar("a1", "poolA", t(8), t(10), "A1", 10),
    bar("a2", "poolA", t(8, 20), t(11, 40), "A2", 45),
    bar("a3", "poolA", t(8, 40), t(11, 40), "A3", 80),
    bar("a4", "poolA", t(9), t(11, 40), "A4", 120),
    bar("a5", "poolA", t(10), t(13), "A5 (takes the freed lane)", 160),
    bar("a6", "poolA", t(10, 20), t(13, 20), "A6", 200),
    bar("a7", "poolA", t(10, 40), t(13, 40), "A7", 240),
    bar("a8", "poolA", t(11), t(14), "A8", 280),
    // --- Pool B: 15-min admissions, mixed run lengths ------------------------------------------
    bar("b1", "poolB", t(9), t(11, 30), "B1", 10),
    bar("b2", "poolB", t(9, 15), t(11, 45), "B2", 35),
    bar("b3", "poolB", t(11, 30), t(14), "B3", 60),
    bar("b4", "poolB", t(11, 52), t(14, 22), "B4", 85),
    bar("b5", "poolB", t(12, 56), t(14, 56), "Hold (short)", 0),
    ...Array.from({ length: 9 }, (_, i) =>
      bar(
        `b${i + 6}`,
        "poolB",
        t(13, 11 + i * 15),
        t(15, 41 + i * 15),
        `B${i + 6}`,
        110 + i * 20
      )
    ),
  ];

  // --- diagnostics: what the renderer's own lane assignment produces, vs what the data needs ---
  const windowStart = t(7);
  const windowEnd = t(19);
  const report = rows.map((row) => {
    const rowEvents = events
      .filter((e) => e.rowId === row.id)
      .sort(sortEvents);
    const { laneOf, highestLane } = assignLanes(rowEvents, windowStart, windowEnd);

    // peak concurrency = the number of lanes this data genuinely requires
    const edges = rowEvents
      .flatMap((e) => [
        { at: e.startTime, d: 1 },
        { at: e.endTime, d: -1 },
      ])
      .sort((x, y) => x.at - y.at || x.d - y.d);
    let live = 0;
    let needs = 0;
    for (const { d } of edges) {
      live += d;
      needs = Math.max(needs, live);
    }

    // any pair sharing a lane while overlapping in time is a bar drawn over another
    const byLane = new Map<number, EventType[]>();
    for (const e of rowEvents) {
      const lane = laneOf.get(e.id);
      if (lane === undefined) continue;
      byLane.set(lane, [...(byLane.get(lane) ?? []), e]);
    }
    const collisions: string[] = [];
    for (const [lane, list] of byLane) {
      const sorted = [...list].sort((x, y) => x.startTime - y.startTime);
      sorted.forEach((e, i) => {
        const next = sorted[i + 1];
        if (next && next.startTime < e.endTime) {
          collisions.push(
            `lane ${lane}: ${e.props?.label} over ${next.props?.label} ` +
              `(${Math.round((e.endTime - next.startTime) / 60)} min)`
          );
        }
      });
    }
    return { row: row.name, lanes: highestLane + 1, needs, collisions };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          font: "12px/1.5 ui-monospace, monospace",
          background: "#f6f7f9",
          border: "1px solid #dfe3e8",
          borderRadius: 8,
          padding: "8px 10px",
        }}
      >
        {report.map((r) => (
          <div key={r.row}>
            <b>{r.row}</b> — lanes: {r.lanes} · needs: {r.needs} ·{" "}
            <span
              style={{
                color: r.collisions.length ? "#c0392b" : "#1c8c4a",
                fontWeight: 700,
              }}
            >
              overlapping pairs: {r.collisions.length}
            </span>
            {r.collisions.map((c) => (
              <div key={c} style={{ paddingLeft: 16, color: "#c0392b" }}>
                {c}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ height: "60vh" }}>
        <Timeline
          rows={rows}
          events={events}
          startDate={new Date(2024, 4, 27, 7)}
          endDate={new Date(2024, 4, 27, 19)}
        />
      </div>
    </div>
  );
};
