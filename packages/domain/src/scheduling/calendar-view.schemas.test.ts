import { describe, expect, it } from 'vitest';
import { calendarViewConfigSchema } from './calendar-view.schemas.js';

describe('calendarViewConfigSchema', () => {
  it('fills calendar view config defaults', () => {
    const parsed = calendarViewConfigSchema.parse({
      version: 1,
      filters: {},
    });

    expect(parsed).toEqual({
      version: 1,
      displayType: 'week',
      groupBy: 'none',
      filters: {
        eventTypes: [],
        appointmentTypes: [],
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
    });
  });
});
