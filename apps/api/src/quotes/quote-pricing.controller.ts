import { BadRequestException, Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { overrideGeneratedPriceLineSchema } from '@stoneboyz/domain';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { QuotePricingService } from './quote-pricing.service.js';

const customerIdSchema = z.string().uuid();
const quoteIdSchema = z.string().uuid();
const areaIdSchema = z.string().uuid();
const lineIdSchema = z.string().uuid();

const formatZodError = (error: z.ZodError): Record<string, string[]> => z.flattenError(error).fieldErrors;

const badRequest = (details: Record<string, string[]>): BadRequestException =>
  new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Request validation failed', details });

const parseBaseIds = (
  customerId: string,
  quoteId: string,
  areaId: string
): { parsedCustomerId: string; parsedQuoteId: string; parsedAreaId: string } => {
  const pc = customerIdSchema.safeParse(customerId);
  const pq = quoteIdSchema.safeParse(quoteId);
  const pa = areaIdSchema.safeParse(areaId);

  if (!pc.success || !pq.success || !pa.success) {
    throw badRequest({
      ...(!pc.success ? { customerId: ['Invalid UUID'] } : {}),
      ...(!pq.success ? { quoteId: ['Invalid UUID'] } : {}),
      ...(!pa.success ? { areaId: ['Invalid UUID'] } : {})
    });
  }

  return { parsedCustomerId: pc.data, parsedQuoteId: pq.data, parsedAreaId: pa.data };
};

const parseLineIds = (
  customerId: string,
  quoteId: string,
  areaId: string,
  lineId: string
): { parsedCustomerId: string; parsedQuoteId: string; parsedAreaId: string; parsedLineId: string } => {
  const { parsedCustomerId, parsedQuoteId, parsedAreaId } = parseBaseIds(customerId, quoteId, areaId);
  const parsedLineId = lineIdSchema.safeParse(lineId);

  if (!parsedLineId.success) {
    throw badRequest({ lineId: ['Invalid UUID'] });
  }

  return { parsedCustomerId, parsedQuoteId, parsedAreaId, parsedLineId: parsedLineId.data };
};

@Controller('customers/:customerId/quotes/:quoteId/areas/:areaId/pricing')
export class QuotePricingController {
  constructor(private readonly quotePricingService: QuotePricingService) {}

  @Get()
  async listPricingLines(
    @Param('customerId') customerId: string,
    @Param('quoteId') quoteId: string,
    @Param('areaId') areaId: string
  ) {
    const { parsedCustomerId, parsedQuoteId, parsedAreaId } = parseBaseIds(customerId, quoteId, areaId);

    return this.quotePricingService.listPricingLines(parsedCustomerId, parsedQuoteId, parsedAreaId);
  }

  @Post('generate')
  @HttpCode(200)
  async generatePricingLines(
    @Param('customerId') customerId: string,
    @Param('quoteId') quoteId: string,
    @Param('areaId') areaId: string,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedQuoteId, parsedAreaId } = parseBaseIds(customerId, quoteId, areaId);

    return this.quotePricingService.generatePricingLines(parsedCustomerId, parsedQuoteId, parsedAreaId, actorUserId);
  }

  @Patch(':lineId/override')
  async overridePricingLine(
    @Param('customerId') customerId: string,
    @Param('quoteId') quoteId: string,
    @Param('areaId') areaId: string,
    @Param('lineId') lineId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedQuoteId, parsedAreaId, parsedLineId } = parseLineIds(customerId, quoteId, areaId, lineId);
    const parsedBody = overrideGeneratedPriceLineSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.quotePricingService.overridePricingLine(parsedCustomerId, parsedQuoteId, parsedAreaId, parsedLineId, {
      ...parsedBody.data,
      actorUserId
    });
  }
}
