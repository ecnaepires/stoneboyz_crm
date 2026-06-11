import { describe, expect, it } from 'vitest';
import { activityTypeSchema, createActivityTypeSchema, updateActivityTypeSchema } from './activity-type.schemas.js';

describe('activity type schemas', () => {
  it('validates catalog rows', () => {
    expect(
      activityTypeSchema.parse({
        id: crypto.randomUUID(),
        shopId: crypto.randomUUID(),
        name: 'Template',
        seedSlug: 'template',
        color: '#00ff4c',
        pipelineStage: 'template',
        countsSquareFootage: true,
        autoscheduleEligible: true,
        usesTemplateKind: true,
        defaultDurationMinutes: 90,
        sortOrder: 1,
        archivedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).seedSlug,
    ).toBe('template');
  });

  it('rejects bad colors and empty updates', () => {
    expect(() => createActivityTypeSchema.parse({ name: 'Bad', color: 'green' })).toThrow();
    expect(() => updateActivityTypeSchema.parse({})).toThrow();
  });
});
