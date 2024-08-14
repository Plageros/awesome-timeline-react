import { createContext } from "react";
import { OnDropProps, OnResizeProps } from "../types";

type ExternalPropertiesType = {
  onDrop?: (props: OnDropProps) => void;
  onResize?: (props: OnResizeProps) => void;
  eventsResize?: boolean;
};

export const ExternalPropertiesContext = createContext<ExternalPropertiesType>(
  {}
);
