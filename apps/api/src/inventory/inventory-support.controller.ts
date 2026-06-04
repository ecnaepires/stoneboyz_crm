import { BadRequestException, Body, Controller, Get, Param, Post } from '@nestjs/common';
import { createDamageMarkSchema } from '@stoneboyz/domain';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { InventorySupportService } from './inventory-support.service.js';

const slabIdSchema = z.string().uuid();
const createMaterialColorSchema = z.object({ name: z.string().min(1) });
const createStorageLocationSchema = z.object({
  zone: z.string().min(1),
  rack: z.string().min(1),
  bin: z.string().min(1).optional(),
  slot: z.string().min(1).optional(),
  notes: z.string().min(1).optional()
});
const createReceiptSchema = z.object({
  vendor: z.string().min(1).optional(),
  notes: z.string().min(1).optional()
});

const badRequest = (details: Record<string, string[]>): BadRequestException =>
  new BadRequestException({
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    details
  });

const formatZodError = (error: z.ZodError): Record<string, string[]> => z.flattenError(error).fieldErrors;

@Controller('inventory')
export class InventorySupportController {
  constructor(private readonly inventorySupportService: InventorySupportService) {}

  @Post('slabs/:slabId/damage-marks')
  async createDamageMark(@Param('slabId') slabId: string, @Body() body: unknown, @CurrentUser() actorUserId: string) {
    const parsedSlabId = slabIdSchema.safeParse(slabId);
    const parsedBody = createDamageMarkSchema.safeParse(body);

    if (!parsedSlabId.success || !parsedBody.success) {
      throw badRequest({
        ...(!parsedSlabId.success ? { slabId: ['Invalid UUID'] } : {}),
        ...(!parsedBody.success ? formatZodError(parsedBody.error) : {})
      });
    }

    return this.inventorySupportService.createDamageMark(parsedSlabId.data, { ...parsedBody.data, actorUserId });
  }

  @Get('slabs/:slabId/damage-marks')
  async listDamageMarks(@Param('slabId') slabId: string) {
    const parsedSlabId = slabIdSchema.safeParse(slabId);

    if (!parsedSlabId.success) {
      throw badRequest({ slabId: ['Invalid UUID'] });
    }

    return { data: await this.inventorySupportService.listDamageMarks(parsedSlabId.data) };
  }

  @Get('material-colors')
  async listMaterialColors() {
    return { data: await this.inventorySupportService.listMaterialColors() };
  }

  @Post('material-colors')
  async createMaterialColor(@Body() body: unknown) {
    const parsedBody = createMaterialColorSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.inventorySupportService.createMaterialColor(parsedBody.data.name);
  }

  @Get('locations')
  async listStorageLocations() {
    return { data: await this.inventorySupportService.listStorageLocations() };
  }

  @Post('locations')
  async createStorageLocation(@Body() body: unknown) {
    const parsedBody = createStorageLocationSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.inventorySupportService.createStorageLocation(parsedBody.data);
  }

  @Get('receipts')
  async listReceipts() {
    return { data: await this.inventorySupportService.listReceipts() };
  }

  @Post('receipts')
  async createReceipt(@Body() body: unknown, @CurrentUser() actorUserId: string) {
    const parsedBody = createReceiptSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.inventorySupportService.createReceipt({ ...parsedBody.data, actorUserId });
  }
}
