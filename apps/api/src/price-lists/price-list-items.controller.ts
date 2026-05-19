import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { createPriceListItemSchema, priceListActorSchema, updatePriceListItemSchema } from '@stoneboyz/domain';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { PriceListItemsService } from './price-list-items.service.js';

const uuidSchema = z.string().uuid();
const formatZodError = (error: z.ZodError): Record<string, string[]> => z.flattenError(error).fieldErrors;
const badRequest = (details: Record<string, string[]>): BadRequestException =>
  new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Request validation failed', details });

@Controller('price-lists/:priceListId/items')
export class PriceListItemsController {
  constructor(private readonly priceListItemsService: PriceListItemsService) {}

  @Get()
  async list(@Param('priceListId') priceListId: string) {
    return this.priceListItemsService.list(this.parseUuid('priceListId', priceListId));
  }

  @Post()
  async create(@Param('priceListId') priceListId: string, @Body() body: unknown, @CurrentUser() actorUserId: string) {
    const parsedBody = createPriceListItemSchema.safeParse(body);
    if (!parsedBody.success) throw badRequest(formatZodError(parsedBody.error));
    return this.priceListItemsService.create(this.parseUuid('priceListId', priceListId), { ...parsedBody.data, actorUserId });
  }

  @Patch(':itemId')
  async update(@Param('priceListId') priceListId: string, @Param('itemId') itemId: string, @Body() body: unknown, @CurrentUser() actorUserId: string) {
    const parsedBody = updatePriceListItemSchema.safeParse(body);
    if (!parsedBody.success) throw badRequest(formatZodError(parsedBody.error));
    return this.priceListItemsService.update(this.parseUuid('priceListId', priceListId), this.parseUuid('itemId', itemId), { ...parsedBody.data, actorUserId });
  }

  @Delete(':itemId')
  @HttpCode(200)
  async delete(@Param('priceListId') priceListId: string, @Param('itemId') itemId: string, @Body() body: unknown, @CurrentUser() actorUserId: string) {
    const parsedBody = priceListActorSchema.safeParse(body);
    if (!parsedBody.success) throw badRequest(formatZodError(parsedBody.error));
    return this.priceListItemsService.delete(
      this.parseUuid('priceListId', priceListId),
      this.parseUuid('itemId', itemId),
      actorUserId
    );
  }

  private parseUuid(fieldName: string, value: string): string {
    const parsed = uuidSchema.safeParse(value);
    if (!parsed.success) throw badRequest({ [fieldName]: ['Invalid UUID'] });
    return parsed.data;
  }
}
