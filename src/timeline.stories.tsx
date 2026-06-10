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
