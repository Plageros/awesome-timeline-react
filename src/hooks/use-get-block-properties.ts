import { useMemo } from "react";

const useGetBlockProperties = ({
  windowTime,
  contentWidth,
}: {
  windowTime: number[];
  contentWidth: number | null;
}) => {
  const numberOfHourBlocks = useMemo(
    () => (windowTime[1] - windowTime[0]) / 3600,
    [windowTime]
  );

  const blockWidth = contentWidth ? contentWidth / numberOfHourBlocks : 0;

  return { numberOfHourBlocks, blockWidth };
};

export default useGetBlockProperties;
