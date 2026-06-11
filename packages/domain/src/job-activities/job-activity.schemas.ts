import { z } from 'zod';
import { appointmentTypeSchema, scheduledEventTypeSchema, templateKindSchema } from '../scheduling/scheduled-event.schemas.js';
import { AUTOSCHEDULE_STATE_VALUES, JOB_ACTIVITY_STATUS_VALUES } from './job-activity.types.js';

export const jobActivityStatusSchema = z.enum(JOB_ACTIVITY_STATUS_VALUES);
export const autoscheduleStateSchema = z.enum(AUTOSCHEDULE_STATE_VALUES);

export const jobActivitySchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  projectId: z.string().uuid(),
  jobTemplateId: z.string().uuid(),
  templateActivityKey: z.string().min(1),
  title: z.string().min(1),
  activityType: scheduledEventTypeSchema,
  activityTypeId: z.string().uuid().nullable(),
  appointmentType: appointmentTypeSchema.nullable(),
  templateKind: templateKindSchema.nullable(),
  status: jobActivityStatusSchema,
  sortOrder: z.number().int().min(1),
  durationMinutes: z.number().int().min(1),
  scheduledEventId: z.string().uuid().nullable(),
  autoscheduleState: autoscheduleStateSchema.nullable(),
  autoscheduleOffsetAmount: z.number().int().nullable(),
  autoscheduleOffsetUnit: z.string().nullable(),
  dependsOnActivityId: z.string().uuid().nullable(),
  manualOverrideAt: z.string().datetime({ offset: true }).nullable(),
  autoscheduleEligible: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true })
});

export const scheduleJobActivitySchema = z.object({
  scheduledAt: z.string().datetime({ offset: true }),
  durationMinutes: z.number().int().min(1).optional(),
  assigneeIds: z.array(z.string().uuid()).refine(
    (ids) => new Set(ids).size === ids.length,
    { message: 'Assignee IDs must be unique' }
  ).default([])
});
