import { z } from 'zod';

export const createQuoteNoteSchema = z.object({
  body: z.string().min(1),
  isPublic: z.boolean().default(false)
});

export const updateQuoteNoteSchema = z.object({
  body: z.string().min(1)
});

export const archiveQuoteNoteSchema = z.object({});
