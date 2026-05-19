import type { QuoteMeasurementAreaTotals } from './quote-measurements.types.js';
import type { PriceCategory } from './quote-pricing.types.js';

export const QUOTE_STATUS_VALUES = ['draft', 'sent', 'accepted', 'rejected'] as const;

export type QuoteStatus = typeof QUOTE_STATUS_VALUES[number];

export interface QuoteArea {
  id: string;
  quoteId: string;
  sortOrder: number;
  name: string;
  material: string | null;
  color: string | null;
  edgeProfile: string | null;
  notes: string | null;
  subtotalCents: number;
  measurementTotals: QuoteMeasurementAreaTotals;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuoteAreaInput {
  actorUserId: string;
  name: string;
  sortOrder?: number | undefined;
  material?: string | undefined;
  color?: string | undefined;
  edgeProfile?: string | undefined;
  notes?: string | undefined;
}

export interface UpdateQuoteAreaInput {
  actorUserId: string;
  name?: string | undefined;
  sortOrder?: number | undefined;
  material?: string | null | undefined;
  color?: string | null | undefined;
  edgeProfile?: string | null | undefined;
  notes?: string | null | undefined;
}

export interface QuoteLineItem {
  id: string;
  quoteId: string;
  quoteAreaId: string | null;
  slabId: string | null;
  sortOrder: number;
  stoneType: string;
  lengthIn: number | null;
  widthIn: number | null;
  thicknessCm: number | null;
  sqFt?: number | null;
  edgeProfile: string | null;
  qty: number;
  qtyUnit: string;
  unitPriceCents: number;
  laborPriceCents: number;
  lineTotalCents: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedPriceLine {
  id: string;
  quoteAreaId: string;
  category: PriceCategory;
  label: string;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  lineTotalCents: number;
  priceListItemId: string | null;
  sortOrder: number;
  overridePriceCents: number | null;
  overrideReason: string | null;
  overrideByUserId: string | null;
  overrideAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OverrideGeneratedPriceLineInput {
  actorUserId: string;
  overridePriceCents?: number | null | undefined;
  overrideReason?: string | null | undefined;
}

export interface Quote {
  id: string;
  customerId: string;
  projectId: string | null;
  priceListId: string | null;
  quoteNumber: string;
  title: string;
  status: QuoteStatus;
  validUntil: string | null;
  subtotalCents: number;
  discountCents: number;
  taxRateBps: number;
  totalCents: number;
  shareToken: string;
  notes: string | null;
  termsAndConditions: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  archivedAt: string | null;
  archivedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteWithLineItems extends Quote {
  lineItems: QuoteLineItem[];
}

export interface QuoteWithAreas extends QuoteWithLineItems {
  areas: QuoteArea[];
}

export interface CreateQuoteLineItemInput {
  actorUserId: string;
  quoteAreaId?: string | undefined;
  slabId?: string | undefined;
  sortOrder?: number | undefined;
  stoneType: string;
  lengthIn?: number | undefined;
  widthIn?: number | undefined;
  thicknessCm?: number | undefined;
  edgeProfile?: string | undefined;
  qty: number;
  qtyUnit: string;
  unitPriceCents: number;
  laborPriceCents?: number | undefined;
  notes?: string | undefined;
}

export interface UpdateQuoteLineItemInput {
  actorUserId: string;
  quoteAreaId?: string | null | undefined;
  slabId?: string | null | undefined;
  sortOrder?: number | undefined;
  stoneType?: string | undefined;
  lengthIn?: number | null | undefined;
  widthIn?: number | null | undefined;
  thicknessCm?: number | null | undefined;
  edgeProfile?: string | null | undefined;
  qty?: number | undefined;
  qtyUnit?: string | undefined;
  unitPriceCents?: number | undefined;
  laborPriceCents?: number | undefined;
  notes?: string | null | undefined;
}

export interface CreateQuoteInput {
  actorUserId: string;
  title: string;
  projectId?: string | undefined;
  priceListId?: string | null | undefined;
  validUntil?: string | undefined;
  discountCents?: number | undefined;
  taxRateBps?: number | undefined;
  notes?: string | undefined;
  termsAndConditions?: string | undefined;
  lineItems?: CreateQuoteLineItemInput[] | undefined;
}

export interface UpdateQuoteInput {
  actorUserId: string;
  title?: string | undefined;
  projectId?: string | null | undefined;
  priceListId?: string | null | undefined;
  validUntil?: string | null | undefined;
  discountCents?: number | undefined;
  taxRateBps?: number | undefined;
  notes?: string | null | undefined;
  termsAndConditions?: string | null | undefined;
}

export interface TransitionQuoteInput {
  actorUserId: string;
}

export interface ArchiveQuoteInput {
  actorUserId: string;
}

export interface ListQuotesInput {
  cursor?: string | undefined;
  limit?: number | undefined;
  status?: QuoteStatus | undefined;
  projectId?: string | undefined;
  includeArchived?: boolean | undefined;
}
