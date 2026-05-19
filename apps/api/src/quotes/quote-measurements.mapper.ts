import type { CounterPiece, EdgeSegment, SinkCutout } from '@stoneboyz/domain';

export interface CounterPieceRow {
  id: string;
  quote_area_id: string;
  sort_order: number;
  name: string | null;
  length_in: number | string;
  width_in: number | string;
  quantity: number;
  created_at: Date;
  updated_at: Date;
}

export interface EdgeSegmentRow {
  id: string;
  quote_area_id: string;
  sort_order: number;
  length_in: number | string;
  treatment: EdgeSegment['treatment'];
  splash_height_in: number | string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SinkCutoutRow {
  id: string;
  quote_area_id: string;
  sort_order: number;
  quantity: number;
  model: string | null;
  sink_type: SinkCutout['sinkType'];
  shape: SinkCutout['shape'];
  cutout_length_in: number | string;
  cutout_width_in: number | string;
  faucet_hole_count: number;
  centerline: SinkCutout['centerline'];
  created_at: Date;
  updated_at: Date;
}

const toIso = (value: Date): string => value.toISOString();

export const mapCounterPieceRow = (row: CounterPieceRow): CounterPiece => ({
  id: row.id,
  quoteAreaId: row.quote_area_id,
  sortOrder: row.sort_order,
  name: row.name,
  lengthIn: Number(row.length_in),
  widthIn: Number(row.width_in),
  quantity: row.quantity,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});

export const mapEdgeSegmentRow = (row: EdgeSegmentRow): EdgeSegment => ({
  id: row.id,
  quoteAreaId: row.quote_area_id,
  sortOrder: row.sort_order,
  lengthIn: Number(row.length_in),
  treatment: row.treatment,
  splashHeightIn: row.splash_height_in === null ? null : Number(row.splash_height_in),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});

export const mapSinkCutoutRow = (row: SinkCutoutRow): SinkCutout => ({
  id: row.id,
  quoteAreaId: row.quote_area_id,
  sortOrder: row.sort_order,
  quantity: row.quantity,
  model: row.model,
  sinkType: row.sink_type,
  shape: row.shape,
  cutoutLengthIn: Number(row.cutout_length_in),
  cutoutWidthIn: Number(row.cutout_width_in),
  faucetHoleCount: row.faucet_hole_count,
  centerline: row.centerline,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});
