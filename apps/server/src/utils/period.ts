export const getCurrentPeriod = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const semester = date.getMonth() < 6 ? 1 : 2;
  return `${semester}-${year}`;
};