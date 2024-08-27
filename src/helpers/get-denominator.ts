import { TimeBarPatternType } from "../types";

const denominatorMap = {
  hour: 3600,
  day: 24 * 3600,
  week: 7 * 24 * 3600,
};

const getDenominator = (pattern: TimeBarPatternType) => {
  return denominatorMap[pattern];
};

export default getDenominator;
