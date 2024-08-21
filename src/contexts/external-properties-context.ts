import { createContext } from "react";
import { EventPromptActionsType, OnDropProps, OnResizeProps } from "../types";

type ExternalPropertiesType = {
  onDrop?: (props: OnDropProps) => void;
  onResize?: (props: OnResizeProps) => void;
  eventsResize?: boolean;
  eventPromptRef?: React.MutableRefObject<EventPromptActionsType | null>;
};

export const ExternalPropertiesContext = createContext<ExternalPropertiesType>(
  {}
);
