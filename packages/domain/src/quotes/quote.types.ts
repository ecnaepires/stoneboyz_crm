export const QUOTE_STATUS_VALUES = ['draft', 'sent', 'accepted', 'rejected'] as const;

export type QuoteStatus = typeof QUOTE_STATUS_VALUES[number];

export interface QuoteLineItem {
  id: string;
  quoteId: string;
  sortOrder: number;
  stoneType: string;
  lengthMm: number | null;
  widthMm: number | null;
  thicknessMm: number | null;
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

export interface Quote {
  id: string;
  customerId: string;
  projectId: string | null;
  quoteNumber: string;
  title: string;
  status: QuoteStatus;
  validUntil: string | null;
  subtotalCents: number;
  discountCents: number;
  taxRateBps: number;
  totalCents: number;
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

export interface CreateQuoteLineItemInput {
  actorUserId: string;
  sortOrder?: number | undefined;
  stoneType: string;
  lengthMm?: number | undefined;
  widthMm?: number | undefined;
  thicknessMm?: number | undefined;
  edgeProfile?: string | undefined;
  qty: number;
  qtyUnit: string;
  unitPriceCents: number;
  laborPriceCents?: number | undefined;
  notes?: string | undefined;
}

export interface UpdateQuoteLineItemInput {
  actorUserId: string;
  sortOrder?: number | undefined;
  stoneType?: string | undefined;
  lengthMm?: number | null | undefined;
  widthMm?: number | null | undefined;
  thicknessMm?: number | null | undefined;
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
