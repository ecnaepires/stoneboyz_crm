import type { Quote, QuoteLineItem } from '@stoneboyz/domain';

export interface QuoteRow {
  id: string;
  customer_id: string;
  project_id: string | null;
  quote_number: string;
  title: string;
  status: Quote['status'];
  valid_until: Date | string | null;
  subtotal_cents: number | string | null;
  discount_cents: number;
  tax_rate_bps: number;
  notes: string | null;
  terms_and_conditions: string | null;
  sent_at: Date | null;
  accepted_at: Date | null;
  rejected_at: Date | null;
  deleted_at: Date | null;
  deleted_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface QuoteLineItemRow {
  id: string;
  quote_id: string;
  sort_order: number;
  stone_type: string;
  length_mm: number | null;
  width_mm: number | null;
  thickness_mm: number | null;
  edge_profile: string | null;
  qty: string;
  qty_unit: string;
  unit_price_cents: number;
  labor_price_cents: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

const toIso = (value: Date): string => value.toISOString();

const toDateString = (value: Date | string | null): string | null => {
  if (value === null) {
    return null;
  }

  return typeof value === 'string' ? value : value.toISOString().slice(0, 10);
};

export const computeLineTotalCents = (lineItem: Pick<QuoteLineItem, 'qty' | 'unitPriceCents' | 'laborPriceCents'>): number => {
  return Math.floor(lineItem.qty * (lineItem.unitPriceCents + lineItem.laborPriceCents));
};

export const computeTotalCents = (subtotalCents: number, discountCents: number, taxRateBps: number): number => {
  if (subtotalCents === 0) {
    return 0;
  }

  return Math.floor((subtotalCents - discountCents) * (1 + taxRateBps / 10000));
};

export const mapQuoteLineItemRow = (row: QuoteLineItemRow): QuoteLineItem => {
  const lineItem = {
    id: row.id,
    quoteId: row.quote_id,
    sortOrder: row.sort_order,
    stoneType: row.stone_type,
    lengthMm: row.length_mm,
    widthMm: row.width_mm,
    thicknessMm: row.thickness_mm,
    edgeProfile: row.edge_profile,
    qty: Number(row.qty),
    qtyUnit: row.qty_unit,
    unitPriceCents: row.unit_price_cents,
    laborPriceCents: row.labor_price_cents,
    lineTotalCents: 0,
    notes: row.notes,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };

  return {
    ...lineItem,
    lineTotalCents: computeLineTotalCents(lineItem)
  };
};

export const mapQuoteRow = (row: QuoteRow): Quote => {
  const subtotalCents = Number(row.subtotal_cents ?? 0);

  return {
    id: row.id,
    customerId: row.customer_id,
    projectId: row.project_id,
    quoteNumber: row.quote_number,
    title: row.title,
    status: row.status,
    validUntil: toDateString(row.valid_until),
    subtotalCents,
    discountCents: row.discount_cents,
    taxRateBps: row.tax_rate_bps,
    totalCents: computeTotalCents(subtotalCents, row.discount_cents, row.tax_rate_bps),
    notes: row.notes,
    termsAndConditions: row.terms_and_conditions,
    sentAt: row.sent_at === null ? null : toIso(row.sent_at),
    acceptedAt: row.accepted_at === null ? null : toIso(row.accepted_at),
    rejectedAt: row.rejected_at === null ? null : toIso(row.rejected_at),
    archivedAt: row.deleted_at === null ? null : toIso(row.deleted_at),
    archivedByUserId: row.deleted_by_user_id,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
};
