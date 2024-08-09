import React from "react";
import RowHeader from "./row-header";
import { RowType } from "../types";

const RowsHeader = ({
  rows,
  className,
}: {
  rows: RowType[];
  className?: string;
}) => {
  const classNames = className
    ? "rows-header-wrapper " + className
    : "rows-header-wrapper";
  return (
    <div className={classNames}>
      {rows.map((row) => (
        <RowHeader
          key={`row_header_${row.id}`}
          id={row.id}
          name={row.name}
        ></RowHeader>
      ))}
    </div>
  );
};
export default RowsHeader;
