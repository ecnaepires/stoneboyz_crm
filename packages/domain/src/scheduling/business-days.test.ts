import { describe, expect, it } from 'vitest';
import type { ShopCalendar } from './shop-calendar.types.js';
import { addBusinessDays, DEFAULT_AUTOSCHEDULE_HOUR_UTC, isWorkingDate, nextBusinessDayAt } from './business-days.js';

const MON_TO_FRI: ShopCalendar = { workDays: [1, 2, 3, 4, 5], holidays: [] };
const TUE_TO_SAT: ShopCalendar = { workDays: [2, 3, 4, 5, 6], holidays: [] };
const WITH_HOLIDAY: ShopCalendar = { workDays: [1, 2, 3, 4, 5], holidays: ['2026-06-18'] };

describe('isWorkingDate', () => {
  it('Monday is a working date on Mon–Fri calendar', () => {
    expect(isWorkingDate(new Date('2026-06-08T09:00:00.000Z'), MON_TO_FRI)).toBe(true);
  });
  it('Monday is NOT a working date on Tue–Sat calendar', () => {
    expect(isWorkingDate(new Date('2026-06-08T09:00:00.000Z'), TUE_TO_SAT)).toBe(false);
  });
  it('Saturday IS a working date on Tue–Sat calendar', () => {
    expect(isWorkingDate(new Date('2026-06-13T09:00:00.000Z'), TUE_TO_SAT)).toBe(true);
  });
  it('a holiday date is not a working date', () => {
    expect(isWorkingDate(new Date('2026-06-18T09:00:00.000Z'), WITH_HOLIDAY)).toBe(false);
  });
  it('a holiday on a non-work-day changes nothing', () => {
    const calWithWeekendHoliday: ShopCalendar = { workDays: [1, 2, 3, 4, 5], holidays: ['2026-06-13'] };
    expect(isWorkingDate(new Date('2026-06-13T09:00:00.000Z'), calWithWeekendHoliday)).toBe(false);
    expect(isWorkingDate(new Date('2026-06-15T09:00:00.000Z'), calWithWeekendHoliday)).toBe(true);
  });
});

describe('addBusinessDays', () => {
  it('moves Friday +1 to Monday', () => {
    const friday = new Date('2026-06-12T09:00:00.000Z');
    expect(addBusinessDays(friday, 1, MON_TO_FRI).toISOString()).toBe('2026-06-15T09:00:00.000Z');
  });
  it('moves Thursday +2 to Monday', () => {
    const thursday = new Date('2026-06-11T09:00:00.000Z');
    expect(addBusinessDays(thursday, 2, MON_TO_FRI).toISOString()).toBe('2026-06-15T09:00:00.000Z');
  });
  it('moves Monday +1 to Tuesday', () => {
    const monday = new Date('2026-06-08T09:00:00.000Z');
    expect(addBusinessDays(monday, 1, MON_TO_FRI).toISOString()).toBe('2026-06-09T09:00:00.000Z');
  });
  it('moves Saturday +1 to Monday', () => {
    const saturday = new Date('2026-06-13T09:00:00.000Z');
    expect(addBusinessDays(saturday, 1, MON_TO_FRI).toISOString()).toBe('2026-06-15T09:00:00.000Z');
  });
  it('returns a copy when amount is zero', () => {
    const monday = new Date('2026-06-08T09:00:00.000Z');
    const result = addBusinessDays(monday, 0, MON_TO_FRI);
    expect(result.toISOString()).toBe(monday.toISOString());
    expect(result).not.toBe(monday);
  });
  it('preserves the time of day', () => {
    const wednesday = new Date('2026-06-10T13:45:30.000Z');
    expect(addBusinessDays(wednesday, 3, MON_TO_FRI).toISOString()).toBe('2026-06-15T13:45:30.000Z');
  });
  it('Tue–Sat: Friday +1 lands on Saturday', () => {
    const friday = new Date('2026-06-12T09:00:00.000Z');
    expect(addBusinessDays(friday, 1, TUE_TO_SAT).toISOString()).toBe('2026-06-13T09:00:00.000Z');
  });
  it('a holiday mid-chain pushes the landing day by one', () => {
    const wednesday = new Date('2026-06-17T09:00:00.000Z');
    expect(addBusinessDays(wednesday, 3, WITH_HOLIDAY).toISOString()).toBe('2026-06-23T09:00:00.000Z');
  });
});

describe('nextBusinessDayAt', () => {
  it('pins the result to the given UTC hour', () => {
    const monday = new Date('2026-06-08T15:30:00.000Z');
    expect(nextBusinessDayAt(monday, DEFAULT_AUTOSCHEDULE_HOUR_UTC, MON_TO_FRI).toISOString()).toBe(
      '2026-06-09T08:00:00.000Z'
    );
  });
  it('skips the weekend from Friday', () => {
    const friday = new Date('2026-06-12T15:30:00.000Z');
    expect(nextBusinessDayAt(friday, DEFAULT_AUTOSCHEDULE_HOUR_UTC, MON_TO_FRI).toISOString()).toBe(
      '2026-06-15T08:00:00.000Z'
    );
  });
  it('Tue–Sat: next day from Saturday is Tuesday', () => {
    const saturday = new Date('2026-06-13T15:30:00.000Z');
    expect(nextBusinessDayAt(saturday, DEFAULT_AUTOSCHEDULE_HOUR_UTC, TUE_TO_SAT).toISOString()).toBe(
      '2026-06-16T08:00:00.000Z'
    );
  });
});
