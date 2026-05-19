import { BadRequestException, Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { saveDrawingRevisionSchema } from '@stoneboyz/domain';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { QuoteDrawingService } from './quote-drawing.service.js';

const uuidSchema = z.string().uuid();

const badRequest = (details: Record<string, string[]>) =>
  new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Request validation failed', details });

const parseIds = (customerId: string, quoteId: string, areaId: string) => {
  const pc = uuidSchema.safeParse(customerId);
  const pq = uuidSchema.safeParse(quoteId);
  const pa = uuidSchema.safeParse(areaId);

  if (!pc.success || !pq.success || !pa.success) {
    throw badRequest({
      ...(!pc.success ? { customerId: ['Invalid UUID'] } : {}),
      ...(!pq.success ? { quoteId: ['Invalid UUID'] } : {}),
      ...(!pa.success ? { areaId: ['Invalid UUID'] } : {})
    });
  }

  return { parsedCustomerId: pc.data, parsedQuoteId: pq.data, parsedAreaId: pa.data };
};

@Controller('customers/:customerId/quotes/:quoteId/areas/:areaId/drawing')
export class QuoteDrawingController {
  constructor(private readonly quoteDrawingService: QuoteDrawingService) {}

  @Get()
  async getLatestRevision(
    @Param('customerId') customerId: string,
    @Param('quoteId') quoteId: string,
    @Param('areaId') areaId: string
  ) {
    const { parsedCustomerId, parsedQuoteId, parsedAreaId } = parseIds(customerId, quoteId, areaId);
    return this.quoteDrawingService.getLatestRevision(parsedCustomerId, parsedQuoteId, parsedAreaId);
  }

  @Get('revisions')
  async listRevisions(
    @Param('customerId') customerId: string,
    @Param('quoteId') quoteId: string,
    @Param('areaId') areaId: string
  ) {
    const { parsedCustomerId, parsedQuoteId, parsedAreaId } = parseIds(customerId, quoteId, areaId);
    return this.quoteDrawingService.listRevisions(parsedCustomerId, parsedQuoteId, parsedAreaId);
  }

  @Post()
  @HttpCode(201)
  async saveRevision(
    @Param('customerId') customerId: string,
    @Param('quoteId') quoteId: string,
    @Param('areaId') areaId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedQuoteId, parsedAreaId } = parseIds(customerId, quoteId, areaId);
    const parsedBody = saveDrawingRevisionSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(Object.fromEntries(
        Object.entries(z.flattenError(parsedBody.error).fieldErrors).map(([k, v]) => [k, v ?? []])
      ));
    }

    return this.quoteDrawingService.saveRevision(parsedCustomerId, parsedQuoteId, parsedAreaId, {
      actorUserId,
      layout: parsedBody.data.layout,
      notes: parsedBody.data.notes ?? null
    });
  }

  @Post('revisions/:revisionId/revert')
  @HttpCode(201)
  async revertRevision(
    @Param('customerId') customerId: string,
    @Param('quoteId') quoteId: string,
    @Param('areaId') areaId: string,
    @Param('revisionId') revisionId: string,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedQuoteId, parsedAreaId } = parseIds(customerId, quoteId, areaId);
    const parsedRevisionId = uuidSchema.safeParse(revisionId);

    if (!parsedRevisionId.success) {
      throw badRequest({ revisionId: ['Invalid UUID'] });
    }

    return this.quoteDrawingService.revertToRevision(
      parsedCustomerId,
      parsedQuoteId,
      parsedAreaId,
      parsedRevisionId.data,
      actorUserId
    );
  }
}
