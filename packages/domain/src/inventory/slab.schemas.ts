import { z } from 'zod';
import { validateSlabMeasurement } from '../validators/slab-measurement.js';
import { SLAB_FINISH_VALUES, SLAB_QUALITY_GRADE_VALUES, SLAB_STATUS_VALUES } from './slab.constants.js';

export const slabStatusSchema = z.enum(SLAB_STATUS_VALUES);
export const slabFinishSchema = z.enum(SLAB_FINISH_VALUES);
export const slabQualityGradeSchema = z.enum(SLAB_QUALITY_GRADE_VALUES);

const imageUrlsSchema = z.array(z.string().url()).max(20);
const cmToIn = (value: number) => value / 2.54;

export const createSlabSchema = z.object({
  stoneType: z.string().min(1),
  finish: slabFinishSchema,
  qualityGrade: slabQualityGradeSchema,
  lengthIn: z.number().positive(),
  widthIn: z.number().positive(),
  thicknessCm: z.number().positive(),
  lotNumber: z.string().min(1).optional(),
  bundleNumber: z.string().min(1).optional(),
  warehouseLocation: z.string().min(1).optional(),
  costCents: z.number().int().min(0).default(0),
  imageUrls: imageUrlsSchema.default([]),
  notes: z.string().min(1).optional()
}).superRefine((input, ctx) => {
  const result = validateSlabMeasurement({
    lengthIn: input.lengthIn,
    widthIn: input.widthIn,
    thicknessIn: cmToIn(input.thicknessCm)
  });
  if (!result.ok) {
    const path = result.error.includes('thickness') ? ['thicknessCm'] : ['lengthIn'];
    if (result.error === 'slab exceeds maximum dimensions') {
      path[0] = input.lengthIn > 144 ? 'lengthIn' : 'widthIn';
    }
    ctx.addIssue({ code: 'custom', message: result.error, path });
  }
});

export const updateSlabSchema = z.object({
  stoneType: z.string().min(1).optional(),
  finish: slabFinishSchema.optional(),
  qualityGrade: slabQualityGradeSchema.optional(),
  lengthIn: z.number().positive().optional(),
  widthIn: z.number().positive().optional(),
  thicknessCm: z.number().positive().optional(),
  lotNumber: z.string().min(1).nullable().optional(),
  bundleNumber: z.string().min(1).nullable().optional(),
  warehouseLocation: z.string().min(1).nullable().optional(),
  costCents: z.number().int().min(0).optional(),
  imageUrls: imageUrlsSchema.optional(),
  notes: z.string().min(1).nullable().optional()
}).refine((input) => Object.keys(input).length > 0, {
  message: 'At least one field is required',
  path: []
}).superRefine((input, ctx) => {
  if (input.lengthIn === undefined && input.widthIn === undefined && input.thicknessCm === undefined) {
    return;
  }
  const result = validateSlabMeasurement({
    lengthIn: input.lengthIn ?? 1,
    widthIn: input.widthIn ?? 1,
    thicknessIn: cmToIn(input.thicknessCm ?? 2)
  });
  if (!result.ok) {
    const path = result.error.includes('thickness') ? ['thicknessCm'] : ['lengthIn'];
    if (result.error === 'slab exceeds maximum dimensions') {
      path[0] = input.lengthIn !== undefined && input.lengthIn > 144 ? 'lengthIn' : 'widthIn';
    }
    ctx.addIssue({ code: 'custom', message: result.error, path });
  }
});

export const cutSlabSchema = z.object({
  remnants: z.array(createSlabSchema).optional()
});

export const archiveSlabSchema = z.object({});

export const listSlabsSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).default(25),
  status: slabStatusSchema.optional(),
  stoneType: z.string().min(1).optional(),
  finish: slabFinishSchema.optional()
});

export const attachProjectSlabSchema = z.object({
  slabId: z.string().uuid(),
  notes: z.string().min(1).optional()
});
