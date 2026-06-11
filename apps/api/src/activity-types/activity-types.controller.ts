import { BadRequestException, Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import {
  archiveActivityTypeSchema,
  createActivityTypeSchema,
  listActivityTypesSchema,
  updateActivityTypeSchema,
} from '@stoneboyz/domain';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import { ActivityTypesService } from './activity-types.service.js';

const activityTypeIdSchema = z.string().uuid();

const formatZodError = (error: z.ZodError): Record<string, string[]> => z.flattenError(error).fieldErrors;

const badRequest = (details: Record<string, string[]>): BadRequestException =>
  new BadRequestException({
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    details,
  });

@Controller('activity-types')
export class ActivityTypesController {
  constructor(private readonly activityTypesService: ActivityTypesService) {}

  @Get()
  async list(@Query() query: Record<string, unknown>) {
    const parsed = listActivityTypesSchema.safeParse(query);
    if (!parsed.success) {
      throw badRequest(formatZodError(parsed.error));
    }
    return this.activityTypesService.list(parsed.data);
  }

  @Post()
  @Roles('admin')
  async create(@Body() body: unknown, @CurrentUser() actorUserId: string) {
    const parsed = createActivityTypeSchema.safeParse(body);
    if (!parsed.success) {
      throw badRequest(formatZodError(parsed.error));
    }
    return this.activityTypesService.create({ ...parsed.data, actorUserId });
  }

  @Get(':activityTypeId')
  async getById(@Param('activityTypeId') activityTypeId: string) {
    return this.activityTypesService.getById(this.parseActivityTypeId(activityTypeId));
  }

  @Patch(':activityTypeId')
  @Roles('admin')
  async update(
    @Param('activityTypeId') activityTypeId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const parsed = updateActivityTypeSchema.safeParse(body);
    if (!parsed.success) {
      throw badRequest(formatZodError(parsed.error));
    }
    return this.activityTypesService.update(this.parseActivityTypeId(activityTypeId), { ...parsed.data, actorUserId });
  }

  @Post(':activityTypeId/archive')
  @HttpCode(200)
  @Roles('admin')
  async archive(
    @Param('activityTypeId') activityTypeId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const parsed = archiveActivityTypeSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw badRequest(formatZodError(parsed.error));
    }
    return this.activityTypesService.archive(this.parseActivityTypeId(activityTypeId), { ...parsed.data, actorUserId });
  }

  private parseActivityTypeId(activityTypeId: string): string {
    const parsed = activityTypeIdSchema.safeParse(activityTypeId);
    if (!parsed.success) {
      throw badRequest({ activityTypeId: ['Invalid UUID'] });
    }
    return parsed.data;
  }
}
