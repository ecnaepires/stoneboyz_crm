export const MEASUREMENT_ROUNDING_VALUES = ['none', 'nearest_1_16'] as const;
export type MeasurementRounding = typeof MEASUREMENT_ROUNDING_VALUES[number];

export const EDGE_TREATMENT_VALUES = [
  'unfinished',
  'finished',
  'appliance',
  'mitered',
  'waterfall'
] as const;
export type EdgeTreatment = typeof EDGE_TREATMENT_VALUES[number];

export const CORNER_TREATMENT_VALUES = ['none', 'radius', 'clip', 'bump_out', 'notch'] as const;
export type CornerTreatment = typeof CORNER_TREATMENT_VALUES[number];

export const SINK_TYPE_VALUES = ['undermount', 'drop_in', 'farm'] as const;
export type SinkType = typeof SINK_TYPE_VALUES[number];

export const SINK_SHAPE_VALUES = [
  'rectangle',
  'oval',
  'double',
  '60_40',
  '40_60',
  '70_30',
  '30_70'
] as const;
export type SinkShape = typeof SINK_SHAPE_VALUES[number];

export const SINK_CENTERLINE_VALUES = ['none', 'left', 'right', 'center'] as const;
export type SinkCenterline = typeof SINK_CENTERLINE_VALUES[number];

export interface CounterPieceInput {
  name?: string | undefined;
  lengthIn: number;
  widthIn: number;
  quantity?: number | undefined;
  kind?: "countertop" | "backsplash" | undefined;
}

export interface CounterPiece {
  id: string;
  quoteAreaId: string;
  sortOrder: number;
  name: string | null;
  lengthIn: number;
  widthIn: number;
  quantity: number;
  kind: "countertop" | "backsplash";
  createdAt: string;
  updatedAt: string;
}

export interface CreateCounterPieceInput extends CounterPieceInput {
  actorUserId: string;
  sortOrder?: number | undefined;
  kind?: "countertop" | "backsplash" | undefined;
}

export interface UpdateCounterPieceInput {
  actorUserId: string;
  sortOrder?: number | undefined;
  name?: string | null | undefined;
  lengthIn?: number | undefined;
  widthIn?: number | undefined;
  quantity?: number | undefined;
}

export interface EdgeSegmentInput {
  lengthIn: number;
  treatment: EdgeTreatment;
  splashHeightIn?: number | undefined;
}

export interface EdgeSegment {
  id: string;
  quoteAreaId: string;
  sortOrder: number;
  lengthIn: number;
  treatment: EdgeTreatment;
  splashHeightIn: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEdgeSegmentInput extends EdgeSegmentInput {
  actorUserId: string;
  sortOrder?: number | undefined;
}

export interface UpdateEdgeSegmentInput {
  actorUserId: string;
  sortOrder?: number | undefined;
  lengthIn?: number | undefined;
  treatment?: EdgeTreatment | undefined;
  splashHeightIn?: number | null | undefined;
}

export interface SinkCutoutInput {
  quantity?: number | undefined;
  model?: string | undefined;
  sinkType: SinkType;
  shape: SinkShape;
  cutoutLengthIn: number;
  cutoutWidthIn: number;
  faucetHoleCount?: number | undefined;
  centerline?: SinkCenterline | undefined;
}

export interface SinkCutout {
  id: string;
  quoteAreaId: string;
  sortOrder: number;
  quantity: number;
  model: string | null;
  sinkType: SinkType;
  shape: SinkShape;
  cutoutLengthIn: number;
  cutoutWidthIn: number;
  faucetHoleCount: number;
  centerline: SinkCenterline;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSinkCutoutInput extends SinkCutoutInput {
  actorUserId: string;
  sortOrder?: number | undefined;
}

export interface UpdateSinkCutoutInput {
  actorUserId: string;
  sortOrder?: number | undefined;
  quantity?: number | undefined;
  model?: string | null | undefined;
  sinkType?: SinkType | undefined;
  shape?: SinkShape | undefined;
  cutoutLengthIn?: number | undefined;
  cutoutWidthIn?: number | undefined;
  faucetHoleCount?: number | undefined;
  centerline?: SinkCenterline | undefined;
}

export interface QuoteMeasurementAreaInput {
  name: string;
  pieces: CounterPieceInput[];
  edges?: EdgeSegmentInput[] | undefined;
  sinks?: SinkCutoutInput[] | undefined;
}

export interface QuoteMeasurementAreaTotals {
  pieceCount: number;
  countertopSqFt: number;
  backsplashSqFt: number;
  combinedSqFt: number;
  finishedEdgeLinFt: number;
  splashSqFt: number;
  sinkCutoutCount: number;
  faucetHoleCount: number;
}

export interface QuoteMeasurementTotals extends QuoteMeasurementAreaTotals {
  areaCount: number;
}
