import { BadRequestException, Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { updateJobChecklistSchema } from '@stoneboyz/domain';
import { z } from 'zod';
import { JobChecklistsService } from './job-checklists.service.js';

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

@Controller('customers/:customerId/projects/:projectId/phases/:phaseId/checklist')
export class JobChecklistsController {
  constructor(private readonly jobChecklistsService: JobChecklistsService) {}

  @Get()
  async getByPhaseId(
    @Param('customerId') customerId: string,
    @Param('projectId') projectId: string,
    @Param('phaseId') phaseId: string
  ) {
    const ids = this.parseIds(customerId, projectId, phaseId);
    return this.jobChecklistsService.getByPhaseId(ids.customerId, ids.projectId, ids.phaseId);
  }

  @Patch()
  async update(
    @Param('customerId') customerId: string,
    @Param('projectId') projectId: string,
    @Param('phaseId') phaseId: string,
    @Body() body: unknown
  ) {
    const ids = this.parseIds(customerId, projectId, phaseId);
    const parsedBody = updateJobChecklistSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.jobChecklistsService.update(ids.customerId, ids.projectId, ids.phaseId, parsedBody.data);
  }

  private parseIds(
    customerId: string,
    projectId: string,
    phaseId: string
  ): { customerId: string; projectId: string; phaseId: string } {
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
