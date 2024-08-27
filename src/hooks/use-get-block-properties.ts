import { useMemo } from "react";
import { TimeBarPatternType } from "../types";
import getDenominator from "../helpers/get-denominator";

const useGetBlockProperties = ({
  windowTime,
  contentWidth,
  timeBarPattern,
}: {
  windowTime: number[];
  contentWidth: number | null;
  timeBarPattern: TimeBarPatternType;
}) => {
  const numberOfBlocks = useMemo(
    () => (windowTime[1] - windowTime[0]) / getDenominator(timeBarPattern),
    [windowTime]
  );

  const blockWidth = contentWidth ? contentWidth / numberOfBlocks : 0;

  return { numberOfHourBlocks: numberOfBlocks, blockWidth };
};

export default useGetBlockProperties;
