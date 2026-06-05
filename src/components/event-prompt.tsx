import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { computePosition, flip, offset, shift } from "@floating-ui/dom";
import { EventPromptActionsType, EventType } from "../types";
import type { Rect } from "../core/types";

type EventPromptType = {
  template?: (event: EventType) => JSX.Element;
};

/**
 * Hover tooltip for events. Positioned with @floating-ui/dom against the
 * hovered event's rect (viewport coordinates): preferred above the event,
 * flips below when there is no room, and shifts horizontally to stay
 * on-screen.
 */
const EventPrompt = forwardRef<EventPromptActionsType, EventPromptType>(
  ({ template }, ref) => {
    const promptRef = useRef<HTMLDivElement | null>(null);
    const [hoveredEvent, setHoveredEvent] = useState<EventType>();
    // guards against an async position landing after hide()
    const showSeqRef = useRef(0);

    useImperativeHandle(ref, () => {
      return {
        show(event: EventType, anchorRect: Rect) {
          const prompt = promptRef.current;
          if (!prompt) return;
          setHoveredEvent(event);
          const seq = ++showSeqRef.current;

          const virtualAnchor = {
            getBoundingClientRect: () => ({
              x: anchorRect.x,
              y: anchorRect.y,
              width: anchorRect.width,
              height: anchorRect.height,
              top: anchorRect.y,
              left: anchorRect.x,
              right: anchorRect.x + anchorRect.width,
              bottom: anchorRect.y + anchorRect.height,
            }),
          };

          // render invisibly first so floating-ui can measure the template
          prompt.style.display = "block";
          prompt.style.visibility = "hidden";
          computePosition(virtualAnchor, prompt, {
            placement: "top",
            middleware: [
              offset(8),
              flip({ padding: 8 }),
              shift({ padding: 8 }),
            ],
          }).then(({ x, y }) => {
            if (seq !== showSeqRef.current || !promptRef.current) return;
            promptRef.current.style.left = `${x}px`;
            promptRef.current.style.top = `${y}px`;
            promptRef.current.style.visibility = "visible";
          });
        },
        hide() {
          showSeqRef.current++;
          if (promptRef.current) {
            promptRef.current.style.display = "none";
          }
        },
      };
    });

    return (
      <div className="event-prompt" ref={promptRef}>
        {template && hoveredEvent && template(hoveredEvent)}
      </div>
    );
  }
);

export default EventPrompt;
