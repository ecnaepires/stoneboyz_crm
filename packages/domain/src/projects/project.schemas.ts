import { z } from 'zod';
import { SORT_DIRECTION_VALUES } from '../customers/customer.constants.js';
import { PROJECT_SORT_BY_VALUES, PROJECT_STATUS_VALUES } from './project.constants.js';

const projectStatusSchema = z.enum(PROJECT_STATUS_VALUES);
const projectSortBySchema = z.enum(PROJECT_SORT_BY_VALUES);
const sortDirectionSchema = z.enum(SORT_DIRECTION_VALUES);

export const createProjectSchema = z.object({
  customerId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  status: projectStatusSchema.default('draft'),
  ownerUserId: z.string().min(1)
});

export const updateProjectSchema = z.object({
  customerId: z.string().uuid().optional(),
  title: z.string().min(1).optional(),
  description: z.string().min(1).nullable().optional(),
  status: projectStatusSchema.optional(),
  ownerUserId: z.string().min(1).optional()
}).refine((input) => Object.keys(input).length > 0, {
  message: 'At least one field is required',
  path: []
});

export const archiveProjectSchema = z.object({});

export const listProjectsSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).default(25),
  search: z.string().min(1).optional(),
  status: projectStatusSchema.optional(),
  customerId: z.string().uuid().optional(),
  ownerUserId: z.string().min(1).optional(),
  sortBy: projectSortBySchema.default('updatedAt'),
  sortDirection: sortDirectionSchema.default('desc'),
  includeArchived: z.boolean().default(false)
});
