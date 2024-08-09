import { createContext } from "react";

type DragStartedContext = {
  dragStarted: boolean;
  setDragStarted: React.Dispatch<React.SetStateAction<boolean>>;
};

export const DragStartedContext = createContext<DragStartedContext>({
  dragStarted: false,
  setDragStarted: () => {},
});
