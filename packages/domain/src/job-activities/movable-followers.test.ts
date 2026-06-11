import { describe, expect, it } from 'vitest';
import { movableFollowers, type MovableFollowerCandidate } from './movable-followers.js';

const activity = (
  overrides: Partial<MovableFollowerCandidate>,
): MovableFollowerCandidate => ({
  id: crypto.randomUUID(),
  title: 'Activity',
  status: 'scheduled',
  sortOrder: 1,
  scheduledEventId: crypto.randomUUID(),
  autoscheduleState: 'autoscheduled',
  autoscheduleEligible: true,
  ...overrides,
});

describe('movableFollowers', () => {
  it('returns later autoscheduled scheduled or confirmed followers in sort order', () => {
    const anchor = activity({ id: 'anchor', sortOrder: 10 });
    const late = activity({ id: 'late', sortOrder: 30, status: 'confirmed' });
    const early = activity({ id: 'early', sortOrder: 20 });

    expect(movableFollowers([late, early, anchor], anchor).map((item) => item.id)).toEqual([
      'early',
      'late',
    ]);
  });

  it('skips previous, manual, incomplete-link, and non-reschedulable followers', () => {
    const anchor = activity({ id: 'anchor', sortOrder: 10 });

    expect(
      movableFollowers(
        [
          activity({ id: 'previous', sortOrder: 5 }),
          activity({ id: 'manual', sortOrder: 20, autoscheduleState: 'manual_override' }),
          activity({ id: 'no-event', sortOrder: 30, scheduledEventId: null }),
          activity({ id: 'done', sortOrder: 40, status: 'completed' }),
          activity({ id: 'ineligible', sortOrder: 45, autoscheduleEligible: false }),
          activity({ id: 'movable', sortOrder: 50 }),
        ],
        anchor,
      ).map((item) => item.id),
    ).toEqual(['movable']);
  });
});
