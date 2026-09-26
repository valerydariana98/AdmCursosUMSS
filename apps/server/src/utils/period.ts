export const getCurrentPeriod = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const semester = date.getMonth() < 6 ? 1 : 2;
  return `${semester}-${year}`;
};

export const getCurrentPeriodYear = (date: Date = new Date()): number => {
  return date.getFullYear();
};

export const getPeriodYear = (period: string): number => {
  return Number(period.split('-')[1]);
};