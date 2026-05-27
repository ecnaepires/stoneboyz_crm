import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  archiveActivityNoteSchema,
  createActivityNoteSchema,
  updateActivityNoteSchema
} from '@stoneboyz/domain';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ActivityNotesService } from './activity-notes.service.js';

const customerIdSchema = z.string().uuid();
const eventIdSchema = z.string().uuid();
const noteIdSchema = z.string().uuid();

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

@Controller('customers/:customerId/events/:eventId/notes')
export class ActivityNotesController {
  constructor(private readonly activityNotesService: ActivityNotesService) {}

  @Get()
  async list(@Param('customerId') customerId: string, @Param('eventId') eventId: string) {
    const { parsedCustomerId, parsedEventId } = this.parseCustomerEventIds(customerId, eventId);

    return this.activityNotesService.list(parsedCustomerId, parsedEventId);
  }

  @Post()
  async create(
    @Param('customerId') customerId: string,
    @Param('eventId') eventId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedEventId } = this.parseCustomerEventIds(customerId, eventId);
    const parsedBody = createActivityNoteSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.activityNotesService.create(parsedCustomerId, parsedEventId, { ...parsedBody.data, actorUserId });
  }

  @Patch(':noteId')
  async update(
    @Param('customerId') customerId: string,
    @Param('eventId') eventId: string,
    @Param('noteId') noteId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedEventId, parsedNoteId } = this.parseCustomerEventNoteIds(customerId, eventId, noteId);
    const parsedBody = updateActivityNoteSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.activityNotesService.update(parsedCustomerId, parsedEventId, parsedNoteId, { ...parsedBody.data, actorUserId });
  }

  @Delete(':noteId')
  @HttpCode(200)
  async archive(
    @Param('customerId') customerId: string,
    @Param('eventId') eventId: string,
    @Param('noteId') noteId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedEventId, parsedNoteId } = this.parseCustomerEventNoteIds(customerId, eventId, noteId);
    const parsedBody = archiveActivityNoteSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.activityNotesService.archive(parsedCustomerId, parsedEventId, parsedNoteId, { ...parsedBody.data, actorUserId });
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

  private parseCustomerEventNoteIds(
    customerId: string,
    eventId: string,
    noteId: string
  ): { parsedCustomerId: string; parsedEventId: string; parsedNoteId: string } {
    const { parsedCustomerId, parsedEventId } = this.parseCustomerEventIds(customerId, eventId);
    const parsedNoteId = noteIdSchema.safeParse(noteId);

    if (!parsedNoteId.success) {
      throw badRequest({ noteId: ['Invalid UUID'] });
    }

    return { parsedCustomerId, parsedEventId, parsedNoteId: parsedNoteId.data };
  }
}
