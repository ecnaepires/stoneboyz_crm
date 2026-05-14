import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  archiveCustomerContactSchema,
  createCustomerContactSchema,
  updateCustomerContactSchema
} from '@stoneboyz/domain';
import { z } from 'zod';
import { CustomerContactsService } from './customer-contacts.service.js';

const customerIdSchema = z.string().uuid();
const contactIdSchema = z.string().uuid();
const makePrimaryBodySchema = z.object({ actorUserId: z.string().uuid() });
const makeBillingBodySchema = z.object({ actorUserId: z.string().uuid() });

const formatZodError = (error: z.ZodError): Record<string, string[]> => {
  return z.flattenError(error).fieldErrors;
};

@Controller('customers/:customerId/contacts')
export class CustomerContactsController {
  constructor(private readonly customerContactsService: CustomerContactsService) {}

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

    return this.customerContactsService.list(parsedCustomerId.data);
  }

  @Post()
  async create(@Param('customerId') customerId: string, @Body() body: unknown) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);

    if (!parsedCustomerId.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: { customerId: ['Invalid UUID'] }
      });
    }

    const parsedBody = createCustomerContactSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formatZodError(parsedBody.error)
      });
    }

    return this.customerContactsService.create(parsedCustomerId.data, parsedBody.data);
  }

  @Patch(':contactId')
  async update(
    @Param('customerId') customerId: string,
    @Param('contactId') contactId: string,
    @Body() body: unknown
  ) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);
    const parsedContactId = contactIdSchema.safeParse(contactId);

    if (!parsedCustomerId.success || !parsedContactId.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          ...(!parsedCustomerId.success ? { customerId: ['Invalid UUID'] } : {}),
          ...(!parsedContactId.success ? { contactId: ['Invalid UUID'] } : {})
        }
      });
    }

    const parsedBody = updateCustomerContactSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formatZodError(parsedBody.error)
      });
    }

    return this.customerContactsService.update(parsedCustomerId.data, parsedContactId.data, parsedBody.data);
  }

  @Post(':contactId/make-primary')
  @HttpCode(200)
  async makePrimary(
    @Param('customerId') customerId: string,
    @Param('contactId') contactId: string,
    @Body() body: unknown
  ) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);
    const parsedContactId = contactIdSchema.safeParse(contactId);

    if (!parsedCustomerId.success || !parsedContactId.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          ...(!parsedCustomerId.success ? { customerId: ['Invalid UUID'] } : {}),
          ...(!parsedContactId.success ? { contactId: ['Invalid UUID'] } : {})
        }
      });
    }

    const parsedBody = makePrimaryBodySchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formatZodError(parsedBody.error)
      });
    }

    return this.customerContactsService.makePrimary(
      parsedCustomerId.data,
      parsedContactId.data,
      parsedBody.data.actorUserId
    );
  }

  @Post(':contactId/make-billing')
  @HttpCode(200)
  async makeBilling(
    @Param('customerId') customerId: string,
    @Param('contactId') contactId: string,
    @Body() body: unknown
  ) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);
    const parsedContactId = contactIdSchema.safeParse(contactId);

    if (!parsedCustomerId.success || !parsedContactId.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          ...(!parsedCustomerId.success ? { customerId: ['Invalid UUID'] } : {}),
          ...(!parsedContactId.success ? { contactId: ['Invalid UUID'] } : {})
        }
      });
    }

    const parsedBody = makeBillingBodySchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formatZodError(parsedBody.error)
      });
    }

    return this.customerContactsService.makeBilling(
      parsedCustomerId.data,
      parsedContactId.data,
      parsedBody.data.actorUserId
    );
  }

  @Delete(':contactId')
  @HttpCode(200)
  async archive(
    @Param('customerId') customerId: string,
    @Param('contactId') contactId: string,
    @Body() body: unknown
  ) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);
    const parsedContactId = contactIdSchema.safeParse(contactId);

    if (!parsedCustomerId.success || !parsedContactId.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          ...(!parsedCustomerId.success ? { customerId: ['Invalid UUID'] } : {}),
          ...(!parsedContactId.success ? { contactId: ['Invalid UUID'] } : {})
        }
      });
    }

    const parsedBody = archiveCustomerContactSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formatZodError(parsedBody.error)
      });
    }

    return this.customerContactsService.archive(parsedCustomerId.data, parsedContactId.data, parsedBody.data);
  }
}
