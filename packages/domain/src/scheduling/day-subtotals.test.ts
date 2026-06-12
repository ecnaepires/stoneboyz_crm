import { describe, expect, it } from 'vitest';
import { daySubtotal, type DaySubtotalInput } from './day-subtotals.js';

describe('daySubtotal', () => {
  it('sums hours over all events; groups sqft by type in sortOrder', () => {
    const events: DaySubtotalInput[] = [
      { activityTypeId: 'aaa', activityTypeName: 'Template', durationMinutes: 120, sqft: 42, sqftIsEstimate: true, sortOrder: 1 },
      { activityTypeId: 'bbb', activityTypeName: 'Fabrication', durationMinutes: 60, sqft: 89, sqftIsEstimate: false, sortOrder: 2 },
      { activityTypeId: 'aaa', activityTypeName: 'Template', durationMinutes: 90, sqft: 100, sqftIsEstimate: false, sortOrder: 1 },
    ];

    const result = daySubtotal(events);

    expect(result.totalHours).toBeCloseTo(4.5);
    expect(result.byType).toHaveLength(2);
    expect(result.byType[0]).toEqual({ activityTypeId: 'aaa', name: 'Template', sqft: 142, isEstimate: true });
    expect(result.byType[1]).toEqual({ activityTypeId: 'bbb', name: 'Fabrication', sqft: 89, isEstimate: false });
  });

  it('marks type as estimate when any contributing event is an estimate', () => {
    const events: DaySubtotalInput[] = [
      { activityTypeId: 'aaa', activityTypeName: 'Template', durationMinutes: 60, sqft: 50, sqftIsEstimate: false, sortOrder: 1 },
      { activityTypeId: 'aaa', activityTypeName: 'Template', durationMinutes: 60, sqft: 30, sqftIsEstimate: true, sortOrder: 1 },
    ];

    const result = daySubtotal(events);

    expect(result.byType[0]?.isEstimate).toBe(true);
  });

  it('null-sqft events count toward hours but never create a byType entry; qualifying 0-sqft does appear', () => {
    const events: DaySubtotalInput[] = [
      { activityTypeId: null, activityTypeName: null, durationMinutes: 60, sqft: null, sqftIsEstimate: false },
      { activityTypeId: 'aaa', activityTypeName: 'Template', durationMinutes: 30, sqft: null, sqftIsEstimate: false },
      { activityTypeId: 'bbb', activityTypeName: 'Fabrication', durationMinutes: 45, sqft: 0, sqftIsEstimate: false, sortOrder: 1 },
    ];

    const result = daySubtotal(events);

    expect(result.totalHours).toBeCloseTo(2.25);
    expect(result.byType).toHaveLength(1);
    expect(result.byType[0]).toEqual({ activityTypeId: 'bbb', name: 'Fabrication', sqft: 0, isEstimate: false });
  });
});
