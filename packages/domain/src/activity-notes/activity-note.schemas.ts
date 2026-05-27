import { z } from 'zod';

export const createActivityNoteSchema = z.object({
  body: z.string().min(1)
});

export const updateActivityNoteSchema = z.object({
  body: z.string().min(1)
});

export const archiveActivityNoteSchema = z.object({});
