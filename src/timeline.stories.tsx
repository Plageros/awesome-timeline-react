import React from "react";
import { Timeline } from "./timeline";
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
        },
      },
      {
        id: `2_${i}`,
        rowId: `${i}`,
        startTime: new Date(2024, 4, 27, 0, 0, 0).getTime() / 1000,
        endTime: (new Date(2024, 4, 27, 0, 0, 0).getTime() + 5000000) / 1000,
        props: {
          content: "cosik",
        },
      },
      {
        id: `3_${i}`,
        rowId: `${i}`,
        startTime: new Date(2024, 4, 27, 0, 30, 0).getTime() / 1000,
        endTime: (new Date(2024, 4, 27, 0, 30, 0).getTime() + 5000000) / 1000,
      }
    );
  }

  return (
    <Timeline
      rows={rows}
      events={events}
      startDate={new Date(2024, 4, 27, 23)}
      endDate={new Date(2024, 4, 28, 23)}
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
