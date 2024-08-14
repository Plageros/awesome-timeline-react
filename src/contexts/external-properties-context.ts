import { createContext } from "react";
import { OnDropProps, OnResizeProps } from "../types";

type ExternalPropertiesType = {
  onDrop?: (props: OnDropProps) => void;
  onResize?: (props: OnResizeProps) => void;
};

export const ExternalPropertiesContext = createContext<ExternalPropertiesType>(
  {}
);
