import { z } from 'zod';
import { appointmentTypeSchema, scheduledEventTypeSchema, templateKindSchema } from '../scheduling/scheduled-event.schemas.js';

export const jobTemplateActivitySpecSchema = z.object({
  sortOrder: z.number().int().min(1),
  title: z.string().min(1),
  eventType: scheduledEventTypeSchema,
  appointmentType: appointmentTypeSchema.nullable(),
  templateKind: templateKindSchema.nullable(),
  durationMinutes: z.number().int().min(1),
  notes: z.string().nullable()
});

export const jobTemplateSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  isDefault: z.boolean(),
  activitySpecs: z.array(jobTemplateActivitySpecSchema).min(1),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true })
});
