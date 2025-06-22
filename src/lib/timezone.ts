// Timezone utilities for consistent date/time handling
import { parseISO } from 'date-fns';
import { format, toZonedTime, fromZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Los_Angeles';

export const formatInTimezone = (date: Date | string, formatString: string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const zonedDate = toZonedTime(dateObj, TIMEZONE);
  return format(zonedDate, formatString);
};

export const getCurrentDateInTimezone = (): string => {
  const now = new Date();
  const zonedDate = toZonedTime(now, TIMEZONE);
  return format(zonedDate, 'yyyy-MM-dd');
};

export const getCurrentTimeInTimezone = (): string => {
  const now = new Date();
  const zonedDate = toZonedTime(now, TIMEZONE);
  return format(zonedDate, 'HH:mm:ss');
};

export const convertToTimezone = (date: Date): Date => {
  return toZonedTime(date, TIMEZONE);
};

export const convertFromTimezone = (date: Date): Date => {
  return fromZonedTime(date, TIMEZONE);
};

export { TIMEZONE };