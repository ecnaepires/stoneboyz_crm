import type { GeneratedPriceLine } from './quote.types.js';

export const PRICE_CATEGORY_VALUES = [
  'material',
  'fabrication',
  'finished_edge',
  'splash',
  'sink_cutout',
  'sink_item',
  'faucet_hole',
] as const;

export type PriceCategory = typeof PRICE_CATEGORY_VALUES[number];

export interface PriceListItemInput {
  id: string;
  category: string;
  unitPriceCents: number;
  chargeMethod?: 'square_foot' | 'linear_foot' | 'each' | undefined;
  measurementBasis?:
    | 'countertop_sqft'
    | 'backsplash_sqft'
    | 'combined_sqft'
    | 'finished_edge_linft'
    | 'splash_sqft'
    | 'sink_count'
    | 'faucet_hole_count'
    | 'each'
    | undefined;
}

export interface QuoteAreaContext {
  material?: string | null;
  color?: string | null;
}

export type GeneratedPriceLineInput = Pick<
  GeneratedPriceLine,
  'category' | 'label' | 'quantity' | 'unit' | 'unitPriceCents' | 'lineTotalCents' | 'priceListItemId' | 'sortOrder'
>;

export interface QuoteAreaPricingSelection {
  areaId: string;
  materialItemId: string | null;
  edgeItemId: string | null;
  splashItemId: string | null;
  fabricationItemId: string | null;
}

export interface QuotePricingSelection {
  quoteId: string;
  defaultFabricationItemId: string | null;
  sinkItemId: string | null;
  faucetHoleItemId: string | null;
  areas: QuoteAreaPricingSelection[];
}

export interface UpsertQuoteAreaPricingSelectionInput {
  areaId: string;
  materialItemId?: string | null | undefined;
  edgeItemId?: string | null | undefined;
  splashItemId?: string | null | undefined;
  fabricationItemId?: string | null | undefined;
}

export interface UpsertQuotePricingSelectionInput {
  actorUserId: string;
  defaultFabricationItemId?: string | null | undefined;
  sinkItemId?: string | null | undefined;
  faucetHoleItemId?: string | null | undefined;
  areas?: UpsertQuoteAreaPricingSelectionInput[] | undefined;
}
