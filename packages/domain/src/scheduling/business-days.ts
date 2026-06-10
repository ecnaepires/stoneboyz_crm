const DAY_MS = 24 * 60 * 60 * 1000;

// v1 computes placeholder times in UTC for determinism; shop-local timezone is
// a later config concern. Autoscheduled times are meant to be edited.
export const DEFAULT_AUTOSCHEDULE_HOUR_UTC = 8;

const isWeekend = (date: Date): boolean => {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
};

export const addBusinessDays = (from: Date, amount: number): Date => {
  const result = new Date(from.getTime());
  let remaining = amount;
  while (remaining > 0) {
    result.setTime(result.getTime() + DAY_MS);
    if (!isWeekend(result)) {
      remaining -= 1;
    }
  }
  return result;
};

export const nextBusinessDayAt = (from: Date, hourUtc: number): Date => {
  const next = addBusinessDays(from, 1);
  next.setUTCHours(hourUtc, 0, 0, 0);
  return next;
};
