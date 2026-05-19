import { BadRequestException, Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { archiveCustomerSchema, createCustomerSchema, listCustomersSchema, restoreCustomerSchema, updateCustomerSchema } from '@stoneboyz/domain';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import { CustomersService } from './customers.service.js';

const customerIdSchema = z.string().uuid();

const parseLimit = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? value : parsed;
};

const parseBoolean = (value: unknown): unknown => {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
};

const formatZodError = (error: z.ZodError): Record<string, string[]> => {
  return z.flattenError(error).fieldErrors;
};

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async list(@Query() query: Record<string, unknown>) {
    const parsed = listCustomersSchema.safeParse({
      ...query,
      limit: parseLimit(query['limit']),
      includeArchived: parseBoolean(query['includeArchived'])
    });

    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formatZodError(parsed.error)
      });
    }

    return this.customersService.list(parsed.data);
  }

  @Post()
  async create(@Body() body: unknown, @CurrentUser() actorUserId: string) {
    const parsed = createCustomerSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formatZodError(parsed.error)
      });
    }

    return this.customersService.create({ ...parsed.data, actorUserId });
  }

  @Get(':customerId')
  async getById(@Param('customerId') customerId: string) {
    const parsed = customerIdSchema.safeParse(customerId);

    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: { customerId: ['Invalid UUID'] }
      });
    }

    return this.customersService.getById(parsed.data);
  }

  @Patch(':customerId')
  async update(@Param('customerId') customerId: string, @Body() body: unknown, @CurrentUser() actorUserId: string) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);

    if (!parsedCustomerId.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: { customerId: ['Invalid UUID'] }
      });
    }

    const parsedBody = updateCustomerSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formatZodError(parsedBody.error)
      });
    }

    return this.customersService.update(parsedCustomerId.data, { ...parsedBody.data, actorUserId });
  }

  @Post(':customerId/archive')
  @HttpCode(200)
  @Roles('admin')
  async archive(@Param('customerId') customerId: string, @Body() body: unknown, @CurrentUser() actorUserId: string) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);

    if (!parsedCustomerId.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: { customerId: ['Invalid UUID'] }
      });
    }

    const parsedBody = archiveCustomerSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formatZodError(parsedBody.error)
      });
    }

    return this.customersService.archive(parsedCustomerId.data, { ...parsedBody.data, actorUserId });
  }

  @Post(':customerId/restore')
  @HttpCode(200)
  async restore(@Param('customerId') customerId: string, @Body() body: unknown, @CurrentUser() actorUserId: string) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);

    if (!parsedCustomerId.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: { customerId: ['Invalid UUID'] }
      });
    }

    const parsedBody = restoreCustomerSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formatZodError(parsedBody.error)
      });
    }

    return this.customersService.restore(parsedCustomerId.data, { ...parsedBody.data, actorUserId });
  }
}
