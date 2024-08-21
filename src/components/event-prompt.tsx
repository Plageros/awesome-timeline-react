import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { EventPromptActionsType, EventType } from "../types";

type EventPromptType = {
  template?: (metadata?: any) => JSX.Element;
};

const EventPrompt = forwardRef<EventPromptActionsType, EventPromptType>(
  ({ template }, ref) => {
    const eventRef = useRef<HTMLDivElement | null>(null);
    const [hoveredEvent, setHoveredEvent] = useState<EventType>();
    useImperativeHandle(ref, () => {
      return {
        setDisplay(value: string) {
          if (eventRef.current) {
            eventRef.current.style.display = value;
          }
        },
        setRight(value: string) {
          if (eventRef.current) {
            eventRef.current.style.right = value;
          }
        },
        setBottom(value: string) {
          if (eventRef.current) {
            eventRef.current.style.bottom = value;
          }
        },
        setEvent(event: EventType) {
          setHoveredEvent(event);
        },
      };
    });
    return (
      <div className="event-prompt" ref={eventRef}>
        {template && hoveredEvent && template(hoveredEvent)}
      </div>
    );
  }
);

export default EventPrompt;
