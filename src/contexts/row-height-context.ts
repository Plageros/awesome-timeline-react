import { createContext } from "react";
import { RowsHeightType } from "../types";

type RowsHeightContextType = {
  rowsHeight: Record<string, RowsHeightType> | null;
  setRowsHeight: React.Dispatch<
    React.SetStateAction<Record<string, RowsHeightType> | null>
  >;
  allRowsHeight: number;
  setAllRowsHeight: React.Dispatch<React.SetStateAction<number>>;
};

export const RowsHeightContext = createContext<RowsHeightContextType | null>(
  null
);
