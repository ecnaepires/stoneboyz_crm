import { z } from "zod";
import {
  MATERIAL_SOURCE_VALUES,
  PRICE_CATEGORY_VALUES,
} from "./quote-pricing.types.js";

export const materialSourceSchema = z.enum(MATERIAL_SOURCE_VALUES);
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
  updatedAt: z.string().datetime(),
});

export const overrideGeneratedPriceLineSchema = z.object({
  overridePriceCents: z.number().int().nonnegative().nullable().optional(),
  overrideReason: z.string().min(1).nullable().optional(),
});

export const upsertQuoteAreaPricingSelectionSchema = z.object({
  areaId: z.string().uuid(),
  materialItemId: z.string().uuid().nullable().optional(),
  materialSource: materialSourceSchema.optional(),
  materialSlabId: z.string().uuid().nullable().optional(),
  externalMaterialNote: z.string().min(1).nullable().optional(),
  edgeItemId: z.string().uuid().nullable().optional(),
  splashItemId: z.string().uuid().nullable().optional(),
  fabricationItemId: z.string().uuid().nullable().optional(),
  sinkItemId: z.string().uuid().nullable().optional(),
  faucetHoleItemId: z.string().uuid().nullable().optional(),
});

export const upsertQuotePricingSelectionSchema = z.object({
  defaultFabricationItemId: z.string().uuid().nullable().optional(),
  sinkItemId: z.string().uuid().nullable().optional(),
  faucetHoleItemId: z.string().uuid().nullable().optional(),
  areas: z.array(upsertQuoteAreaPricingSelectionSchema).optional(),
});
