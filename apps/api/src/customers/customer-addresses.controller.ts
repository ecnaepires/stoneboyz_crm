import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  archiveCustomerAddressSchema,
  createCustomerAddressSchema,
  updateCustomerAddressSchema
} from '@stoneboyz/domain';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { CustomerAddressesService } from './customer-addresses.service.js';

const customerIdSchema = z.string().uuid();
const addressIdSchema = z.string().uuid();
const makeBillingBodySchema = z.object({});

const formatZodError = (error: z.ZodError): Record<string, string[]> => {
  return z.flattenError(error).fieldErrors;
};

@Controller('customers/:customerId/addresses')
export class CustomerAddressesController {
  constructor(private readonly customerAddressesService: CustomerAddressesService) {}

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

    return this.customerAddressesService.list(parsedCustomerId.data);
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

    const parsedBody = createCustomerAddressSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formatZodError(parsedBody.error)
      });
    }

    return this.customerAddressesService.create(parsedCustomerId.data, { ...parsedBody.data, actorUserId });
  }

  @Patch(':addressId')
  async update(
    @Param('customerId') customerId: string,
    @Param('addressId') addressId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);
    const parsedAddressId = addressIdSchema.safeParse(addressId);

    if (!parsedCustomerId.success || !parsedAddressId.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          ...(!parsedCustomerId.success ? { customerId: ['Invalid UUID'] } : {}),
          ...(!parsedAddressId.success ? { addressId: ['Invalid UUID'] } : {})
        }
      });
    }

    const parsedBody = updateCustomerAddressSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formatZodError(parsedBody.error)
      });
    }

    return this.customerAddressesService.update(parsedCustomerId.data, parsedAddressId.data, { ...parsedBody.data, actorUserId });
  }

  @Delete(':addressId')
  @HttpCode(200)
  async archive(
    @Param('customerId') customerId: string,
    @Param('addressId') addressId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);
    const parsedAddressId = addressIdSchema.safeParse(addressId);

    if (!parsedCustomerId.success || !parsedAddressId.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          ...(!parsedCustomerId.success ? { customerId: ['Invalid UUID'] } : {}),
          ...(!parsedAddressId.success ? { addressId: ['Invalid UUID'] } : {})
        }
      });
    }

    const parsedBody = archiveCustomerAddressSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formatZodError(parsedBody.error)
      });
    }

    return this.customerAddressesService.archive(parsedCustomerId.data, parsedAddressId.data, { ...parsedBody.data, actorUserId });
  }

  @Post(':addressId/make-billing')
  @HttpCode(200)
  async makeBilling(
    @Param('customerId') customerId: string,
    @Param('addressId') addressId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);
    const parsedAddressId = addressIdSchema.safeParse(addressId);

    if (!parsedCustomerId.success || !parsedAddressId.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          ...(!parsedCustomerId.success ? { customerId: ['Invalid UUID'] } : {}),
          ...(!parsedAddressId.success ? { addressId: ['Invalid UUID'] } : {})
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

    return this.customerAddressesService.makeBilling(
      parsedCustomerId.data,
      parsedAddressId.data,
      actorUserId
    );
  }
}
