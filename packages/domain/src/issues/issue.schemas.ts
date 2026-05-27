import { z } from 'zod';
import { ISSUE_SEVERITY_VALUES, ISSUE_STATUS_VALUES, ISSUE_TYPE_VALUES } from './issue.types.js';

const issueTypeSchema = z.enum(ISSUE_TYPE_VALUES);
const issueSeveritySchema = z.enum(ISSUE_SEVERITY_VALUES);
const issueStatusSchema = z.enum(ISSUE_STATUS_VALUES);
const actorUserIdSchema = z.string().uuid();

export const issueSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  projectId: z.string().uuid(),
  phaseId: z.string().uuid().nullable(),
  type: issueTypeSchema,
  severity: issueSeveritySchema,
  status: issueStatusSchema,
  description: z.string().min(1),
  reportedByUserId: z.string().uuid(),
  reportedAt: z.string().datetime({ offset: true }),
  assigneeUserId: z.string().uuid().nullable(),
  resolvedAt: z.string().datetime({ offset: true }).nullable(),
  deletedAt: z.string().datetime({ offset: true }).nullable(),
  deletedByUserId: z.string().uuid().nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true })
});

export const createIssueSchema = z.object({
  type: issueTypeSchema,
  severity: issueSeveritySchema.default('medium'),
  description: z.string().min(1),
  phaseId: z.string().uuid().optional(),
  reportedByUserId: z.string().uuid(),
  assigneeUserId: z.string().uuid().optional()
});

export const updateIssueSchema = z
  .object({
    actorUserId: actorUserIdSchema,
    severity: issueSeveritySchema.optional(),
    description: z.string().min(1).optional(),
    status: issueStatusSchema.optional(),
    assigneeUserId: z.string().uuid().nullable().optional()
  })
  .refine((input) => Object.keys(input).length > 1, {
    message: 'At least one field is required',
    path: []
  });

export const archiveIssueSchema = z.object({
  actorUserId: actorUserIdSchema
});

export const listIssuesSchema = z.object({
  projectId: z.string().uuid(),
  phaseId: z.string().uuid().optional(),
  status: issueStatusSchema.optional(),
  limit: z.number().int().min(1).max(100).default(25),
  cursor: z.string().min(1).optional(),
  includeArchived: z.boolean().default(false)
});
