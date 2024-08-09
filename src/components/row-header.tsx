import React, { useContext } from "react";
import "./style.css";
import { RowsHeightContext } from "../contexts/row-height-context";

const RowHeader = ({ name, id }: { name: string; id: string }) => {
  const rowsHeightContext = useContext(RowsHeightContext);

  const minHeight =
    rowsHeightContext &&
    rowsHeightContext.rowsHeight &&
    rowsHeightContext.rowsHeight[id]
      ? rowsHeightContext.rowsHeight[id].minHeight
      : 40;

  return (
    <div className="row-header" style={{ minHeight: minHeight }}>
      {name}
    </div>
  );
};

export default RowHeader;
