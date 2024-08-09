import { EventType } from "../types";

const sortEvents = (eventA: EventType, eventB: EventType) => {
  if (eventA.startTime - eventB.startTime < 0) return -1;
  if (eventA.startTime === eventB.startTime) {
    if (eventA.endTime < eventB.endTime) {
      return -1;
    } else {
      return 1;
    }
  } else {
    return 1;
  }
};
export default sortEvents;
