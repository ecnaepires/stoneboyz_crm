import { z } from 'zod';

export const jobChecklistSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  projectId: z.string().uuid(),
  phaseId: z.string().uuid(),
  depositReceived: z.boolean(),
  tearoutRequired: z.boolean(),
  tearoutCompleted: z.boolean(),
  readyToTemplate: z.boolean(),
  approvedForInstall: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true })
});

export const updateJobChecklistSchema = z
  .object({
    depositReceived: z.boolean().optional(),
    tearoutRequired: z.boolean().optional(),
    tearoutCompleted: z.boolean().optional(),
    readyToTemplate: z.boolean().optional(),
    approvedForInstall: z.boolean().optional()
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one field is required',
    path: []
  });
