import { z } from 'zod';

export const createJobNoteSchema = z.object({
  body: z.string().min(1)
});

export const updateJobNoteSchema = z.object({
  body: z.string().min(1)
});

export const archiveJobNoteSchema = z.object({});
