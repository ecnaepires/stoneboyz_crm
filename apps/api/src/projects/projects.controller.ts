import { BadRequestException, Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { archiveProjectSchema, createProjectSchema, listProjectsSchema, updateProjectSchema } from '@stoneboyz/domain';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ProjectsService } from './projects.service.js';

const projectIdSchema = z.string().uuid();

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

const formatZodError = (error: z.ZodError): Record<string, string[]> => {
  return z.flattenError(error).fieldErrors;
};

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async list(@Query() query: Record<string, unknown>) {
    const parsed = listProjectsSchema.safeParse({
      ...query,
      limit: parseLimit(query['limit']),
      includeArchived: parseBoolean(query['includeArchived'])
    });

    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formatZodError(parsed.error)
      });
    }

    return this.projectsService.list(parsed.data);
  }

  @Post()
  async create(@Body() body: unknown, @CurrentUser() actorUserId: string) {
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formatZodError(parsed.error)
      });
    }

    return this.projectsService.create({ ...parsed.data, actorUserId });
  }

  @Get('archived')
  async listArchived(@Query() query: Record<string, unknown>) {
    const parsed = listProjectsSchema.safeParse({
      ...query,
      includeArchived: true,
      limit: parseLimit(query['limit'])
    });

    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formatZodError(parsed.error)
      });
    }

    return this.projectsService.list(parsed.data);
  }

  @Get(':projectId')
  async getById(@Param('projectId') projectId: string) {
    const parsed = projectIdSchema.safeParse(projectId);

    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: { projectId: ['Invalid UUID'] }
      });
    }

    return this.projectsService.getById(parsed.data);
  }

  @Patch(':projectId')
  async update(@Param('projectId') projectId: string, @Body() body: unknown, @CurrentUser() actorUserId: string) {
    const parsedProjectId = projectIdSchema.safeParse(projectId);

    if (!parsedProjectId.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: { projectId: ['Invalid UUID'] }
      });
    }

    const parsedBody = updateProjectSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formatZodError(parsedBody.error)
      });
    }

    return this.projectsService.update(parsedProjectId.data, { ...parsedBody.data, actorUserId });
  }

  @Post(':projectId/archive')
  @HttpCode(200)
  async archive(@Param('projectId') projectId: string, @Body() body: unknown, @CurrentUser() actorUserId: string) {
    const parsedProjectId = projectIdSchema.safeParse(projectId);

    if (!parsedProjectId.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: { projectId: ['Invalid UUID'] }
      });
    }

    const parsedBody = archiveProjectSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formatZodError(parsedBody.error)
      });
    }

    return this.projectsService.archive(parsedProjectId.data, { ...parsedBody.data, actorUserId });
  }
}
