import { z } from 'zod';

const actorUserIdSchema = z.string().uuid();

export const phaseSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  projectId: z.string().uuid(),
  phaseNumber: z.number().int().min(1),
  name: z.string().min(1),
  archivedAt: z.string().datetime({ offset: true }).nullable(),
  archivedByUserId: z.string().uuid().nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true })
});

export const createPhaseSchema = z.object({
  actorUserId: actorUserIdSchema,
  name: z.string().min(1)
});

export const updatePhaseSchema = z.object({
  actorUserId: actorUserIdSchema,
  name: z.string().min(1).optional()
}).refine((input) => Object.keys(input).length > 1, {
  message: 'At least one field is required',
  path: []
});

export const archivePhaseSchema = z.object({
  actorUserId: actorUserIdSchema
});
