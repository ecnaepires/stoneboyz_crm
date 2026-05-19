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
}

export interface QuoteAreaContext {
  material?: string | null;
  color?: string | null;
}

export type GeneratedPriceLineInput = Pick<
  GeneratedPriceLine,
  'category' | 'label' | 'quantity' | 'unit' | 'unitPriceCents' | 'lineTotalCents' | 'priceListItemId' | 'sortOrder'
>;
