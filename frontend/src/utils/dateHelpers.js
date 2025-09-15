import { format, subDays, parseISO, isWithinInterval } from 'date-fns';

export const formatDate = (date) => {
  return format(new Date(date), 'yyyy-MM-dd');
};

export const formatDateTime = (date) => {
  return format(new Date(date), 'yyyy-MM-dd HH:mm:ss');
};

export const getDateRange = (days = 30) => {
  const endDate = new Date();
  const startDate = subDays(endDate, days);
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  };
};

export const filterDataByDateRange = (data, startDate, endDate, dateField = 'date') => {
  if (!data || !Array.isArray(data)) return [];
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return data.filter(item => {
    const itemDate = new Date(item[dateField]);
    return isWithinInterval(itemDate, { start, end });
  });
};