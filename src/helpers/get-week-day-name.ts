// Maps a JS Date.getDay() index (0 = Sunday … 6 = Saturday) to a short name.
const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getWeekDayName = (dayIndex: number) =>
  WEEKDAY_NAMES[dayIndex] ?? "Sun";

export default getWeekDayName;
