import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  archiveQuoteNoteSchema,
  createQuoteNoteSchema,
  updateQuoteNoteSchema
} from '@stoneboyz/domain';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { QuoteNotesService } from './quote-notes.service.js';

const customerIdSchema = z.string().uuid();
const quoteIdSchema = z.string().uuid();
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

@Controller('customers/:customerId/quotes/:quoteId/notes')
export class QuoteNotesController {
  constructor(private readonly quoteNotesService: QuoteNotesService) {}

  @Get()
  async list(@Param('customerId') customerId: string, @Param('quoteId') quoteId: string) {
    const { parsedCustomerId, parsedQuoteId } = this.parseCustomerQuoteIds(customerId, quoteId);

    return this.quoteNotesService.list(parsedCustomerId, parsedQuoteId);
  }

  @Post()
  async create(
    @Param('customerId') customerId: string,
    @Param('quoteId') quoteId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedQuoteId } = this.parseCustomerQuoteIds(customerId, quoteId);
    const parsedBody = createQuoteNoteSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.quoteNotesService.create(parsedCustomerId, parsedQuoteId, { ...parsedBody.data, actorUserId });
  }

  @Patch(':noteId')
  async update(
    @Param('customerId') customerId: string,
    @Param('quoteId') quoteId: string,
    @Param('noteId') noteId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedQuoteId, parsedNoteId } = this.parseCustomerQuoteNoteIds(customerId, quoteId, noteId);
    const parsedBody = updateQuoteNoteSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.quoteNotesService.update(parsedCustomerId, parsedQuoteId, parsedNoteId, { ...parsedBody.data, actorUserId });
  }

  @Delete(':noteId')
  @HttpCode(200)
  async archive(
    @Param('customerId') customerId: string,
    @Param('quoteId') quoteId: string,
    @Param('noteId') noteId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedQuoteId, parsedNoteId } = this.parseCustomerQuoteNoteIds(customerId, quoteId, noteId);
    const parsedBody = archiveQuoteNoteSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.quoteNotesService.archive(parsedCustomerId, parsedQuoteId, parsedNoteId, { ...parsedBody.data, actorUserId });
  }

  private parseCustomerQuoteIds(customerId: string, quoteId: string): { parsedCustomerId: string; parsedQuoteId: string } {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);
    const parsedQuoteId = quoteIdSchema.safeParse(quoteId);

    if (!parsedCustomerId.success || !parsedQuoteId.success) {
      throw badRequest({
        ...(!parsedCustomerId.success ? { customerId: ['Invalid UUID'] } : {}),
        ...(!parsedQuoteId.success ? { quoteId: ['Invalid UUID'] } : {})
      });
    }

    return { parsedCustomerId: parsedCustomerId.data, parsedQuoteId: parsedQuoteId.data };
  }

  private parseCustomerQuoteNoteIds(
    customerId: string,
    quoteId: string,
    noteId: string
  ): { parsedCustomerId: string; parsedQuoteId: string; parsedNoteId: string } {
    const { parsedCustomerId, parsedQuoteId } = this.parseCustomerQuoteIds(customerId, quoteId);
    const parsedNoteId = noteIdSchema.safeParse(noteId);

    if (!parsedNoteId.success) {
      throw badRequest({ noteId: ['Invalid UUID'] });
    }

    return { parsedCustomerId, parsedQuoteId, parsedNoteId: parsedNoteId.data };
  }
}
