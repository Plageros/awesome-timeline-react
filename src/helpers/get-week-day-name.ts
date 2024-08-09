const getWeekDayName = (dayIndex: number) => {
  let dayName: string | null = null;
  switch (dayIndex) {
    case 0:
      dayName = "Mon";
      break;
    case 1:
      dayName = "Tue";
      break;
    case 2:
      dayName = "Wed";
      break;
    case 3:
      dayName = "Thu";
      break;
    case 4:
      dayName = "Fri";
      break;
    case 5:
      dayName = "Sat";
      break;
    case 6:
      dayName = "Sun";
      break;
    default:
      dayName = "Mon";
  }

  return dayName;
};

export default getWeekDayName;
