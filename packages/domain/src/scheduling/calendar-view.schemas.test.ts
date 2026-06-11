import { describe, expect, it } from 'vitest';
import { calendarViewConfigSchema } from './calendar-view.schemas.js';

describe('calendarViewConfigSchema', () => {
  it('fills calendar view config defaults', () => {
    const parsed = calendarViewConfigSchema.parse({
      version: 2,
      filters: {},
    });

    expect(parsed).toEqual({
      version: 2,
      displayType: 'week',
      groupBy: 'none',
      filters: {
        eventTypes: [],
        activityTypeIds: [],
        statuses: [],
        assigneeIds: [],
        hideCompleted: false,
      },
      displayFields: [
        'projectTitle',
        'customerName',
        'address',
        'activityTitle',
        'time',
        'status',
        'assignees',
      ],
      colorBy: 'appointmentType',
      wrapText: true,
      autoRefreshSeconds: null,
      showDaySubtotals: false,
    });
  });
});
