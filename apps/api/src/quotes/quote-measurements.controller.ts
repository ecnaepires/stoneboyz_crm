import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  createCounterPieceSchema,
  createEdgeSegmentSchema,
  createSinkCutoutSchema,
  transitionQuoteSchema,
  updateCounterPieceSchema,
  updateEdgeSegmentSchema,
  updateSinkCutoutSchema
} from '@stoneboyz/domain';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { QuoteMeasurementsService } from './quote-measurements.service.js';

const customerIdSchema = z.string().uuid();
const quoteIdSchema = z.string().uuid();
const areaIdSchema = z.string().uuid();
const measurementIdSchema = z.string().uuid();

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

const parseMutationIds = (
  customerId: string,
  quoteId: string,
  areaId: string,
  id: string,
  idField: string
): { parsedCustomerId: string; parsedQuoteId: string; parsedAreaId: string; parsedId: string } => {
  const { parsedCustomerId, parsedQuoteId, parsedAreaId } = parseBaseIds(customerId, quoteId, areaId);
  const parsedId = measurementIdSchema.safeParse(id);

  if (!parsedId.success) {
    throw badRequest({ [idField]: ['Invalid UUID'] });
  }

  return { parsedCustomerId, parsedQuoteId, parsedAreaId, parsedId: parsedId.data };
};

@Controller('customers/:customerId/quotes/:quoteId/areas/:areaId')
export class QuoteMeasurementsController {
  constructor(private readonly quoteMeasurementsService: QuoteMeasurementsService) {}

  @Get('pieces')
  async listPieces(
    @Param('customerId') customerId: string,
    @Param('quoteId') quoteId: string,
    @Param('areaId') areaId: string
  ) {
    const { parsedCustomerId, parsedQuoteId, parsedAreaId } = parseBaseIds(customerId, quoteId, areaId);

    return this.quoteMeasurementsService.listPieces(parsedCustomerId, parsedQuoteId, parsedAreaId);
  }

  @Post('pieces')
  async createPiece(
    @Param('customerId') customerId: string,
    @Param('quoteId') quoteId: string,
    @Param('areaId') areaId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedQuoteId, parsedAreaId } = parseBaseIds(customerId, quoteId, areaId);
    const parsedBody = createCounterPieceSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.quoteMeasurementsService.createPiece(parsedCustomerId, parsedQuoteId, parsedAreaId, {
      ...parsedBody.data,
      actorUserId
    });
  }

  @Patch('pieces/:id')
  async updatePiece(
    @Param('customerId') customerId: string,
    @Param('quoteId') quoteId: string,
    @Param('areaId') areaId: string,
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedQuoteId, parsedAreaId, parsedId } = parseMutationIds(customerId, quoteId, areaId, id, 'id');
    const parsedBody = updateCounterPieceSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.quoteMeasurementsService.updatePiece(parsedCustomerId, parsedQuoteId, parsedAreaId, parsedId, {
      ...parsedBody.data,
      actorUserId
    });
  }

  @Delete('pieces/:id')
  @HttpCode(200)
  async removePiece(
    @Param('customerId') customerId: string,
    @Param('quoteId') quoteId: string,
    @Param('areaId') areaId: string,
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedQuoteId, parsedAreaId, parsedId } = parseMutationIds(customerId, quoteId, areaId, id, 'id');
    const parsedBody = transitionQuoteSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.quoteMeasurementsService.removePiece(parsedCustomerId, parsedQuoteId, parsedAreaId, parsedId, {
      ...parsedBody.data,
      actorUserId
    });
  }

  @Get('edges')
  async listEdges(
    @Param('customerId') customerId: string,
    @Param('quoteId') quoteId: string,
    @Param('areaId') areaId: string
  ) {
    const { parsedCustomerId, parsedQuoteId, parsedAreaId } = parseBaseIds(customerId, quoteId, areaId);

    return this.quoteMeasurementsService.listEdges(parsedCustomerId, parsedQuoteId, parsedAreaId);
  }

  @Post('edges')
  async createEdge(
    @Param('customerId') customerId: string,
    @Param('quoteId') quoteId: string,
    @Param('areaId') areaId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedQuoteId, parsedAreaId } = parseBaseIds(customerId, quoteId, areaId);
    const parsedBody = createEdgeSegmentSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.quoteMeasurementsService.createEdge(parsedCustomerId, parsedQuoteId, parsedAreaId, {
      ...parsedBody.data,
      actorUserId
    });
  }

  @Patch('edges/:id')
  async updateEdge(
    @Param('customerId') customerId: string,
    @Param('quoteId') quoteId: string,
    @Param('areaId') areaId: string,
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedQuoteId, parsedAreaId, parsedId } = parseMutationIds(customerId, quoteId, areaId, id, 'id');
    const parsedBody = updateEdgeSegmentSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.quoteMeasurementsService.updateEdge(parsedCustomerId, parsedQuoteId, parsedAreaId, parsedId, {
      ...parsedBody.data,
      actorUserId
    });
  }

  @Delete('edges/:id')
  @HttpCode(200)
  async removeEdge(
    @Param('customerId') customerId: string,
    @Param('quoteId') quoteId: string,
    @Param('areaId') areaId: string,
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedQuoteId, parsedAreaId, parsedId } = parseMutationIds(customerId, quoteId, areaId, id, 'id');
    const parsedBody = transitionQuoteSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.quoteMeasurementsService.removeEdge(parsedCustomerId, parsedQuoteId, parsedAreaId, parsedId, {
      ...parsedBody.data,
      actorUserId
    });
  }

  @Get('sinks')
  async listSinks(
    @Param('customerId') customerId: string,
    @Param('quoteId') quoteId: string,
    @Param('areaId') areaId: string
  ) {
    const { parsedCustomerId, parsedQuoteId, parsedAreaId } = parseBaseIds(customerId, quoteId, areaId);

    return this.quoteMeasurementsService.listSinks(parsedCustomerId, parsedQuoteId, parsedAreaId);
  }

  @Post('sinks')
  async createSink(
    @Param('customerId') customerId: string,
    @Param('quoteId') quoteId: string,
    @Param('areaId') areaId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedQuoteId, parsedAreaId } = parseBaseIds(customerId, quoteId, areaId);
    const parsedBody = createSinkCutoutSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.quoteMeasurementsService.createSink(parsedCustomerId, parsedQuoteId, parsedAreaId, {
      ...parsedBody.data,
      actorUserId
    });
  }

  @Patch('sinks/:id')
  async updateSink(
    @Param('customerId') customerId: string,
    @Param('quoteId') quoteId: string,
    @Param('areaId') areaId: string,
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedQuoteId, parsedAreaId, parsedId } = parseMutationIds(customerId, quoteId, areaId, id, 'id');
    const parsedBody = updateSinkCutoutSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.quoteMeasurementsService.updateSink(parsedCustomerId, parsedQuoteId, parsedAreaId, parsedId, {
      ...parsedBody.data,
      actorUserId
    });
  }

  @Delete('sinks/:id')
  @HttpCode(200)
  async removeSink(
    @Param('customerId') customerId: string,
    @Param('quoteId') quoteId: string,
    @Param('areaId') areaId: string,
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedQuoteId, parsedAreaId, parsedId } = parseMutationIds(customerId, quoteId, areaId, id, 'id');
    const parsedBody = transitionQuoteSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.quoteMeasurementsService.removeSink(parsedCustomerId, parsedQuoteId, parsedAreaId, parsedId, {
      ...parsedBody.data,
      actorUserId
    });
  }
}
