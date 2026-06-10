import { z } from "zod";
import { SORT_DIRECTION_VALUES } from "../customers/customer.constants.js";
import {
  PROJECT_SORT_BY_VALUES,
  PROJECT_STATUS_VALUES,
} from "./project.constants.js";
import { PIPELINE_STAGE_VALUES } from "./project.pipeline.js";

const projectStatusSchema = z.enum(PROJECT_STATUS_VALUES);
const projectSortBySchema = z.enum(PROJECT_SORT_BY_VALUES);
const pipelineStageSchema = z.enum(PIPELINE_STAGE_VALUES);
const sortDirectionSchema = z.enum(SORT_DIRECTION_VALUES);

const projectJobAddressSchema = z.object({
  line1: z.string().min(1).nullable().optional(),
  line2: z.string().min(1).nullable().optional(),
  city: z.string().min(1).nullable().optional(),
  region: z.string().min(1).nullable().optional(),
  postalCode: z.string().min(1).nullable().optional(),
  country: z.string().min(1).nullable().optional(),
  contactName: z.string().min(1).nullable().optional(),
  phone: z.string().min(1).nullable().optional(),
  email: z.string().email().nullable().optional(),
});

export const createProjectSchema = z.object({
  customerId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  jobAddress: projectJobAddressSchema.optional(),
  copyFromCustomerPrimary: z.boolean().default(true),
  status: projectStatusSchema.default("draft"),
  ownerUserId: z.string().min(1),
  jobTemplateId: z.string().uuid(),
});

export const updateProjectSchema = z
  .object({
    customerId: z.string().uuid().optional(),
    title: z.string().min(1).optional(),
    description: z.string().min(1).nullable().optional(),
    jobAddress: projectJobAddressSchema.nullable().optional(),
    status: projectStatusSchema.optional(),
    ownerUserId: z.string().min(1).optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
    path: [],
  });

export const archiveProjectSchema = z.object({});

export const updateProjectStageSchema = z.object({
  stage: pipelineStageSchema,
  allowBackward: z.boolean().optional(),
});

export const listProjectsSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).default(25),
  search: z.string().min(1).optional(),
  status: projectStatusSchema.optional(),
  customerId: z.string().uuid().optional(),
  ownerUserId: z.string().min(1).optional(),
  sortBy: projectSortBySchema.default("updatedAt"),
  sortDirection: sortDirectionSchema.default("desc"),
  includeArchived: z.boolean().default(false),
});
