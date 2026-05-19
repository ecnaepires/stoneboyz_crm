import { z } from 'zod';
import {
  CORNER_TREATMENT_VALUES,
  EDGE_TREATMENT_VALUES,
  MEASUREMENT_ROUNDING_VALUES,
  SINK_CENTERLINE_VALUES,
  SINK_SHAPE_VALUES,
  SINK_TYPE_VALUES
} from './quote-measurements.types.js';

export const measurementRoundingSchema = z.enum(MEASUREMENT_ROUNDING_VALUES);
export const edgeTreatmentSchema = z.enum(EDGE_TREATMENT_VALUES);
export const cornerTreatmentSchema = z.enum(CORNER_TREATMENT_VALUES);
export const sinkTypeSchema = z.enum(SINK_TYPE_VALUES);
export const sinkShapeSchema = z.enum(SINK_SHAPE_VALUES);
export const sinkCenterlineSchema = z.enum(SINK_CENTERLINE_VALUES);

export const counterPieceInputSchema = z.object({
  name: z.string().min(1).optional(),
  lengthIn: z.number().positive(),
  widthIn: z.number().positive(),
  quantity: z.number().int().positive().default(1)
});

export const createCounterPieceSchema = counterPieceInputSchema.extend({
  sortOrder: z.number().int().default(0)
});

export const updateCounterPieceSchema = z.object({
  sortOrder: z.number().int().optional(),
  name: z.string().min(1).nullable().optional(),
  lengthIn: z.number().positive().optional(),
  widthIn: z.number().positive().optional(),
  quantity: z.number().int().positive().optional()
}).refine((input) => Object.keys(input).length > 0, {
  message: 'At least one field is required',
  path: []
});

export const counterPieceSchema = z.object({
  id: z.string().uuid(),
  quoteAreaId: z.string().uuid(),
  sortOrder: z.number().int(),
  name: z.string().nullable(),
  lengthIn: z.number().positive(),
  widthIn: z.number().positive(),
  quantity: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const edgeSegmentInputSchema = z.object({
  lengthIn: z.number().positive(),
  treatment: edgeTreatmentSchema,
  splashHeightIn: z.number().positive().optional()
});

export const createEdgeSegmentSchema = edgeSegmentInputSchema.extend({
  sortOrder: z.number().int().default(0)
});

export const updateEdgeSegmentSchema = z.object({
  sortOrder: z.number().int().optional(),
  lengthIn: z.number().positive().optional(),
  treatment: edgeTreatmentSchema.optional(),
  splashHeightIn: z.number().positive().nullable().optional()
}).refine((input) => Object.keys(input).length > 0, {
  message: 'At least one field is required',
  path: []
});

export const edgeSegmentSchema = z.object({
  id: z.string().uuid(),
  quoteAreaId: z.string().uuid(),
  sortOrder: z.number().int(),
  lengthIn: z.number().positive(),
  treatment: edgeTreatmentSchema,
  splashHeightIn: z.number().positive().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const sinkCutoutInputSchema = z.object({
  quantity: z.number().int().positive().default(1),
  model: z.string().min(1).optional(),
  sinkType: sinkTypeSchema,
  shape: sinkShapeSchema,
  cutoutLengthIn: z.number().positive(),
  cutoutWidthIn: z.number().positive(),
  faucetHoleCount: z.number().int().min(0).max(5).default(0),
  centerline: sinkCenterlineSchema.default('none')
});

export const createSinkCutoutSchema = sinkCutoutInputSchema.extend({
  sortOrder: z.number().int().default(0)
});

export const updateSinkCutoutSchema = z.object({
  sortOrder: z.number().int().optional(),
  quantity: z.number().int().positive().optional(),
  model: z.string().min(1).nullable().optional(),
  sinkType: sinkTypeSchema.optional(),
  shape: sinkShapeSchema.optional(),
  cutoutLengthIn: z.number().positive().optional(),
  cutoutWidthIn: z.number().positive().optional(),
  faucetHoleCount: z.number().int().min(0).max(5).optional(),
  centerline: sinkCenterlineSchema.optional()
}).refine((input) => Object.keys(input).length > 0, {
  message: 'At least one field is required',
  path: []
});

export const sinkCutoutSchema = z.object({
  id: z.string().uuid(),
  quoteAreaId: z.string().uuid(),
  sortOrder: z.number().int(),
  quantity: z.number().int().positive(),
  model: z.string().nullable(),
  sinkType: sinkTypeSchema,
  shape: sinkShapeSchema,
  cutoutLengthIn: z.number().positive(),
  cutoutWidthIn: z.number().positive(),
  faucetHoleCount: z.number().int().min(0).max(5),
  centerline: sinkCenterlineSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const quoteMeasurementAreaInputSchema = z.object({
  name: z.string().min(1),
  pieces: z.array(counterPieceInputSchema).min(1),
  edges: z.array(edgeSegmentInputSchema).default([]),
  sinks: z.array(sinkCutoutInputSchema).default([])
});

export const quoteMeasurementAreaTotalsSchema = z.object({
  pieceCount: z.number(),
  countertopSqFt: z.number(),
  finishedEdgeLinFt: z.number(),
  splashSqFt: z.number(),
  sinkCutoutCount: z.number(),
  faucetHoleCount: z.number()
});
