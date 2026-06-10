import { BadRequestException, Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { scheduleJobActivitySchema } from '@stoneboyz/domain';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JobActivitiesService } from './job-activities.service.js';

const customerIdSchema = z.string().uuid();
const projectIdSchema = z.string().uuid();
const activityIdSchema = z.string().uuid();

const formatZodError = (error: z.ZodError): Record<string, string[]> => z.flattenError(error).fieldErrors;

@Controller('customers/:customerId/projects/:projectId/activities')
export class JobActivitiesController {
  constructor(private readonly jobActivitiesService: JobActivitiesService) {}

  @Get()
  async list(@Param('customerId') customerId: string, @Param('projectId') projectId: string) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);
    const parsedProjectId = projectIdSchema.safeParse(projectId);

    if (!parsedCustomerId.success || !parsedProjectId.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          ...(!parsedCustomerId.success ? { customerId: ['Invalid UUID'] } : {}),
          ...(!parsedProjectId.success ? { projectId: ['Invalid UUID'] } : {})
        }
      });
    }

    return this.jobActivitiesService.list(parsedCustomerId.data, parsedProjectId.data);
  }

  @Post(':activityId/schedule')
  @HttpCode(200)
  async schedule(
    @Param('customerId') customerId: string,
    @Param('projectId') projectId: string,
    @Param('activityId') activityId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);
    const parsedProjectId = projectIdSchema.safeParse(projectId);
    const parsedActivityId = activityIdSchema.safeParse(activityId);

    if (!parsedCustomerId.success || !parsedProjectId.success || !parsedActivityId.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          ...(!parsedCustomerId.success ? { customerId: ['Invalid UUID'] } : {}),
          ...(!parsedProjectId.success ? { projectId: ['Invalid UUID'] } : {}),
          ...(!parsedActivityId.success ? { activityId: ['Invalid UUID'] } : {})
        }
      });
    }

    const parsedBody = scheduleJobActivitySchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formatZodError(parsedBody.error)
      });
    }

    return this.jobActivitiesService.schedule(parsedCustomerId.data, parsedProjectId.data, parsedActivityId.data, {
      ...parsedBody.data,
      actorUserId
    });
  }

  @Patch(':activityId/schedule')
  async reschedule(
    @Param('customerId') customerId: string,
    @Param('projectId') projectId: string,
    @Param('activityId') activityId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);
    const parsedProjectId = projectIdSchema.safeParse(projectId);
    const parsedActivityId = activityIdSchema.safeParse(activityId);

    if (!parsedCustomerId.success || !parsedProjectId.success || !parsedActivityId.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          ...(!parsedCustomerId.success ? { customerId: ['Invalid UUID'] } : {}),
          ...(!parsedProjectId.success ? { projectId: ['Invalid UUID'] } : {}),
          ...(!parsedActivityId.success ? { activityId: ['Invalid UUID'] } : {})
        }
      });
    }

    const parsedBody = scheduleJobActivitySchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formatZodError(parsedBody.error)
      });
    }

    return this.jobActivitiesService.reschedule(parsedCustomerId.data, parsedProjectId.data, parsedActivityId.data, {
      ...parsedBody.data,
      actorUserId
    });
  }
}
