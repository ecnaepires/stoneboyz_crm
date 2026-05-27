import { z } from 'zod';

const actorUserIdSchema = z.string().uuid();

export const tagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  color: z.string().min(1).nullable(),
  archivedAt: z.string().datetime({ offset: true }).nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true })
});

export const createTagSchema = z.object({
  name: z.string().min(1),
  color: z.string().min(1).optional()
});

export const updateTagSchema = z
  .object({
    actorUserId: actorUserIdSchema,
    name: z.string().min(1).optional(),
    color: z.string().min(1).nullable().optional()
  })
  .refine((input) => Object.keys(input).length > 1, {
    message: 'At least one field is required',
    path: []
  });

export const archiveTagSchema = z.object({
  actorUserId: actorUserIdSchema
});

export const listTagsSchema = z.object({
  includeArchived: z.boolean().default(false)
});

export const tagAssignmentSchema = z.object({
  tagId: z.string().uuid()
});
