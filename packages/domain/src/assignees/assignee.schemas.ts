import { z } from 'zod';
import { ASSIGNEE_TYPE_VALUES } from './assignee.types.js';

export const assigneeTypeSchema = z.enum(ASSIGNEE_TYPE_VALUES);

export const assigneeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  assigneeType: assigneeTypeSchema,
  active: z.boolean(),
  linkedUserId: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  archivedAt: z.string().datetime({ offset: true }).nullable()
});

export const createAssigneeSchema = z.object({
  name: z.string().min(1),
  assigneeType: assigneeTypeSchema.default('person'),
  notes: z.string().min(1).optional()
});

export type Assignee = z.infer<typeof assigneeSchema>;
export type CreateAssigneeInput = z.infer<typeof createAssigneeSchema>;
