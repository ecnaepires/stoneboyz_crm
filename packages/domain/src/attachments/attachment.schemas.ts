import { z } from 'zod';
import { ATTACHABLE_TYPE_VALUES, ATTACHMENT_CATEGORY_VALUES } from './attachment.types.js';

const attachableTypeSchema = z.enum(ATTACHABLE_TYPE_VALUES);
const attachmentCategorySchema = z.enum(ATTACHMENT_CATEGORY_VALUES);
const actorUserIdSchema = z.string().uuid();

export const attachmentSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  attachableType: attachableTypeSchema,
  attachableId: z.string().uuid(),
  category: attachmentCategorySchema,
  label: z.string().nullable(),
  filePath: z.string().min(1),
  mimeType: z.string().min(1).nullable(),
  sizeBytes: z.number().int().nonnegative().nullable(),
  uploadedByUserId: z.string().uuid().nullable(),
  uploadedAt: z.string().datetime({ offset: true }),
  deletedAt: z.string().datetime({ offset: true }).nullable(),
  deletedByUserId: z.string().uuid().nullable(),
  createdAt: z.string().datetime({ offset: true })
});

export const createAttachmentSchema = z.object({
  attachableType: attachableTypeSchema,
  attachableId: z.string().uuid(),
  category: attachmentCategorySchema.default('other'),
  label: z.string().min(1).optional(),
  filePath: z.string().min(1),
  mimeType: z.string().min(1).optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  uploadedByUserId: z.string().uuid()
});

export const listAttachmentsSchema = z.object({
  attachableType: attachableTypeSchema,
  attachableId: z.string().uuid()
});

export const archiveAttachmentSchema = z.object({
  actorUserId: actorUserIdSchema
});
