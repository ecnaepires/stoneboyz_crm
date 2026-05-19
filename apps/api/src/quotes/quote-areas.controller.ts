import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { createQuoteAreaSchema, transitionQuoteSchema, updateQuoteAreaSchema } from '@stoneboyz/domain';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { QuoteAreasService } from './quote-areas.service.js';

const customerIdSchema = z.string().uuid();
const quoteIdSchema = z.string().uuid();
const areaIdSchema = z.string().uuid();

const formatZodError = (error: z.ZodError): Record<string, string[]> => z.flattenError(error).fieldErrors;

const badRequest = (details: Record<string, string[]>): BadRequestException =>
  new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Request validation failed', details });

const parseIds = (
  customerId: string,
  quoteId: string
): { parsedCustomerId: string; parsedQuoteId: string } => {
  const pc = customerIdSchema.safeParse(customerId);
  const pq = quoteIdSchema.safeParse(quoteId);

  if (!pc.success || !pq.success) {
    throw badRequest({
      ...(!pc.success ? { customerId: ['Invalid UUID'] } : {}),
      ...(!pq.success ? { quoteId: ['Invalid UUID'] } : {})
    });
  }

  return { parsedCustomerId: pc.data, parsedQuoteId: pq.data };
};

@Controller('customers/:customerId/quotes/:quoteId/areas')
export class QuoteAreasController {
  constructor(private readonly quoteAreasService: QuoteAreasService) {}

  @Get()
  async list(@Param('customerId') customerId: string, @Param('quoteId') quoteId: string) {
    const { parsedCustomerId, parsedQuoteId } = parseIds(customerId, quoteId);

    return this.quoteAreasService.list(parsedCustomerId, parsedQuoteId);
  }

  @Post()
  async create(
    @Param('customerId') customerId: string,
    @Param('quoteId') quoteId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedQuoteId } = parseIds(customerId, quoteId);
    const parsedBody = createQuoteAreaSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.quoteAreasService.create(parsedCustomerId, parsedQuoteId, { ...parsedBody.data, actorUserId });
  }

  @Patch(':areaId')
  async update(
    @Param('customerId') customerId: string,
    @Param('quoteId') quoteId: string,
    @Param('areaId') areaId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedQuoteId } = parseIds(customerId, quoteId);
    const parsedAreaId = areaIdSchema.safeParse(areaId);

    if (!parsedAreaId.success) {
      throw badRequest({ areaId: ['Invalid UUID'] });
    }

    const parsedBody = updateQuoteAreaSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.quoteAreasService.update(parsedCustomerId, parsedQuoteId, parsedAreaId.data, { ...parsedBody.data, actorUserId });
  }

  @Delete(':areaId')
  @HttpCode(200)
  async remove(
    @Param('customerId') customerId: string,
    @Param('quoteId') quoteId: string,
    @Param('areaId') areaId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedQuoteId } = parseIds(customerId, quoteId);
    const parsedAreaId = areaIdSchema.safeParse(areaId);

    if (!parsedAreaId.success) {
      throw badRequest({ areaId: ['Invalid UUID'] });
    }

    const parsedBody = transitionQuoteSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.quoteAreasService.remove(parsedCustomerId, parsedQuoteId, parsedAreaId.data, actorUserId);
  }
}
