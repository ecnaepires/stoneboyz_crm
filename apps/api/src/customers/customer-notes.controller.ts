import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  archiveCustomerNoteSchema,
  createCustomerNoteSchema,
  updateCustomerNoteSchema
} from '@stoneboyz/domain';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { CustomerNotesService } from './customer-notes.service.js';

const customerIdSchema = z.string().uuid();
const noteIdSchema = z.string().uuid();

const formatZodError = (error: z.ZodError): Record<string, string[]> => {
  return z.flattenError(error).fieldErrors;
};

@Controller('customers/:customerId/notes')
export class CustomerNotesController {
  constructor(private readonly customerNotesService: CustomerNotesService) {}

  @Get()
  async list(@Param('customerId') customerId: string) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);

    if (!parsedCustomerId.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: { customerId: ['Invalid UUID'] }
      });
    }

    return this.customerNotesService.list(parsedCustomerId.data);
  }

  @Post()
  async create(@Param('customerId') customerId: string, @Body() body: unknown, @CurrentUser() actorUserId: string) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);

    if (!parsedCustomerId.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: { customerId: ['Invalid UUID'] }
      });
    }

    const parsedBody = createCustomerNoteSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formatZodError(parsedBody.error)
      });
    }

    return this.customerNotesService.create(parsedCustomerId.data, { ...parsedBody.data, actorUserId });
  }

  @Patch(':noteId')
  async update(
    @Param('customerId') customerId: string,
    @Param('noteId') noteId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);
    const parsedNoteId = noteIdSchema.safeParse(noteId);

    if (!parsedCustomerId.success || !parsedNoteId.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          ...(!parsedCustomerId.success ? { customerId: ['Invalid UUID'] } : {}),
          ...(!parsedNoteId.success ? { noteId: ['Invalid UUID'] } : {})
        }
      });
    }

    const parsedBody = updateCustomerNoteSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formatZodError(parsedBody.error)
      });
    }

    return this.customerNotesService.update(parsedCustomerId.data, parsedNoteId.data, parsedBody.data, actorUserId);
  }

  @Delete(':noteId')
  @HttpCode(200)
  async archive(
    @Param('customerId') customerId: string,
    @Param('noteId') noteId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);
    const parsedNoteId = noteIdSchema.safeParse(noteId);

    if (!parsedCustomerId.success || !parsedNoteId.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          ...(!parsedCustomerId.success ? { customerId: ['Invalid UUID'] } : {}),
          ...(!parsedNoteId.success ? { noteId: ['Invalid UUID'] } : {})
        }
      });
    }

    const parsedBody = archiveCustomerNoteSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formatZodError(parsedBody.error)
      });
    }

    return this.customerNotesService.archive(parsedCustomerId.data, parsedNoteId.data, { ...parsedBody.data, actorUserId });
  }
}
