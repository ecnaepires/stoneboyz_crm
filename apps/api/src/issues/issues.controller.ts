import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { archiveIssueSchema, createIssueSchema, listIssuesSchema, updateIssueSchema } from '@stoneboyz/domain';
import { z } from 'zod';
import { IssuesService } from './issues.service.js';

const customerIdSchema = z.string().uuid();
const projectIdSchema = z.string().uuid();
const issueIdSchema = z.string().uuid();

const badRequest = (details: Record<string, string[]>): BadRequestException =>
  new BadRequestException({
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    details
  });

const formatZodError = (error: z.ZodError): Record<string, string[]> => z.flattenError(error).fieldErrors;

const parseLimit = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? value : parsed;
};

const parseBoolean = (value: unknown): unknown => {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
};

@Controller('customers/:customerId/projects/:projectId/issues')
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Get()
  async list(
    @Param('customerId') customerId: string,
    @Param('projectId') projectId: string,
    @Query() query: Record<string, unknown>
  ) {
    const ids = this.parseIds(customerId, projectId);
    const parsed = listIssuesSchema.safeParse({
      ...query,
      projectId: ids.projectId,
      limit: parseLimit(query['limit']),
      includeArchived: parseBoolean(query['includeArchived'])
    });

    if (!parsed.success) {
      throw badRequest(formatZodError(parsed.error));
    }

    return this.issuesService.list(ids.customerId, parsed.data);
  }

  @Post()
  async create(
    @Param('customerId') customerId: string,
    @Param('projectId') projectId: string,
    @Body() body: unknown
  ) {
    const ids = this.parseIds(customerId, projectId);
    const parsedBody = createIssueSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.issuesService.create(ids.customerId, ids.projectId, parsedBody.data);
  }

  @Get(':issueId')
  async getById(
    @Param('customerId') customerId: string,
    @Param('projectId') projectId: string,
    @Param('issueId') issueId: string
  ) {
    const ids = this.parseIssueIds(customerId, projectId, issueId);
    return this.issuesService.getById(ids.customerId, ids.projectId, ids.issueId);
  }

  @Patch(':issueId')
  async update(
    @Param('customerId') customerId: string,
    @Param('projectId') projectId: string,
    @Param('issueId') issueId: string,
    @Body() body: unknown
  ) {
    const ids = this.parseIssueIds(customerId, projectId, issueId);
    const parsedBody = updateIssueSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.issuesService.update(ids.customerId, ids.projectId, ids.issueId, parsedBody.data);
  }

  @Delete(':issueId')
  async archive(
    @Param('customerId') customerId: string,
    @Param('projectId') projectId: string,
    @Param('issueId') issueId: string,
    @Body() body: unknown
  ) {
    const ids = this.parseIssueIds(customerId, projectId, issueId);
    const parsedBody = archiveIssueSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.issuesService.archive(ids.customerId, ids.projectId, ids.issueId, parsedBody.data.actorUserId);
  }

  private parseIds(customerId: string, projectId: string): { customerId: string; projectId: string } {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);
    const parsedProjectId = projectIdSchema.safeParse(projectId);

    if (!parsedCustomerId.success || !parsedProjectId.success) {
      throw badRequest({
        ...(!parsedCustomerId.success ? { customerId: ['Invalid UUID'] } : {}),
        ...(!parsedProjectId.success ? { projectId: ['Invalid UUID'] } : {})
      });
    }

    return {
      customerId: parsedCustomerId.data,
      projectId: parsedProjectId.data
    };
  }

  private parseIssueIds(
    customerId: string,
    projectId: string,
    issueId: string
  ): { customerId: string; projectId: string; issueId: string } {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);
    const parsedProjectId = projectIdSchema.safeParse(projectId);
    const parsedIssueId = issueIdSchema.safeParse(issueId);

    if (!parsedCustomerId.success || !parsedProjectId.success || !parsedIssueId.success) {
      throw badRequest({
        ...(!parsedCustomerId.success ? { customerId: ['Invalid UUID'] } : {}),
        ...(!parsedProjectId.success ? { projectId: ['Invalid UUID'] } : {}),
        ...(!parsedIssueId.success ? { issueId: ['Invalid UUID'] } : {})
      });
    }

    return {
      customerId: parsedCustomerId.data,
      projectId: parsedProjectId.data,
      issueId: parsedIssueId.data
    };
  }
}
