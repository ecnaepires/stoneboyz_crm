import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query
} from '@nestjs/common';
import { createHolidaySchema, listHolidaysSchema, patchWorkDaysSchema } from '@stoneboyz/domain';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import { ShopSettingsService } from './shop-settings.service.js';

const holidayIdSchema = z.string().uuid();
const depthPresetsSchema = z.object({
  counterDepthPresets: z
    .array(
      z.number().min(1).max(60).refine((v) => Number.isInteger(v * 16), {
        message: 'depths must be a multiple of 1/16"',
      }),
    )
    .max(12),
});
const formatZodError = (error: z.ZodError): Record<string, string[]> => z.flattenError(error).fieldErrors;
const badRequest = (details: Record<string, string[]>): BadRequestException =>
  new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Request validation failed', details });

@Controller('shop-settings')
export class ShopSettingsController {
  constructor(private readonly shopSettingsService: ShopSettingsService) {}

  @Get()
  async getSettings() {
    const result = await this.shopSettingsService.getSettings();
    return { data: result };
  }

  @Patch()
  @Roles('admin')
  async patchWorkDays(@Body() body: unknown, @CurrentUser() actorUserId: string) {
    const parsed = patchWorkDaysSchema.safeParse(body);
    if (!parsed.success) throw badRequest(formatZodError(parsed.error));
    const result = await this.shopSettingsService.patchWorkDays(parsed.data.workDays, actorUserId);
    return { data: result };
  }

  @Put('depth-presets')
  async putDepthPresets(@Body() body: unknown) {
    const parsed = depthPresetsSchema.safeParse(body);
    if (!parsed.success) throw badRequest(formatZodError(parsed.error));
    const result = await this.shopSettingsService.putCounterDepthPresets(parsed.data.counterDepthPresets);
    return { data: result };
  }

  @Get('holidays')
  async listHolidays(@Query() query: Record<string, unknown>) {
    const parsed = listHolidaysSchema.safeParse(query);
    if (!parsed.success) throw badRequest(formatZodError(parsed.error));
    const holidays = await this.shopSettingsService.listHolidays(parsed.data.from, parsed.data.to);
    return { data: holidays };
  }

  @Post('holidays')
  @Roles('admin')
  async createHoliday(@Body() body: unknown, @CurrentUser() actorUserId: string) {
    const parsed = createHolidaySchema.safeParse(body);
    if (!parsed.success) throw badRequest(formatZodError(parsed.error));
    const holiday = await this.shopSettingsService.createHoliday(
      parsed.data.holidayDate, parsed.data.name, actorUserId
    );
    return holiday;
  }

  @Delete('holidays/:holidayId')
  @HttpCode(204)
  @Roles('admin')
  async deleteHoliday(@Param('holidayId') holidayId: string, @CurrentUser() actorUserId: string) {
    const parsed = holidayIdSchema.safeParse(holidayId);
    if (!parsed.success) throw badRequest({ holidayId: ['Invalid UUID'] });
    await this.shopSettingsService.deleteHoliday(parsed.data, actorUserId);
  }
}
