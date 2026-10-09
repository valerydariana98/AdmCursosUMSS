export { getCurrentPeriod } from 'shared';

export const getCurrentPeriodYear = (date: Date = new Date()): number => {
  return date.getFullYear();
};

export const getPeriodYear = (period: string): number => {
  return Number(period.split('-')[1]);
};