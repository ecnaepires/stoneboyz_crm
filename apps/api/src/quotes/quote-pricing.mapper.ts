import type { GeneratedPriceLine } from '@stoneboyz/domain';

export interface GeneratedPriceLineRow {
  id: string;
  quote_area_id: string;
  category: GeneratedPriceLine['category'];
  label: string;
  quantity: number | string;
  unit: string;
  unit_price_cents: number;
  line_total_cents: number;
  price_list_item_id: string | null;
  sort_order: number;
  override_price_cents: number | null;
  override_reason: string | null;
  override_by_user_id: string | null;
  override_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const toIso = (value: Date): string => value.toISOString();

export const mapGeneratedPriceLineRow = (row: GeneratedPriceLineRow): GeneratedPriceLine => ({
  id: row.id,
  quoteAreaId: row.quote_area_id,
  category: row.category,
  label: row.label,
  quantity: Number(row.quantity),
  unit: row.unit,
  unitPriceCents: row.unit_price_cents,
  lineTotalCents: row.line_total_cents,
  priceListItemId: row.price_list_item_id,
  sortOrder: row.sort_order,
  overridePriceCents: row.override_price_cents,
  overrideReason: row.override_reason,
  overrideByUserId: row.override_by_user_id,
  overrideAt: row.override_at === null ? null : toIso(row.override_at),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});
