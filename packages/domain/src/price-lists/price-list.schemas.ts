import { z } from 'zod';
import {
  PRICE_LIST_CHARGE_METHOD_VALUES,
  PRICE_LIST_ITEM_GROUP_VALUES,
  PRICE_LIST_MEASUREMENT_BASIS_VALUES,
  PRICE_LIST_STATUS_VALUES
} from './price-list.constants.js';

export const priceListStatusSchema = z.enum(PRICE_LIST_STATUS_VALUES);
export const priceListItemGroupSchema = z.enum(PRICE_LIST_ITEM_GROUP_VALUES);
export const priceListChargeMethodSchema = z.enum(PRICE_LIST_CHARGE_METHOD_VALUES);
export const priceListMeasurementBasisSchema = z.enum(PRICE_LIST_MEASUREMENT_BASIS_VALUES);

const allowedMeasurementBasesByChargeMethod = {
  square_foot: new Set(['countertop_sqft', 'backsplash_sqft', 'combined_sqft', 'splash_sqft']),
  linear_foot: new Set(['finished_edge_linft']),
  each: new Set(['sink_count', 'faucet_hole_count', 'each'])
} satisfies Record<(typeof PRICE_LIST_CHARGE_METHOD_VALUES)[number], ReadonlySet<(typeof PRICE_LIST_MEASUREMENT_BASIS_VALUES)[number]>>;

const validateChargeMethodMeasurementBasis = (
  input: {
    chargeMethod?: keyof typeof allowedMeasurementBasesByChargeMethod | undefined;
    measurementBasis?: (typeof PRICE_LIST_MEASUREMENT_BASIS_VALUES)[number] | undefined;
  },
  ctx: z.RefinementCtx
) => {
  if (input.chargeMethod === undefined || input.measurementBasis === undefined) {
    return;
  }

  const allowedMeasurementBases = allowedMeasurementBasesByChargeMethod[input.chargeMethod] as ReadonlySet<string>;

  if (!allowedMeasurementBases.has(input.measurementBasis)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${input.measurementBasis} is not valid for ${input.chargeMethod}`,
      path: ['measurementBasis']
    });
  }
};

export const createPriceListSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1).optional(),
  revision: z.number().int().positive().default(1),
  currencyCode: z.string().length(3).default('USD'),
  defaultTaxRateBps: z.number().int().min(0).max(10000).default(0),
  defaultPaymentTerms: z.string().min(1).optional(),
  expirationDays: z.number().int().positive().optional()
});

export const updatePriceListSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).nullable().optional(),
  revision: z.number().int().positive().optional(),
  currencyCode: z.string().length(3).optional(),
  defaultTaxRateBps: z.number().int().min(0).max(10000).optional(),
  defaultPaymentTerms: z.string().min(1).nullable().optional(),
  expirationDays: z.number().int().positive().nullable().optional()
}).refine((input) => Object.keys(input).length > 0, {
  message: 'At least one field is required',
  path: []
});

export const priceListActorSchema = z.object({});

export const listPriceListsSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).default(25),
  status: priceListStatusSchema.optional(),
  search: z.string().min(1).optional(),
  includeArchived: z.boolean().default(false)
});

export const createPriceListItemSchema = z.object({
  catalogItemId: z.string().uuid().optional(),
  itemGroup: priceListItemGroupSchema.optional(),
  category: z.string().min(1),
  itemType: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1).optional(),
  chargeMethod: priceListChargeMethodSchema.optional(),
  measurementBasis: priceListMeasurementBasisSchema.optional(),
  unit: z.string().min(1),
  priceCents: z.number().int().min(0),
  sortOrder: z.number().int().default(0),
  taxable: z.boolean().default(true),
  allowDiscount: z.boolean().default(true),
  editableOnQuote: z.boolean().default(true),
  hideOnQuote: z.boolean().default(false)
}).superRefine(validateChargeMethodMeasurementBasis);

export const updatePriceListItemSchema = z.object({
  catalogItemId: z.string().uuid().nullable().optional(),
  itemGroup: priceListItemGroupSchema.optional(),
  category: z.string().min(1).optional(),
  itemType: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().min(1).nullable().optional(),
  chargeMethod: priceListChargeMethodSchema.optional(),
  measurementBasis: priceListMeasurementBasisSchema.optional(),
  unit: z.string().min(1).optional(),
  priceCents: z.number().int().min(0).optional(),
  sortOrder: z.number().int().optional(),
  taxable: z.boolean().optional(),
  allowDiscount: z.boolean().optional(),
  editableOnQuote: z.boolean().optional(),
  hideOnQuote: z.boolean().optional()
}).superRefine(validateChargeMethodMeasurementBasis).refine((input) => Object.keys(input).length > 0, {
  message: 'At least one field is required',
  path: []
});
