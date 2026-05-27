import { BadRequestException, Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { archivePhaseSchema, createPhaseSchema, updatePhaseSchema } from '@stoneboyz/domain';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { PhasesService } from './phases.service.js';

const customerIdSchema = z.string().uuid();
const projectIdSchema = z.string().uuid();
const phaseIdSchema = z.string().uuid();

const badRequest = (details: Record<string, string[]>): BadRequestException =>
  new BadRequestException({
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    details
  });

const formatZodError = (error: z.ZodError): Record<string, string[]> => z.flattenError(error).fieldErrors;

@Controller('customers/:customerId/projects/:projectId/phases')
export class PhasesController {
  constructor(private readonly phasesService: PhasesService) {}

  @Get()
  async list(@Param('customerId') customerId: string, @Param('projectId') projectId: string, @Query('includeArchived') includeArchived?: string) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);
    const parsedProjectId = projectIdSchema.safeParse(projectId);

    if (!parsedCustomerId.success || !parsedProjectId.success) {
      throw badRequest({
        ...(!parsedCustomerId.success ? { customerId: ['Invalid UUID'] } : {}),
        ...(!parsedProjectId.success ? { projectId: ['Invalid UUID'] } : {})
      });
    }

    return this.phasesService.list(parsedCustomerId.data, parsedProjectId.data, includeArchived === 'true');
  }

  @Post()
  async create(
    @Param('customerId') customerId: string,
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);
    const parsedProjectId = projectIdSchema.safeParse(projectId);

    if (!parsedCustomerId.success || !parsedProjectId.success) {
      throw badRequest({
        ...(!parsedCustomerId.success ? { customerId: ['Invalid UUID'] } : {}),
        ...(!parsedProjectId.success ? { projectId: ['Invalid UUID'] } : {})
      });
    }

    const parsedBody = createPhaseSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.phasesService.create(parsedCustomerId.data, parsedProjectId.data, {
      ...parsedBody.data,
      actorUserId
    });
  }

  @Get(':phaseId')
  async getById(@Param('customerId') customerId: string, @Param('projectId') projectId: string, @Param('phaseId') phaseId: string) {
    const ids = this.parseIds(customerId, projectId, phaseId);
    return this.phasesService.getById(ids.customerId, ids.projectId, ids.phaseId);
  }

  @Patch(':phaseId')
  async update(
    @Param('customerId') customerId: string,
    @Param('projectId') projectId: string,
    @Param('phaseId') phaseId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const ids = this.parseIds(customerId, projectId, phaseId);
    const parsedBody = updatePhaseSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.phasesService.update(ids.customerId, ids.projectId, ids.phaseId, {
      ...parsedBody.data,
      actorUserId
    });
  }

  @Post(':phaseId/archive')
  @HttpCode(200)
  async archive(
    @Param('customerId') customerId: string,
    @Param('projectId') projectId: string,
    @Param('phaseId') phaseId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const ids = this.parseIds(customerId, projectId, phaseId);
    const parsedBody = archivePhaseSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.phasesService.archive(ids.customerId, ids.projectId, ids.phaseId, {
      ...parsedBody.data,
      actorUserId
    });
  }

  private parseIds(customerId: string, projectId: string, phaseId: string): { customerId: string; projectId: string; phaseId: string } {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);
    const parsedProjectId = projectIdSchema.safeParse(projectId);
    const parsedPhaseId = phaseIdSchema.safeParse(phaseId);

    if (!parsedCustomerId.success || !parsedProjectId.success || !parsedPhaseId.success) {
      throw badRequest({
        ...(!parsedCustomerId.success ? { customerId: ['Invalid UUID'] } : {}),
        ...(!parsedProjectId.success ? { projectId: ['Invalid UUID'] } : {}),
        ...(!parsedPhaseId.success ? { phaseId: ['Invalid UUID'] } : {})
      });
    }

    return {
      customerId: parsedCustomerId.data,
      projectId: parsedProjectId.data,
      phaseId: parsedPhaseId.data
    };
  }
}
