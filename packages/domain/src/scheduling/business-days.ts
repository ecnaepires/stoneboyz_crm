// packages/domain/src/scheduling/business-days.ts
import type { ShopCalendar } from './shop-calendar.types.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_AUTOSCHEDULE_HOUR_UTC = 8;

export const isWorkingDate = (date: Date, calendar: ShopCalendar): boolean => {
  const dayOfWeek = date.getUTCDay();
  if (!calendar.workDays.includes(dayOfWeek)) return false;
  const isoDate = date.toISOString().slice(0, 10);
  return !calendar.holidays.includes(isoDate);
};

export const addBusinessDays = (from: Date, amount: number, calendar: ShopCalendar): Date => {
  const result = new Date(from.getTime());
  let remaining = amount;
  while (remaining > 0) {
    result.setTime(result.getTime() + DAY_MS);
    if (isWorkingDate(result, calendar)) {
      remaining -= 1;
    }
  }
  return result;
};

export const nextBusinessDayAt = (from: Date, hourUtc: number, calendar: ShopCalendar): Date => {
  const next = addBusinessDays(from, 1, calendar);
  next.setUTCHours(hourUtc, 0, 0, 0);
  return next;
};
