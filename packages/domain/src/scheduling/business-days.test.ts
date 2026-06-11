import { describe, expect, it } from 'vitest';
import { addBusinessDays, DEFAULT_AUTOSCHEDULE_HOUR_UTC, nextBusinessDayAt } from './business-days.js';

describe('addBusinessDays', () => {
  it('moves Friday +1 to Monday', () => {
    const friday = new Date('2026-06-12T09:00:00.000Z');
    expect(addBusinessDays(friday, 1).toISOString()).toBe('2026-06-15T09:00:00.000Z');
  });

  it('moves Thursday +2 to Monday', () => {
    const thursday = new Date('2026-06-11T09:00:00.000Z');
    expect(addBusinessDays(thursday, 2).toISOString()).toBe('2026-06-15T09:00:00.000Z');
  });

  it('moves Monday +1 to Tuesday', () => {
    const monday = new Date('2026-06-08T09:00:00.000Z');
    expect(addBusinessDays(monday, 1).toISOString()).toBe('2026-06-09T09:00:00.000Z');
  });

  it('moves Saturday +1 to Monday', () => {
    const saturday = new Date('2026-06-13T09:00:00.000Z');
    expect(addBusinessDays(saturday, 1).toISOString()).toBe('2026-06-15T09:00:00.000Z');
  });

  it('returns a copy when amount is zero', () => {
    const monday = new Date('2026-06-08T09:00:00.000Z');
    const result = addBusinessDays(monday, 0);
    expect(result.toISOString()).toBe(monday.toISOString());
    expect(result).not.toBe(monday);
  });

  it('preserves the time of day', () => {
    const wednesday = new Date('2026-06-10T13:45:30.000Z');
    expect(addBusinessDays(wednesday, 3).toISOString()).toBe('2026-06-15T13:45:30.000Z');
  });
});

describe('nextBusinessDayAt', () => {
  it('pins the result to the given UTC hour', () => {
    const monday = new Date('2026-06-08T15:30:00.000Z');
    expect(nextBusinessDayAt(monday, DEFAULT_AUTOSCHEDULE_HOUR_UTC).toISOString()).toBe(
      '2026-06-09T08:00:00.000Z'
    );
  });

  it('skips the weekend from Friday', () => {
    const friday = new Date('2026-06-12T15:30:00.000Z');
    expect(nextBusinessDayAt(friday, DEFAULT_AUTOSCHEDULE_HOUR_UTC).toISOString()).toBe(
      '2026-06-15T08:00:00.000Z'
    );
  });
});
