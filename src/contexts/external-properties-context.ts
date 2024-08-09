import { createContext } from "react";
import { OnDropProps } from "../types";

type ExternalPropertiesType = {
  onDrop?: (props: OnDropProps) => void;
};

export const ExternalPropertiesContext = createContext<ExternalPropertiesType>(
  {}
);
