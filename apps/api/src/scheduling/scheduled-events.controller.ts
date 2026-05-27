import { BadRequestException, Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import {
  archiveScheduledEventSchema,
  createScheduledEventSchema,
  listScheduledEventsSchema,
  transitionScheduledEventSchema,
  updateScheduledEventSchema
} from '@stoneboyz/domain';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ScheduledEventsService } from './scheduled-events.service.js';

const customerIdSchema = z.string().uuid();
const eventIdSchema = z.string().uuid();

const parseLimit = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? value : parsed;
};

const formatZodError = (error: z.ZodError): Record<string, string[]> => {
  return z.flattenError(error).fieldErrors;
};

const badRequest = (details: Record<string, string[]>): BadRequestException => {
  return new BadRequestException({
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    details
  });
};

@Controller('customers/:customerId/events')
export class ScheduledEventsController {
  constructor(private readonly scheduledEventsService: ScheduledEventsService) {}

  @Get()
  async list(@Param('customerId') customerId: string, @Query() query: Record<string, unknown>) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);

    if (!parsedCustomerId.success) {
      throw badRequest({ customerId: ['Invalid UUID'] });
    }

    const parsedQuery = listScheduledEventsSchema.safeParse({
      ...query,
      limit: parseLimit(query['limit'])
    });

    if (!parsedQuery.success) {
      throw badRequest(formatZodError(parsedQuery.error));
    }

    return this.scheduledEventsService.list(parsedCustomerId.data, parsedQuery.data);
  }

  @Post()
  async create(@Param('customerId') customerId: string, @Body() body: unknown, @CurrentUser() actorUserId: string) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);

    if (!parsedCustomerId.success) {
      throw badRequest({ customerId: ['Invalid UUID'] });
    }

    const parsedBody = createScheduledEventSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.scheduledEventsService.create(parsedCustomerId.data, { ...parsedBody.data, actorUserId });
  }

  @Get(':eventId')
  async getById(@Param('customerId') customerId: string, @Param('eventId') eventId: string) {
    const { parsedCustomerId, parsedEventId } = this.parseCustomerEventIds(customerId, eventId);

    return this.scheduledEventsService.getById(parsedCustomerId, parsedEventId);
  }

  @Patch(':eventId')
  async update(@Param('customerId') customerId: string, @Param('eventId') eventId: string, @Body() body: unknown, @CurrentUser() actorUserId: string) {
    const { parsedCustomerId, parsedEventId } = this.parseCustomerEventIds(customerId, eventId);
    const parsedBody = updateScheduledEventSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.scheduledEventsService.update(parsedCustomerId, parsedEventId, { ...parsedBody.data, actorUserId });
  }

  @Post(':eventId/confirm')
  @HttpCode(200)
  async confirm(@Param('customerId') customerId: string, @Param('eventId') eventId: string, @Body() body: unknown, @CurrentUser() actorUserId: string) {
    const { parsedCustomerId, parsedEventId } = this.parseCustomerEventIds(customerId, eventId);
    const parsedBody = transitionScheduledEventSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.scheduledEventsService.confirm(parsedCustomerId, parsedEventId, { ...parsedBody.data, actorUserId });
  }

  @Post(':eventId/start')
  @HttpCode(200)
  async start(@Param('customerId') customerId: string, @Param('eventId') eventId: string, @Body() body: unknown, @CurrentUser() actorUserId: string) {
    const { parsedCustomerId, parsedEventId } = this.parseCustomerEventIds(customerId, eventId);
    const parsedBody = transitionScheduledEventSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.scheduledEventsService.start(parsedCustomerId, parsedEventId, { ...parsedBody.data, actorUserId });
  }

  @Post(':eventId/finish')
  @HttpCode(200)
  async finish(@Param('customerId') customerId: string, @Param('eventId') eventId: string, @Body() body: unknown, @CurrentUser() actorUserId: string) {
    const { parsedCustomerId, parsedEventId } = this.parseCustomerEventIds(customerId, eventId);
    const parsedBody = transitionScheduledEventSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.scheduledEventsService.finish(parsedCustomerId, parsedEventId, { ...parsedBody.data, actorUserId });
  }

  @Post(':eventId/complete')
  @HttpCode(200)
  async complete(@Param('customerId') customerId: string, @Param('eventId') eventId: string, @Body() body: unknown, @CurrentUser() actorUserId: string) {
    return this.finish(customerId, eventId, body, actorUserId);
  }

  @Post(':eventId/cancel')
  @HttpCode(200)
  async cancel(@Param('customerId') customerId: string, @Param('eventId') eventId: string, @Body() body: unknown, @CurrentUser() actorUserId: string) {
    const { parsedCustomerId, parsedEventId } = this.parseCustomerEventIds(customerId, eventId);
    const parsedBody = transitionScheduledEventSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.scheduledEventsService.cancel(parsedCustomerId, parsedEventId, { ...parsedBody.data, actorUserId });
  }

  @Post(':eventId/archive')
  @HttpCode(200)
  async archive(@Param('customerId') customerId: string, @Param('eventId') eventId: string, @Body() body: unknown, @CurrentUser() actorUserId: string) {
    const { parsedCustomerId, parsedEventId } = this.parseCustomerEventIds(customerId, eventId);
    const parsedBody = archiveScheduledEventSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.scheduledEventsService.archive(parsedCustomerId, parsedEventId, { ...parsedBody.data, actorUserId });
  }

  private parseCustomerEventIds(customerId: string, eventId: string): { parsedCustomerId: string; parsedEventId: string } {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);
    const parsedEventId = eventIdSchema.safeParse(eventId);

    if (!parsedCustomerId.success || !parsedEventId.success) {
      throw badRequest({
        ...(!parsedCustomerId.success ? { customerId: ['Invalid UUID'] } : {}),
        ...(!parsedEventId.success ? { eventId: ['Invalid UUID'] } : {})
      });
    }

    return { parsedCustomerId: parsedCustomerId.data, parsedEventId: parsedEventId.data };
  }
}
