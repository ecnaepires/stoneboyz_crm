import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { createPriceListSchema, listPriceListsSchema, priceListActorSchema, updatePriceListSchema } from '@stoneboyz/domain';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import { PriceListsService } from './price-lists.service.js';

const priceListIdSchema = z.string().uuid();

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

@Controller('price-lists')
export class PriceListsController {
  constructor(private readonly priceListsService: PriceListsService) {}

  @Get()
  async list(@Query() query: Record<string, unknown>) {
    const parsedQuery = listPriceListsSchema.safeParse({
      ...query,
      limit: parseLimit(query['limit']),
      includeArchived: parseBoolean(query['includeArchived'])
    });
    if (!parsedQuery.success) throw badRequest(formatZodError(parsedQuery.error));
    return this.priceListsService.list(parsedQuery.data);
  }

  @Post()
  @Roles('admin', 'salesperson')
  async create(@Body() body: unknown, @CurrentUser() actorUserId: string) {
    const parsedBody = createPriceListSchema.safeParse(body);
    if (!parsedBody.success) throw badRequest(formatZodError(parsedBody.error));
    return this.priceListsService.create({ ...parsedBody.data, actorUserId });
  }

  @Get(':priceListId')
  async getById(@Param('priceListId') priceListId: string) {
    return this.priceListsService.getById(this.parsePriceListId(priceListId));
  }

  @Patch(':priceListId')
  @Roles('admin', 'salesperson')
  async update(@Param('priceListId') priceListId: string, @Body() body: unknown, @CurrentUser() actorUserId: string) {
    const parsedBody = updatePriceListSchema.safeParse(body);
    if (!parsedBody.success) throw badRequest(formatZodError(parsedBody.error));
    return this.priceListsService.update(this.parsePriceListId(priceListId), { ...parsedBody.data, actorUserId });
  }

  @Post(':priceListId/activate')
  async activate(@Param('priceListId') priceListId: string, @Body() body: unknown, @CurrentUser() actorUserId: string) {
    const parsedBody = priceListActorSchema.safeParse(body);
    if (!parsedBody.success) throw badRequest(formatZodError(parsedBody.error));
    return this.priceListsService.activate(this.parsePriceListId(priceListId), actorUserId);
  }

  @Post(':priceListId/archive')
  @Roles('admin', 'salesperson')
  async archive(@Param('priceListId') priceListId: string, @Body() body: unknown, @CurrentUser() actorUserId: string) {
    const parsedBody = priceListActorSchema.safeParse(body);
    if (!parsedBody.success) throw badRequest(formatZodError(parsedBody.error));
    return this.priceListsService.archive(this.parsePriceListId(priceListId), actorUserId);
  }

  private parsePriceListId(priceListId: string): string {
    const parsedPriceListId = priceListIdSchema.safeParse(priceListId);
    if (!parsedPriceListId.success) throw badRequest({ priceListId: ['Invalid UUID'] });
    return parsedPriceListId.data;
  }
}
