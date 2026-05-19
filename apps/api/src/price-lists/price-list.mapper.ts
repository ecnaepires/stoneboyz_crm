import type { PriceList, PriceListItem, PriceListStatus } from '@stoneboyz/domain';

export interface PriceListRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  revision: number;
  currency_code: string;
  default_tax_rate_bps: number;
  default_payment_terms: string | null;
  expiration_days: number | null;
  created_by_user_id: string;
  deleted_at: Date | null;
  deleted_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PriceListItemRow {
  id: string;
  price_list_id: string;
  category: string;
  item_type: string;
  name: string;
  description: string | null;
  unit: string;
  price_cents: number;
  sort_order: number;
  taxable: boolean;
  allow_discount: boolean;
  editable_on_quote: boolean;
  hide_on_quote: boolean;
  created_at: Date;
  updated_at: Date;
}

const toIso = (value: Date): string => value.toISOString();

export const mapPriceListRow = (row: PriceListRow): PriceList => ({
  id: row.id,
  name: row.name,
  description: row.description,
  status: row.status as PriceListStatus,
  revision: row.revision,
  currencyCode: row.currency_code,
  defaultTaxRateBps: row.default_tax_rate_bps,
  defaultPaymentTerms: row.default_payment_terms,
  expirationDays: row.expiration_days,
  createdByUserId: row.created_by_user_id,
  archivedAt: row.deleted_at === null ? null : toIso(row.deleted_at),
  archivedByUserId: row.deleted_by_user_id,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});

export const mapPriceListItemRow = (row: PriceListItemRow): PriceListItem => ({
  id: row.id,
  priceListId: row.price_list_id,
  category: row.category,
  itemType: row.item_type,
  name: row.name,
  description: row.description,
  unit: row.unit,
  priceCents: row.price_cents,
  sortOrder: row.sort_order,
  taxable: row.taxable,
  allowDiscount: row.allow_discount,
  editableOnQuote: row.editable_on_quote,
  hideOnQuote: row.hide_on_quote,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});
