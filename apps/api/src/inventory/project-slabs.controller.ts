import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { attachProjectSlabSchema, cutSlabSchema, transitionQuoteSchema } from '@stoneboyz/domain';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import { ProjectSlabsService } from './project-slabs.service.js';

const idSchema = z.string().uuid();
const reassignSchema = z.object({
  targetCustomerId: z.string().uuid(),
  targetProjectId: z.string().uuid(),
  reason: z.string().min(1)
});

const formatZodError = (error: z.ZodError): Record<string, string[]> => z.flattenError(error).fieldErrors;

const badRequest = (details: Record<string, string[]>): BadRequestException => {
  return new BadRequestException({
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    details
  });
};

@Controller('customers/:customerId/projects/:projectId/slabs')
export class ProjectSlabsController {
  constructor(private readonly projectSlabsService: ProjectSlabsService) {}

  @Get()
  async list(@Param('customerId') customerId: string, @Param('projectId') projectId: string) {
    const ids = this.parseIds(customerId, projectId);
    return this.projectSlabsService.list(ids.customerId, ids.projectId);
  }

  @Post()
  async attach(@Param('customerId') customerId: string, @Param('projectId') projectId: string, @Body() body: unknown, @CurrentUser() actorUserId: string) {
    const ids = this.parseIds(customerId, projectId);
    const parsedBody = attachProjectSlabSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.projectSlabsService.attach(ids.customerId, ids.projectId, { ...parsedBody.data, actorUserId });
  }

  @Delete(':slabId')
  @HttpCode(200)
  async detach(
    @Param('customerId') customerId: string,
    @Param('projectId') projectId: string,
    @Param('slabId') slabId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const ids = this.parseIds(customerId, projectId, slabId);
    const parsedBody = transitionQuoteSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.projectSlabsService.detach(ids.customerId, ids.projectId, ids.slabId as string, actorUserId);
  }

  @Post(':slabId/cut')
  @HttpCode(200)
  async cut(
    @Param('customerId') customerId: string,
    @Param('projectId') projectId: string,
    @Param('slabId') slabId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const ids = this.parseIds(customerId, projectId, slabId);
    const parsedBody = cutSlabSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.projectSlabsService.cut(ids.customerId, ids.projectId, ids.slabId as string, {
      ...parsedBody.data,
      actorUserId,
      remnants: parsedBody.data.remnants?.map((remnant) => ({ ...remnant, actorUserId }))
    });
  }

  @Post(':slabId/reassign')
  @HttpCode(200)
  @Roles('admin', 'inventory_manager')
  async reassign(
    @Param('customerId') customerId: string,
    @Param('projectId') projectId: string,
    @Param('slabId') slabId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const ids = this.parseIds(customerId, projectId, slabId);
    const parsedBody = reassignSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.projectSlabsService.reassign(ids.customerId, ids.projectId, ids.slabId as string, {
      ...parsedBody.data,
      actorUserId
    });
  }

  private parseIds(customerId: string, projectId: string, slabId?: string): { customerId: string; projectId: string; slabId?: string } {
    const parsedCustomerId = idSchema.safeParse(customerId);
    const parsedProjectId = idSchema.safeParse(projectId);
    const parsedSlabId = slabId === undefined ? undefined : idSchema.safeParse(slabId);

    if (!parsedCustomerId.success || !parsedProjectId.success || parsedSlabId?.success === false) {
      throw badRequest({
        ...(!parsedCustomerId.success ? { customerId: ['Invalid UUID'] } : {}),
        ...(!parsedProjectId.success ? { projectId: ['Invalid UUID'] } : {}),
        ...(parsedSlabId?.success === false ? { slabId: ['Invalid UUID'] } : {})
      });
    }

    return {
      customerId: parsedCustomerId.data,
      projectId: parsedProjectId.data,
      ...(parsedSlabId !== undefined ? { slabId: parsedSlabId.data } : {})
    };
  }
}
