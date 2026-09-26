// apps/client/src/utils/format.ts
export const formatDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

export const formatDateRange = (start: string, end: string): string => {
  return `${formatDate(start)} – ${formatDate(end)}`;
};
