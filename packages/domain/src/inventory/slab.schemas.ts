import { z } from 'zod';
import {
  DAMAGE_MARK_SEVERITY_VALUES,
  DAMAGE_MARK_TYPE_VALUES,
  SLAB_AVAILABILITY_VALUES,
  SLAB_CONDITION_VALUES,
  SLAB_FINISH_VALUES,
  SLAB_KIND_VALUES,
  SLAB_OWNERSHIP_VALUES,
  SLAB_QUALITY_GRADE_VALUES,
  SLAB_STATUS_VALUES
} from './slab.constants.js';

export const slabStatusSchema = z.enum(SLAB_STATUS_VALUES);
export const slabKindSchema = z.enum(SLAB_KIND_VALUES);
export const slabAvailabilitySchema = z.enum(SLAB_AVAILABILITY_VALUES);
export const slabOwnershipSchema = z.enum(SLAB_OWNERSHIP_VALUES);
export const slabConditionSchema = z.enum(SLAB_CONDITION_VALUES);
export const slabFinishSchema = z.enum(SLAB_FINISH_VALUES);
export const slabQualityGradeSchema = z.enum(SLAB_QUALITY_GRADE_VALUES);
export const damageMarkTypeSchema = z.enum(DAMAGE_MARK_TYPE_VALUES);
export const damageMarkSeveritySchema = z.enum(DAMAGE_MARK_SEVERITY_VALUES);

const imageUrlsSchema = z.array(z.string().url()).max(20);
const nullableUuidSchema = z.string().uuid().nullable();

export const createSlabSchema = z.object({
  materialColorId: nullableUuidSchema.optional(),
  storageLocationId: nullableUuidSchema.optional(),
  inventoryReceiptId: nullableUuidSchema.optional(),
  tagCode: z.string().min(1).optional(),
  kind: slabKindSchema.optional(),
  availability: slabAvailabilitySchema.optional(),
  ownership: slabOwnershipSchema.default('shop_owned'),
  condition: slabConditionSchema.default('good'),
  holdReason: z.string().min(1).nullable().optional(),
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
});

export const updateSlabSchema = z.object({
  materialColorId: nullableUuidSchema.optional(),
  storageLocationId: nullableUuidSchema.optional(),
  inventoryReceiptId: nullableUuidSchema.optional(),
  tagCode: z.string().min(1).optional(),
  kind: slabKindSchema.optional(),
  availability: slabAvailabilitySchema.optional(),
  ownership: slabOwnershipSchema.optional(),
  condition: slabConditionSchema.optional(),
  holdReason: z.string().min(1).nullable().optional(),
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
});

export const cutSlabSchema = z.object({
  remnants: z.array(createSlabSchema).optional()
});

export const archiveSlabSchema = z.object({});

export const listSlabsSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).default(25),
  status: slabStatusSchema.optional(),
  kind: slabKindSchema.optional(),
  availability: slabAvailabilitySchema.optional(),
  ownership: slabOwnershipSchema.optional(),
  condition: slabConditionSchema.optional(),
  materialColorId: z.string().uuid().optional(),
  storageLocationId: z.string().uuid().optional(),
  stoneType: z.string().min(1).optional(),
  finish: slabFinishSchema.optional()
});

export const findMaterialSchema = z.object({
  minLengthIn: z.coerce.number().positive(),
  minWidthIn: z.coerce.number().positive(),
  kind: slabKindSchema.optional(),
  materialColorId: z.string().uuid().optional(),
  thicknessCm: z.coerce.number().positive().optional(),
  finish: slabFinishSchema.optional(),
  includeHeld: z.coerce.boolean().default(false),
  includeDamaged: z.coerce.boolean().default(false)
});

export const attachProjectSlabSchema = z.object({
  slabId: z.string().uuid(),
  notes: z.string().min(1).optional()
});

export const damageMarkShapeSchema = z.object({
  kind: z.enum(['circle', 'polygon', 'freehand']),
  x: z.number().optional(),
  y: z.number().optional(),
  radius: z.number().positive().optional(),
  points: z.array(z.tuple([z.number(), z.number()])).optional()
});

export const createDamageMarkSchema = z.object({
  photoId: z.string().uuid().nullable().optional(),
  type: damageMarkTypeSchema,
  severity: damageMarkSeveritySchema.default('minor'),
  shape: damageMarkShapeSchema,
  note: z.string().min(1).optional()
});
