import React, { useCallback, useEffect, useRef, useState } from "react";
import { Timeline } from "./timeline";
import { DrawEventFn, EventPatch, EventType, TimelineHandle } from "./types";
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
    { id: "M1", name: "Track A" },
    { id: "M2", name: "Track B (a long label that wraps)" },
    { id: "M3", name: "Track C" },
    { id: "M4", name: "Track D" },
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
        props: { label: `${r.id} task ${l + 1}` },
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
                title={`${row.name} — ${v}%`}
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
    const activities = ["Planning", "Drafting", "Review", "Testing", "Release"];
    const statuses = ["scheduled", "in progress", "blocked", "done"];
    for (let r = 1; r <= ROWS; r++) {
      rows.push({ name: `Track ${r}`, id: `${r}` });
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
              task: `T-${String(r * 100 + e).padStart(6, "0")}`,
              activity: activities[(r + e) % activities.length],
              track: `Track ${r}`,
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
      task: string;
      activity: string;
      track: string;
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
          <span style={{ fontWeight: "bold" }}>{meta.task}</span>
          <span>{meta.track}</span>
        </div>
        <div style={{ padding: "8px 12px", display: "grid", gap: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#666" }}>Activity</span>
            <span>{meta.activity}</span>
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
 * Configurable time-bar rows: a day row over 8-hour blocks instead of hours.
 * The bottom row uses `{ stepSeconds: 8 * 3600 }` with a custom `format`. Grid
 * lines and drop snapping stay on the hour grid, independent of the time-bar
 * rows.
 */
export const TimelineCustomTimeBar = () => {
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
            format: (start) => `Block ${Math.floor(start.getHours() / 8) + 1}`,
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
      name: "Track 4 — a label long enough to need several lines (north side)",
    },
    { id: "r3", name: "Track C" },
    {
      id: "r4",
      name: "Supercalifragilisticexpialidocious-Track-Identifier-0042",
    },
    { id: "r5", name: "Review & Final Sign-off Track" },
  ];
  const events: EventType[] = [
    { id: "e1", rowId: "r1", startTime: d(1), endTime: d(3), props: { label: "Task A" } },
    { id: "e2", rowId: "r2", startTime: d(2), endTime: d(4, 30), props: { label: "Task B" } },
    { id: "e3", rowId: "r3", startTime: d(1, 30), endTime: d(3), props: { label: "Task C" } },
    { id: "e4", rowId: "r4", startTime: d(3), endTime: d(5), props: { label: "Task D" } },
    { id: "e5", rowId: "r5", startTime: d(2, 30), endTime: d(5, 30), props: { label: "Task E" } },
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
    { id: "r1", name: "Track A" },
    { id: "r2", name: "Track B" },
    { id: "r3", name: "Track C" },
    { id: "r4", name: "Track D" },
  ];
  // colored palettes per group so the elevation/dim reads against filled bars
  const groupA = { fill: "#1e88e5", stroke: "#0d47a1", textColor: "#ffffff" }; // blue
  const groupB = { fill: "#fb8c00", stroke: "#e65100", textColor: "#ffffff" }; // amber
  const loose = { fill: "#43a047", stroke: "#1b5e20", textColor: "#ffffff" }; // green
  const lockedOut = { fill: "#bdbdbd", stroke: "#757575", textColor: "#424242" }; // grey
  // Two connected groups (shared groupId) spread across rows, plus a couple of
  // ungrouped events.
  const events: EventType[] = [
    { id: "a1", rowId: "r1", startTime: d(1), endTime: d(2, 30), props: { label: "Group A · step 1", groupId: "group-A", style: groupA } },
    { id: "a2", rowId: "r2", startTime: d(2, 30), endTime: d(4), props: { label: "Group A · step 2", groupId: "group-A", style: groupA } },
    { id: "a3", rowId: "r4", startTime: d(4), endTime: d(5, 30), props: { label: "Group A · step 3", groupId: "group-A", style: groupA } },
    { id: "b1", rowId: "r2", startTime: d(1), endTime: d(2), props: { label: "Group B · step 1", groupId: "group-B", style: groupB } },
    { id: "b2", rowId: "r3", startTime: d(2), endTime: d(3, 30), props: { label: "Group B · step 2", groupId: "group-B", style: groupB } },
    { id: "c1", rowId: "r3", startTime: d(4), endTime: d(5), props: { label: "Loose 1", style: loose } },
    { id: "c2", rowId: "r1", startTime: d(5), endTime: d(6, 30), props: { label: "Locked-out (not selectable)", isSelectable: false, style: lockedOut } },
  ];
  return (
    <div>
      <div style={{ display: "flex", gap: 8, padding: "8px 0" }}>
        <button onClick={() => timelineRef.current?.setSelection(["a1", "a2", "a3"])}>
          Select Group A (API)
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
    { id: "m1", name: "Standalone track" },
    { id: "g1", name: "Group #1001" },
    { id: "g1-s1", name: "Step 1", parentId: "g1" },
    { id: "g1-s2", name: "Step 2", parentId: "g1" },
    { id: "g2", name: "Group #1002" },
    { id: "g2-s1", name: "Step 1", parentId: "g2" },
    { id: "g2-s2", name: "Step 2", parentId: "g2" },
  ];

  const summary = { fill: "#37474f", stroke: "#102027", textColor: "#ffffff" }; // slate parent bar
  const blue = { fill: "#1e88e5", stroke: "#0d47a1", textColor: "#ffffff" };
  const amber = { fill: "#fb8c00", stroke: "#e65100", textColor: "#ffffff" };

  const events: EventType[] = [
    { id: "loose", rowId: "m1", startTime: d(2), endTime: d(4), props: { label: "Unrelated task" } },
    // Group 1 — supplied parent times are placeholders; the scene derives them.
    { id: "P1", rowId: "g1", startTime: d(0), endTime: d(0), props: { label: "Group #1001 (summary)", isGroupParent: true, style: summary } },
    { id: "P1-s1", rowId: "g1-s1", startTime: d(1), endTime: d(2, 30), props: { label: "Step 1", parentEventId: "P1", style: blue } },
    { id: "P1-s2", rowId: "g1-s2", startTime: d(3), endTime: d(4, 30), props: { label: "Step 2", parentEventId: "P1", style: blue } },
    // Group 2
    { id: "P2", rowId: "g2", startTime: d(0), endTime: d(0), props: { label: "Group #1002 (summary)", isGroupParent: true, style: summary } },
    { id: "P2-s1", rowId: "g2-s1", startTime: d(2), endTime: d(3), props: { label: "Step 1", parentEventId: "P2", style: amber } },
    { id: "P2-s2", rowId: "g2-s2", startTime: d(5), endTime: d(6, 30), props: { label: "Step 2", parentEventId: "P2", style: amber } },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 8, padding: "8px 0", flexWrap: "wrap" }}>
        <button onClick={() => timelineRef.current?.toggleRow("g1")}>
          Toggle Group #1001
        </button>
        <button onClick={() => timelineRef.current?.toggleRow("g2")}>
          Toggle Group #1002
        </button>
        <button onClick={() => timelineRef.current?.setSelection(["P1"])}>
          Select Group #1001 (parent → children)
        </button>
        <button onClick={() => timelineRef.current?.setSelection([])}>
          Clear
        </button>
        <button
          onClick={() =>
            // stream a child move; the summary bar re-derives live
            timelineRef.current?.updateEvents([
              { op: "update", id: "P1-s2", changes: { startTime: d(5), endTime: d(6, 30) } },
            ])
          }
        >
          Push step 2 later (re-derives summary)
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
 * can only be dropped onto Track A/C (drag it elsewhere → not-allowed cursor,
 * snaps back). The green event is unrestricted. The red event is *misconfigured*
 * — it sits on Track D but its droppableRowIds doesn't include Track D, so the
 * library records `metadata.droppableError`; click "Inspect" to see it.
 */
export const TimelineDroppableRows = () => {
  const timelineRef = useRef<TimelineHandle>(null);
  const d = (h: number, m = 0) =>
    new Date(2024, 4, 27, h, m, 0).getTime() / 1000;

  const rows = [
    { id: "r1", name: "Track A" },
    { id: "r2", name: "Track B" },
    { id: "r3", name: "Track C" },
    { id: "r4", name: "Track D" },
  ];
  const blue = { fill: "#1e88e5", stroke: "#0d47a1", textColor: "#ffffff" };
  const green = { fill: "#43a047", stroke: "#1b5e20", textColor: "#ffffff" };
  const red = { fill: "#e53935", stroke: "#b71c1c", textColor: "#ffffff" };

  const events: EventType[] = [
    { id: "restricted", rowId: "r1", startTime: d(1), endTime: d(2, 30), props: { label: "Track A or C only", droppableRowIds: ["r1", "r3"], style: blue } },
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
 * `stripeOverlap`: where an event bar overlaps a static event (a band of
 * unavailable time) on the same row, its overlapping slice is hatched with 45°
 * stripes so an over-wide bar has a visible cause. Toggle it to compare. Row 1's
 * task straddles the band (striped over the band only); row 2's task starts at
 * the band's end (no overlap → no stripes), the shape of a task that may not be
 * split and so moved past the band whole. Stripe color is
 * `theme.overlapStripeColor`.
 */
export const TimelineStripedOverlap = () => {
  const [stripeOverlap, setStripeOverlap] = useState(true);
  const h = (hour: number) => new Date(2024, 4, 27, hour, 0, 0).getTime() / 1000;
  const rows = [
    { id: "split", name: "Track A (may pause)" },
    { id: "whole", name: "Track B (runs whole)" },
  ];
  // Both rows carry the same unavailable band 10:00–14:00.
  const staticEvents: EventType[] = [
    { id: "gap-split", rowId: "split", startTime: h(10), endTime: h(14) },
    { id: "gap-whole", rowId: "whole", startTime: h(10), endTime: h(14) },
  ];
  const events: EventType[] = [
    // straddles the band → its bar stretches over the gap; stripes mark the slice
    {
      id: "task-split",
      rowId: "split",
      startTime: h(8),
      endTime: h(18),
      props: { label: "Pausing task", style: { fill: "#2563eb", stroke: "#1e3a8a" } },
    },
    // starts at the band's end → no overlap → no stripes (moved whole)
    {
      id: "task-whole",
      rowId: "whole",
      startTime: h(14),
      endTime: h(20),
      props: { label: "Unbroken task", style: { fill: "#059669", stroke: "#064e3b" } },
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
  const report = rows.map((row) => {
    const rowEvents = events
      .filter((e) => e.rowId === row.id)
      .sort(sortEvents);
    const { laneOf, highestLane } = assignLanes(rowEvents);

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

/**
 * `onWindowChange`: the visible window reported on every pan, zoom and refit. Two consumers here —
 * the readout a date picker would show, and a strip below the board that draws each event's span
 * against the reported window, the way a coupled chart follows the timeline. Drag the background to
 * pan, ctrl/cmd + wheel to zoom; the strip and the readout must move with the bars. The inputs set
 * `startDate`/`endDate`, which refits the board and reports the new window through the same callback.
 */
export const TimelineWindowSync = () => {
  const d = (day: number, h: number) => new Date(2024, 4, day, h, 0, 0).getTime() / 1000;
  const rows = [
    { id: "m1", name: "Track 1" },
    { id: "m2", name: "Track 2" },
    { id: "m3", name: "Track 3" },
  ];
  const events: EventType[] = [];
  for (let day = 20; day < 34; day++) {
    rows.forEach((r, i) => {
      events.push({
        id: `${r.id}_${day}`,
        rowId: r.id,
        startTime: d(day, 6 + i * 2),
        endTime: d(day, 12 + i * 2),
        props: { label: `${r.name} · ${day}` },
      });
    });
  }

  const toInput = (s: number) => {
    const t = new Date(s * 1000);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}T${p(t.getHours())}:${p(t.getMinutes())}`;
  };
  const fromInput = (v: string) => Math.floor(new Date(v).getTime() / 1000);

  const [range, setRange] = useState({ from: d(27, 0), to: d(28, 0) });
  const [win, setWin] = useState<{ startTime: number; endTime: number } | null>(null);
  const [calls, setCalls] = useState(0);
  const [draft, setDraft] = useState({ from: toInput(range.from), to: toInput(range.to) });
  const onWindowChange = useCallback((r: { startTime: number; endTime: number }) => {
    setWin(r);
    setCalls((n) => n + 1);
  }, []);

  const HEADER = 100;
  const stripRef = useRef<HTMLDivElement>(null);
  const [stripW, setStripW] = useState(0);
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setStripW(e.contentRect.width - HEADER));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const x = (t: number) =>
    win ? ((t - win.startTime) / (win.endTime - win.startTime)) * stripW : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, font: "13px sans-serif" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="datetime-local" value={draft.from}
          onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
        <input type="datetime-local" value={draft.to}
          onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
        <button onClick={() => setRange({ from: fromInput(draft.from), to: fromInput(draft.to) })}>
          Apply
        </button>
        <span style={{ fontFamily: "monospace" }}>
          visible: {win ? `${toInput(win.startTime)} → ${toInput(win.endTime)}` : "—"} · callbacks: {calls}
        </span>
      </div>
      <div style={{ height: "40vh" }}>
        <Timeline
          rows={rows}
          events={events}
          startDate={new Date(range.from * 1000)}
          endDate={new Date(range.to * 1000)}
          onWindowChange={onWindowChange}
        />
      </div>
      <div ref={stripRef} style={{ position: "relative", height: 48, overflow: "hidden",
        borderTop: "1px solid #ddd", background: "#fafafa" }}>
        <div style={{ position: "absolute", left: 0, width: HEADER, top: 16, color: "#888" }}>coupled strip</div>
        <div style={{ position: "absolute", left: HEADER, right: 0, top: 0, bottom: 0, overflow: "hidden" }}>
          {events.map((e, i) => (
            <div key={e.id} style={{
              position: "absolute", top: 6 + (i % 3) * 13, height: 10,
              left: x(e.startTime), width: Math.max(1, x(e.endTime) - x(e.startTime)),
              background: ["#3b7dd8", "#15aec4", "#2e9e5b"][i % 3], borderRadius: 2,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
};

/** A second, headerless timeline under the main one, kept on the same window both ways: a shared
 *  pool (who holds each unit, stacked into lanes) and a level row whose coloured background bands
 *  are per-event static fills, with drops drawn as triangles. */
export const TimelineSecondaryStrip = () => {
  const d = (day: number, h: number, m = 0) => new Date(2024, 4, day, h, m, 0).getTime() / 1000;
  const [dense, setDense] = useState(false);
  const main = useRef<TimelineHandle>(null);
  const strip = useRef<TimelineHandle>(null);

  const tracks = [
    { id: "t1", name: "Track 1" }, { id: "t2", name: "Track 2" }, { id: "t3", name: "Track 3" },
  ];
  const { mainEvents, holders, drops } = React.useMemo(() => {
    const mainEvents: EventType[] = [];
    const holders: EventType[] = [];
    const drops: EventType[] = [];
    const perDay = dense ? 40 : 4;
    for (let day = 20; day < 34; day++) {
      for (let k = 0; k < perDay; k++) {
        tracks.forEach((tr, i) => {
          const start = d(day, 6, (k * 960) / perDay + i * 25);
          const end = start + (dense ? 1200 : 3 * 3600);
          const id = `${tr.id}_${day}_${k}`;
          mainEvents.push({ id, rowId: tr.id, startTime: start, endTime: end,
            props: { label: `T-${day}${k}${i} · ${tr.name}` } });
          holders.push({ id: `hold_${id}`, rowId: "pool", startTime: start, endTime: start + 1800,
            props: { label: `T-${day}${k}${i}`, isLocked: true } });
          if (i === 0) {
            drops.push({ id: `drop_${id}`, rowId: "level", startTime: start, endTime: start + 60,
              props: { label: "", isLocked: true, style: { fill: "#334155" } } });
          }
        });
      }
    }
    return { mainEvents, holders, drops };
  }, [dense]);

  const bands: EventType[] = [];
  for (let day = 20; day < 34; day++) {
    const state = day % 5 === 0 ? "#fde2e1" : day % 3 === 0 ? "#fef3c7" : "#dbeafe";
    bands.push({ id: `band_${day}`, rowId: "level", startTime: d(day, 0), endTime: d(day + 1, 0),
      props: { style: { fill: state } } });
  }

  const sameWindow = (a: { startTime: number; endTime: number }, b: { startTime: number; endTime: number }) =>
    Math.abs(a.startTime - b.startTime) < 1 && Math.abs(a.endTime - b.endTime) < 1;
  const follow = (target: React.RefObject<TimelineHandle>) =>
    (r: { startTime: number; endTime: number }) => {
      const t = target.current;
      if (t && !sameWindow(t.getVisibleRange(), r)) t.setWindow(r.startTime, r.endTime);
    };
  const onMainWindow = useCallback(follow(strip), []);
  const onStripWindow = useCallback(follow(main), []);

  const triangle: DrawEventFn = (ctx, _e, rect) => {
    const x = rect.x, r = 6, bottom = rect.y + rect.height;
    ctx.fillStyle = "#334155";
    ctx.beginPath();
    ctx.moveTo(x - r, bottom - r * 1.4);
    ctx.lineTo(x + r, bottom - r * 1.4);
    ctx.lineTo(x, bottom);
    ctx.closePath();
    ctx.fill();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "92vh", font: "13px sans-serif" }}>
      <label style={{ padding: 6 }}>
        <input type="checkbox" checked={dense} onChange={(e) => setDense(e.target.checked)} /> dense
        ({holders.length} pool events) — pan or zoom either timeline; the other follows
      </label>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Timeline ref={main} rows={tracks} events={mainEvents}
          startDate={new Date(d(24, 0) * 1000)} endDate={new Date(d(27, 0) * 1000)}
          onWindowChange={onMainWindow} />
      </div>
      <div style={{ height: 170 }}>
        <Timeline ref={strip}
          rows={[{ id: "pool", name: "Pool ×2" }, { id: "level", name: "Level" }]}
          events={[...holders, ...drops.map((f) => ({ ...f, props: { ...f.props, drawEvent: triangle } }))]}
          staticEvents={bands}
          startDate={new Date(d(24, 0) * 1000)} endDate={new Date(d(27, 0) * 1000)}
          showTimeBar={false} showRTIndicator={false} eventsResize={false} showEventPrompt={false}
          animations={false}
          theme={{ barHeight: 16, laneGap: 3, rowPaddingY: 6, barRadius: 4,
            eventFill: "#e2e8f0", eventStroke: "#94a3b8", eventTextColor: "#334155",
            font: "11px monospace" }}
          onWindowChange={onStripWindow} />
      </div>
    </div>
  );
};
