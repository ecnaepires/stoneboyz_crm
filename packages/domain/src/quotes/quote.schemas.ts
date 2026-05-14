import { z } from 'zod';
import { QUOTE_STATUS_VALUES } from './quote.types.js';

export const quoteStatusSchema = z.enum(QUOTE_STATUS_VALUES);

const optionalDateSchema = z.string().date();

export const transitionQuoteSchema = z.object({
  actorUserId: z.string().uuid()
});

export const archiveQuoteSchema = transitionQuoteSchema;

export const createQuoteLineItemSchema = z.object({
  actorUserId: z.string().uuid(),
  sortOrder: z.number().int().default(0),
  stoneType: z.string().min(1),
  lengthMm: z.number().int().optional(),
  widthMm: z.number().int().optional(),
  thicknessMm: z.number().int().optional(),
  edgeProfile: z.string().min(1).optional(),
  qty: z.number().positive(),
  qtyUnit: z.string().min(1),
  unitPriceCents: z.number().int().min(0),
  laborPriceCents: z.number().int().min(0).default(0),
  notes: z.string().min(1).optional()
});

export const updateQuoteLineItemSchema = z.object({
  actorUserId: z.string().uuid(),
  sortOrder: z.number().int().optional(),
  stoneType: z.string().min(1).optional(),
  lengthMm: z.number().int().nullable().optional(),
  widthMm: z.number().int().nullable().optional(),
  thicknessMm: z.number().int().nullable().optional(),
  edgeProfile: z.string().min(1).nullable().optional(),
  qty: z.number().positive().optional(),
  qtyUnit: z.string().min(1).optional(),
  unitPriceCents: z.number().int().min(0).optional(),
  laborPriceCents: z.number().int().min(0).optional(),
  notes: z.string().min(1).nullable().optional()
}).refine((input) => Object.keys(input).some((key) => key !== 'actorUserId'), {
  message: 'At least one field is required',
  path: []
});

const initialLineItemSchema = createQuoteLineItemSchema;

export const createQuoteSchema = z.object({
  actorUserId: z.string().uuid(),
  title: z.string().min(1),
  projectId: z.string().uuid().optional(),
  validUntil: optionalDateSchema.optional(),
  discountCents: z.number().int().min(0).default(0),
  taxRateBps: z.number().int().min(0).default(0),
  notes: z.string().min(1).optional(),
  termsAndConditions: z.string().min(1).optional(),
  lineItems: z.array(initialLineItemSchema).optional()
});

export const updateQuoteSchema = z.object({
  actorUserId: z.string().uuid(),
  title: z.string().min(1).optional(),
  projectId: z.string().uuid().nullable().optional(),
  validUntil: optionalDateSchema.nullable().optional(),
  discountCents: z.number().int().min(0).optional(),
  taxRateBps: z.number().int().min(0).optional(),
  notes: z.string().min(1).nullable().optional(),
  termsAndConditions: z.string().min(1).nullable().optional()
}).refine((input) => Object.keys(input).some((key) => key !== 'actorUserId'), {
  message: 'At least one field is required',
  path: []
});

export const listQuotesSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).default(25),
  status: quoteStatusSchema.optional(),
  projectId: z.string().uuid().optional(),
  includeArchived: z.boolean().default(false)
});
