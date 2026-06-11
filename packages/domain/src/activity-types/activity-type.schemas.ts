import { z } from 'zod';
import { PIPELINE_STAGE_VALUES } from '../projects/project.pipeline.js';
import { appointmentTypeSchema } from '../scheduling/scheduled-event.schemas.js';

const dateTimeSchema = z.string().datetime({ offset: true });
const nullableDateTimeSchema = dateTimeSchema.nullable();
const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected #rrggbb hex color');
const pipelineStageSchema = z.enum(PIPELINE_STAGE_VALUES);

const activityTypeFields = {
  name: z.string().trim().min(1),
  color: hexColorSchema,
  pipelineStage: pipelineStageSchema.nullable().optional(),
  countsSquareFootage: z.boolean().optional(),
  autoscheduleEligible: z.boolean().optional(),
  usesTemplateKind: z.boolean().optional(),
  defaultDurationMinutes: z.number().int().min(1).optional(),
  sortOrder: z.number().int().min(1).optional(),
};

export const shopSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const activityTypeSchema = z.object({
  id: z.string().uuid(),
  shopId: z.string().uuid(),
  name: z.string().min(1),
  seedSlug: appointmentTypeSchema.nullable(),
  color: hexColorSchema,
  pipelineStage: pipelineStageSchema.nullable(),
  countsSquareFootage: z.boolean(),
  autoscheduleEligible: z.boolean(),
  usesTemplateKind: z.boolean(),
  defaultDurationMinutes: z.number().int().min(1),
  sortOrder: z.number().int().min(1),
  archivedAt: nullableDateTimeSchema,
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const listActivityTypesSchema = z.object({
  includeArchived: z.coerce.boolean().default(false),
});

export const createActivityTypeSchema = z.object(activityTypeFields);

export const updateActivityTypeSchema = z
  .object({
    name: activityTypeFields.name.optional(),
    color: activityTypeFields.color.optional(),
    pipelineStage: activityTypeFields.pipelineStage,
    countsSquareFootage: activityTypeFields.countsSquareFootage,
    autoscheduleEligible: activityTypeFields.autoscheduleEligible,
    usesTemplateKind: activityTypeFields.usesTemplateKind,
    defaultDurationMinutes: activityTypeFields.defaultDurationMinutes,
    sortOrder: activityTypeFields.sortOrder,
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one field is required',
    path: [],
  });

export const archiveActivityTypeSchema = z.object({});
