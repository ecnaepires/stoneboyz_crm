import { z } from 'zod';
import { PRICE_CATEGORY_VALUES } from './quote-pricing.types.js';

export const priceCategorySchema = z.enum(PRICE_CATEGORY_VALUES);

export const generatedPriceLineSchema = z.object({
  id: z.string().uuid(),
  quoteAreaId: z.string().uuid(),
  category: priceCategorySchema,
  label: z.string().min(1),
  quantity: z.number().nonnegative(),
  unit: z.string().min(1),
  unitPriceCents: z.number().int().nonnegative(),
  lineTotalCents: z.number().int().nonnegative(),
  priceListItemId: z.string().uuid().nullable(),
  sortOrder: z.number().int(),
  overridePriceCents: z.number().int().nonnegative().nullable(),
  overrideReason: z.string().min(1).nullable(),
  overrideByUserId: z.string().nullable(),
  overrideAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const overrideGeneratedPriceLineSchema = z.object({
  overridePriceCents: z.number().int().nonnegative().nullable().optional(),
  overrideReason: z.string().min(1).nullable().optional()
});
