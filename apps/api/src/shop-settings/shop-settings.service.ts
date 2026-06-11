import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { ShopHoliday } from '@stoneboyz/domain';
import type { DatabaseError } from 'pg';
import { EventBus } from '../events/event-bus.js';
import { ShopsRepository } from '../activity-types/shops.repository.js';
import { ShopSettingsRepository } from './shop-settings.repository.js';
import {
  buildHolidayCreatedPayload,
  buildHolidayDeletedPayload,
  buildWorkDaysUpdatedPayload,
} from './shop-settings-events.js';

const UNIQUE_VIOLATION_CODE = '23505';

const isDatabaseError = (error: unknown): error is DatabaseError =>
  typeof error === 'object' && error !== null && 'code' in error;

@Injectable()
export class ShopSettingsService {
  constructor(
    private readonly shopsRepository: ShopsRepository,
    private readonly shopSettingsRepository: ShopSettingsRepository,
    private readonly eventBus: EventBus
  ) {}

  async getSettings(): Promise<{ workDays: number[]; counterDepthPresets: number[] }> {
    const shop = await this.shopsRepository.currentShop();
    return { workDays: shop.workDays, counterDepthPresets: shop.counterDepthPresets };
  }

  async putCounterDepthPresets(presets: number[]): Promise<{ workDays: number[]; counterDepthPresets: number[] }> {
    const shop = await this.shopsRepository.currentShop();
    const cleaned = [...new Set(presets.map((p) => Math.round(p * 16) / 16))].sort((a, b) => a - b);
    await this.shopSettingsRepository.putCounterDepthPresets(shop.id, cleaned);
    return { workDays: shop.workDays, counterDepthPresets: cleaned };
  }

  async patchWorkDays(workDays: number[], actorUserId: string): Promise<{ workDays: number[] }> {
    const shop = await this.shopsRepository.currentShop();
    await this.shopSettingsRepository.patchWorkDays(shop.id, workDays);
    this.eventBus.emit('shop.work_days_updated', buildWorkDaysUpdatedPayload(shop.id, actorUserId, workDays));
    return { workDays };
  }

  async listHolidays(from?: string, to?: string): Promise<ShopHoliday[]> {
    const shop = await this.shopsRepository.currentShop();
    return this.shopSettingsRepository.listHolidays(shop.id, from, to);
  }

  async createHoliday(holidayDate: string, name: string, actorUserId: string): Promise<ShopHoliday> {
    const shop = await this.shopsRepository.currentShop();
    try {
      const holiday = await this.shopSettingsRepository.createHoliday(shop.id, holidayDate, name);
      this.eventBus.emit(
        'holiday.created',
        buildHolidayCreatedPayload(holiday.id, shop.id, actorUserId, holidayDate, name)
      );
      return holiday;
    } catch (error) {
      if (isDatabaseError(error) && error.code === UNIQUE_VIOLATION_CODE) {
        throw new ConflictException({ code: 'DUPLICATE_HOLIDAY_DATE', message: 'A holiday already exists for this date' });
      }
      throw error;
    }
  }

  async deleteHoliday(holidayId: string, actorUserId: string): Promise<void> {
    const shop = await this.shopsRepository.currentShop();
    const holiday = await this.shopSettingsRepository.findHolidayById(shop.id, holidayId);
    if (holiday === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Holiday not found' });
    }
    await this.shopSettingsRepository.deleteHoliday(shop.id, holidayId);
    this.eventBus.emit(
      'holiday.deleted',
      buildHolidayDeletedPayload(holidayId, shop.id, actorUserId, holiday.holidayDate)
    );
  }
}
