import React, { useCallback } from "react";
import { Timeline } from "./timeline";
import { EventType } from "./types";
export default {
  title: "Timeline",
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
          content: "cosik",
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
          {props?.metadata && props.metadata.title}
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
  );
};
