import { z } from 'zod';
import { QUOTE_STATUS_VALUES } from './quote.types.js';

export const quoteStatusSchema = z.enum(QUOTE_STATUS_VALUES);

const optionalDateSchema = z.string().date();

export const transitionQuoteSchema = z.object({});

export const archiveQuoteSchema = transitionQuoteSchema;

export const createQuoteAreaSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().default(0),
  material: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  edgeProfile: z.string().min(1).optional(),
  notes: z.string().min(1).optional()
});

export const updateQuoteAreaSchema = z.object({
  name: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
  material: z.string().min(1).nullable().optional(),
  color: z.string().min(1).nullable().optional(),
  edgeProfile: z.string().min(1).nullable().optional(),
  notes: z.string().min(1).nullable().optional()
}).refine(
  (input) => Object.keys(input).length > 0,
  { message: 'At least one field is required', path: [] }
);

export const createQuoteLineItemSchema = z.object({
  quoteAreaId: z.string().uuid().optional(),
  slabId: z.string().uuid().optional(),
  sortOrder: z.number().int().default(0),
  stoneType: z.string().min(1),
  lengthIn: z.number().positive().optional(),
  widthIn: z.number().positive().optional(),
  thicknessCm: z.number().positive().optional(),
  edgeProfile: z.string().min(1).optional(),
  qty: z.number().positive(),
  qtyUnit: z.string().min(1),
  unitPriceCents: z.number().int().min(0),
  laborPriceCents: z.number().int().min(0).default(0),
  notes: z.string().min(1).optional()
});

export const updateQuoteLineItemSchema = z.object({
  quoteAreaId: z.string().uuid().nullable().optional(),
  slabId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().optional(),
  stoneType: z.string().min(1).optional(),
  lengthIn: z.number().positive().nullable().optional(),
  widthIn: z.number().positive().nullable().optional(),
  thicknessCm: z.number().positive().nullable().optional(),
  edgeProfile: z.string().min(1).nullable().optional(),
  qty: z.number().positive().optional(),
  qtyUnit: z.string().min(1).optional(),
  unitPriceCents: z.number().int().min(0).optional(),
  laborPriceCents: z.number().int().min(0).optional(),
  notes: z.string().min(1).nullable().optional()
}).refine((input) => Object.keys(input).length > 0, {
  message: 'At least one field is required',
  path: []
});

const initialLineItemSchema = createQuoteLineItemSchema;

export const createQuoteSchema = z.object({
  title: z.string().min(1),
  projectId: z.string().uuid().optional(),
  phaseId: z.string().uuid().optional(),
  priceListId: z.string().uuid().nullish(),
  validUntil: optionalDateSchema.optional(),
  discountCents: z.number().int().min(0).default(0),
  taxRateBps: z.number().int().min(0).default(0),
  termsAndConditions: z.string().min(1).optional(),
  lineItems: z.array(initialLineItemSchema).optional()
});

export const updateQuoteSchema = z.object({
  title: z.string().min(1).optional(),
  projectId: z.string().uuid().nullable().optional(),
  phaseId: z.string().uuid().nullable().optional(),
  priceListId: z.string().uuid().nullable().optional(),
  validUntil: optionalDateSchema.nullable().optional(),
  discountCents: z.number().int().min(0).optional(),
  taxRateBps: z.number().int().min(0).optional(),
  termsAndConditions: z.string().min(1).nullable().optional()
}).refine((input) => Object.keys(input).length > 0, {
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
