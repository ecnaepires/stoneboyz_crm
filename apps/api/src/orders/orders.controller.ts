import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { addOrderPaymentSchema, archiveOrderSchema, listOrdersSchema, requestOrderDepositSchema, voidOrderPaymentSchema } from '@stoneboyz/domain';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { OrdersService } from './orders.service.js';

const customerIdSchema = z.string().uuid();
const orderIdSchema = z.string().uuid();
const paymentIdSchema = z.string().uuid();

const parseLimit = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? value : parsed;
};

const parseBoolean = (value: unknown): unknown => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

const formatZodError = (error: z.ZodError): Record<string, string[]> => z.flattenError(error).fieldErrors;

const badRequest = (details: Record<string, string[]>): BadRequestException =>
  new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Request validation failed', details });

const parseCustomerOrderIds = (customerId: string, orderId: string): { parsedCustomerId: string; parsedOrderId: string } => {
  const pc = customerIdSchema.safeParse(customerId);
  const po = orderIdSchema.safeParse(orderId);

  if (!pc.success || !po.success) {
    throw badRequest({
      ...(!pc.success ? { customerId: ['Invalid UUID'] } : {}),
      ...(!po.success ? { orderId: ['Invalid UUID'] } : {})
    });
  }

  return { parsedCustomerId: pc.data, parsedOrderId: po.data };
};

@Controller('customers/:customerId/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async list(@Param('customerId') customerId: string, @Query() query: Record<string, unknown>) {
    const pc = customerIdSchema.safeParse(customerId);

    if (!pc.success) {
      throw badRequest({ customerId: ['Invalid UUID'] });
    }

    const parsedQuery = listOrdersSchema.safeParse({
      ...query,
      limit: parseLimit(query['limit']),
      includeArchived: parseBoolean(query['includeArchived'])
    });

    if (!parsedQuery.success) {
      throw badRequest(formatZodError(parsedQuery.error));
    }

    return this.ordersService.list(pc.data, parsedQuery.data);
  }

  @Get(':orderId')
  async getById(@Param('customerId') customerId: string, @Param('orderId') orderId: string) {
    const { parsedCustomerId, parsedOrderId } = parseCustomerOrderIds(customerId, orderId);

    return this.ordersService.getById(parsedCustomerId, parsedOrderId);
  }

  @Post(':orderId/payments')
  async addPayment(
    @Param('customerId') customerId: string,
    @Param('orderId') orderId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedOrderId } = parseCustomerOrderIds(customerId, orderId);
    const parsedBody = addOrderPaymentSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.ordersService.addPayment(parsedCustomerId, parsedOrderId, { ...parsedBody.data, actorUserId });
  }

  @Post(':orderId/deposit/request')
  @HttpCode(200)
  async requestDeposit(
    @Param('customerId') customerId: string,
    @Param('orderId') orderId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedOrderId } = parseCustomerOrderIds(customerId, orderId);
    const parsedBody = requestOrderDepositSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.ordersService.requestDeposit(parsedCustomerId, parsedOrderId, { ...parsedBody.data, actorUserId });
  }

  @Delete(':orderId/payments/:paymentId')
  @HttpCode(200)
  async voidPayment(
    @Param('customerId') customerId: string,
    @Param('orderId') orderId: string,
    @Param('paymentId') paymentId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedOrderId } = parseCustomerOrderIds(customerId, orderId);
    const parsedPaymentId = paymentIdSchema.safeParse(paymentId);

    if (!parsedPaymentId.success) {
      throw badRequest({ paymentId: ['Invalid UUID'] });
    }

    const parsedBody = voidOrderPaymentSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.ordersService.voidPayment(parsedCustomerId, parsedOrderId, parsedPaymentId.data, {
      ...parsedBody.data,
      actorUserId
    });
  }

  @Post(':orderId/archive')
  @HttpCode(200)
  async archive(
    @Param('customerId') customerId: string,
    @Param('orderId') orderId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedOrderId } = parseCustomerOrderIds(customerId, orderId);
    const parsedBody = archiveOrderSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.ordersService.archive(parsedCustomerId, parsedOrderId, actorUserId);
  }
}
