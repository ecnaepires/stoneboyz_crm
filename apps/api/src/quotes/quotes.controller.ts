import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import {
  archiveQuoteSchema,
  createQuoteLineItemSchema,
  createQuoteSchema,
  listQuotesSchema,
  transitionQuoteSchema,
  updateQuoteLineItemSchema,
  updateQuoteSchema
} from '@stoneboyz/domain';
import { z } from 'zod';
import { QuotesService } from './quotes.service.js';

const customerIdSchema = z.string().uuid();
const quoteIdSchema = z.string().uuid();
const lineItemIdSchema = z.string().uuid();

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

const badRequest = (details: Record<string, string[]>): BadRequestException => {
  return new BadRequestException({
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    details
  });
};

@Controller('customers/:customerId/quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get()
  async list(@Param('customerId') customerId: string, @Query() query: Record<string, unknown>) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);

    if (!parsedCustomerId.success) {
      throw badRequest({ customerId: ['Invalid UUID'] });
    }

    const parsedQuery = listQuotesSchema.safeParse({
      ...query,
      limit: parseLimit(query['limit']),
      includeArchived: parseBoolean(query['includeArchived'])
    });

    if (!parsedQuery.success) {
      throw badRequest(formatZodError(parsedQuery.error));
    }

    return this.quotesService.list(parsedCustomerId.data, parsedQuery.data);
  }

  @Post()
  async create(@Param('customerId') customerId: string, @Body() body: unknown) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);

    if (!parsedCustomerId.success) {
      throw badRequest({ customerId: ['Invalid UUID'] });
    }

    const parsedBody = createQuoteSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.quotesService.create(parsedCustomerId.data, parsedBody.data);
  }

  @Get(':quoteId')
  async getById(@Param('customerId') customerId: string, @Param('quoteId') quoteId: string) {
    const { parsedCustomerId, parsedQuoteId } = this.parseCustomerQuoteIds(customerId, quoteId);

    return this.quotesService.getById(parsedCustomerId, parsedQuoteId);
  }

  @Patch(':quoteId')
  async update(@Param('customerId') customerId: string, @Param('quoteId') quoteId: string, @Body() body: unknown) {
    const { parsedCustomerId, parsedQuoteId } = this.parseCustomerQuoteIds(customerId, quoteId);
    const parsedBody = updateQuoteSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.quotesService.update(parsedCustomerId, parsedQuoteId, parsedBody.data);
  }

  @Post(':quoteId/send')
  @HttpCode(200)
  async send(@Param('customerId') customerId: string, @Param('quoteId') quoteId: string, @Body() body: unknown) {
    const { parsedCustomerId, parsedQuoteId } = this.parseCustomerQuoteIds(customerId, quoteId);
    const parsedBody = transitionQuoteSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.quotesService.send(parsedCustomerId, parsedQuoteId, parsedBody.data);
  }

  @Post(':quoteId/accept')
  @HttpCode(200)
  async accept(@Param('customerId') customerId: string, @Param('quoteId') quoteId: string, @Body() body: unknown) {
    const { parsedCustomerId, parsedQuoteId } = this.parseCustomerQuoteIds(customerId, quoteId);
    const parsedBody = transitionQuoteSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.quotesService.accept(parsedCustomerId, parsedQuoteId, parsedBody.data);
  }

  @Post(':quoteId/reject')
  @HttpCode(200)
  async reject(@Param('customerId') customerId: string, @Param('quoteId') quoteId: string, @Body() body: unknown) {
    const { parsedCustomerId, parsedQuoteId } = this.parseCustomerQuoteIds(customerId, quoteId);
    const parsedBody = transitionQuoteSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.quotesService.reject(parsedCustomerId, parsedQuoteId, parsedBody.data);
  }

  @Post(':quoteId/archive')
  @HttpCode(200)
  async archive(@Param('customerId') customerId: string, @Param('quoteId') quoteId: string, @Body() body: unknown) {
    const { parsedCustomerId, parsedQuoteId } = this.parseCustomerQuoteIds(customerId, quoteId);
    const parsedBody = archiveQuoteSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.quotesService.archive(parsedCustomerId, parsedQuoteId, parsedBody.data);
  }

  @Get(':quoteId/line-items')
  async listLineItems(@Param('customerId') customerId: string, @Param('quoteId') quoteId: string) {
    const { parsedCustomerId, parsedQuoteId } = this.parseCustomerQuoteIds(customerId, quoteId);

    return this.quotesService.listLineItems(parsedCustomerId, parsedQuoteId);
  }

  @Post(':quoteId/line-items')
  async addLineItem(@Param('customerId') customerId: string, @Param('quoteId') quoteId: string, @Body() body: unknown) {
    const { parsedCustomerId, parsedQuoteId } = this.parseCustomerQuoteIds(customerId, quoteId);
    const parsedBody = createQuoteLineItemSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.quotesService.addLineItem(parsedCustomerId, parsedQuoteId, parsedBody.data);
  }

  @Patch(':quoteId/line-items/:lineItemId')
  async updateLineItem(
    @Param('customerId') customerId: string,
    @Param('quoteId') quoteId: string,
    @Param('lineItemId') lineItemId: string,
    @Body() body: unknown
  ) {
    const { parsedCustomerId, parsedQuoteId, parsedLineItemId } = this.parseLineItemIds(customerId, quoteId, lineItemId);
    const parsedBody = updateQuoteLineItemSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.quotesService.updateLineItem(parsedCustomerId, parsedQuoteId, parsedLineItemId, parsedBody.data);
  }

  @Delete(':quoteId/line-items/:lineItemId')
  @HttpCode(200)
  async removeLineItem(
    @Param('customerId') customerId: string,
    @Param('quoteId') quoteId: string,
    @Param('lineItemId') lineItemId: string,
    @Body() body: unknown
  ) {
    const { parsedCustomerId, parsedQuoteId, parsedLineItemId } = this.parseLineItemIds(customerId, quoteId, lineItemId);
    const parsedBody = transitionQuoteSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.quotesService.removeLineItem(parsedCustomerId, parsedQuoteId, parsedLineItemId, parsedBody.data);
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

  private parseLineItemIds(
    customerId: string,
    quoteId: string,
    lineItemId: string
  ): { parsedCustomerId: string; parsedQuoteId: string; parsedLineItemId: string } {
    const { parsedCustomerId, parsedQuoteId } = this.parseCustomerQuoteIds(customerId, quoteId);
    const parsedLineItemId = lineItemIdSchema.safeParse(lineItemId);

    if (!parsedLineItemId.success) {
      throw badRequest({ lineItemId: ['Invalid UUID'] });
    }

    return { parsedCustomerId, parsedQuoteId, parsedLineItemId: parsedLineItemId.data };
  }
}
