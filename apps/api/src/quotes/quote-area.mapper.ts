import type { QuoteArea, QuoteMeasurementAreaTotals } from '@stoneboyz/domain';

export interface QuoteAreaRow {
  id: string;
  quote_id: string;
  sort_order: number;
  name: string;
  material: string | null;
  color: string | null;
  edge_profile: string | null;
  notes: string | null;
  subtotal_cents: number | string | null;
  created_at: Date;
  updated_at: Date;
}

const toIso = (value: Date): string => value.toISOString();

const emptyMeasurementTotals = (): QuoteMeasurementAreaTotals => ({
  pieceCount: 0,
  countertopSqFt: 0,
  backsplashSqFt: 0,
  combinedSqFt: 0,
  finishedEdgeLinFt: 0,
  splashSqFt: 0,
  sinkCutoutCount: 0,
  faucetHoleCount: 0
});

export const mapQuoteAreaRow = (
  row: QuoteAreaRow,
  measurementTotals: QuoteMeasurementAreaTotals = emptyMeasurementTotals()
): QuoteArea => ({
  id: row.id,
  quoteId: row.quote_id,
  sortOrder: row.sort_order,
  name: row.name,
  material: row.material,
  color: row.color,
  edgeProfile: row.edge_profile,
  notes: row.notes,
  subtotalCents: Number(row.subtotal_cents ?? 0),
  measurementTotals,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});
