import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { archiveAttachmentSchema, createAttachmentSchema, listAttachmentsSchema } from '@stoneboyz/domain';
import { z } from 'zod';
import { AttachmentsService } from './attachments.service.js';

const customerIdSchema = z.string().uuid();
const attachmentIdSchema = z.string().uuid();

const badRequest = (details: Record<string, string[]>): BadRequestException =>
  new BadRequestException({
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    details
  });

const formatZodError = (error: z.ZodError): Record<string, string[]> => z.flattenError(error).fieldErrors;

@Controller('customers/:customerId/attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get()
  async list(@Param('customerId') customerId: string, @Query() query: Record<string, unknown>) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);

    if (!parsedCustomerId.success) {
      throw badRequest({ customerId: ['Invalid UUID'] });
    }

    const parsed = listAttachmentsSchema.safeParse(query);

    if (!parsed.success) {
      throw badRequest(formatZodError(parsed.error));
    }

    return this.attachmentsService.list(parsedCustomerId.data, parsed.data);
  }

  @Post()
  async create(@Param('customerId') customerId: string, @Body() body: unknown) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);

    if (!parsedCustomerId.success) {
      throw badRequest({ customerId: ['Invalid UUID'] });
    }

    const parsedBody = createAttachmentSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.attachmentsService.create(parsedCustomerId.data, parsedBody.data);
  }

  @Delete(':attachmentId')
  async softDelete(
    @Param('customerId') customerId: string,
    @Param('attachmentId') attachmentId: string,
    @Body() body: unknown
  ) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);
    const parsedAttachmentId = attachmentIdSchema.safeParse(attachmentId);

    if (!parsedCustomerId.success || !parsedAttachmentId.success) {
      throw badRequest({
        ...(!parsedCustomerId.success ? { customerId: ['Invalid UUID'] } : {}),
        ...(!parsedAttachmentId.success ? { attachmentId: ['Invalid UUID'] } : {})
      });
    }

    const parsedBody = archiveAttachmentSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.attachmentsService.softDelete(parsedCustomerId.data, parsedAttachmentId.data, parsedBody.data.actorUserId);
  }
}
